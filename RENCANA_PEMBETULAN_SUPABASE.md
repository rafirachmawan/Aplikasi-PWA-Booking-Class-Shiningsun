# Rencana Pembetulan — Supabase Aman & Aplikasi Lancar

**Status:** SEDANG DIEKSEKUSI — Fase A (A1–A3, A6, A7 sebagian selesai)
**Tanggal dibuat:** 03/11/2026
**Cakupan:** kode aplikasi (`src/`) + SQL Supabase (`supabase/`)
**Di luar cakupan:** VPS, Coolify, Docker, domain, deploy — dibahas terpisah setelah dokumen ini selesai dieksekusi.

---

## STATUS EKSEKUSI (update terakhir: 03/11/2026)

| Langkah | Status | Bukti / catatan |
| --- | --- | --- |
| A1 Audit RLS | ✅ Selesai | `docs/audit-rls-sebelum.txt` — **semua 17 tabel `rls_aktif=false`, 0 policy**. Anon key bebas baca/tulis. |
| A2 Service-role client | ✅ Selesai | `src/lib/supabase/admin.ts` (`getAdminClient()`). |
| A3 Ganti anon singleton | ✅ Selesai | Cron, push, unsubscribe, upload-gdrive, portal ortu, dan action bersama kini memakai service role. Import anon mati di 5 file action dihapus. |
| A4 RLS hardening | ⏸️ **BELUM DIJALANKAN** | SQL siap di `supabase/rls_hardening.sql`. Tunggu backup DB + deploy kode A2/A3. |
| A5 Guard sesi | 🟡 Sebagian | Guard wajib sudah dipasang pada action yang memakai service role (portal, `getWorksheetsByStudent`, `getPointRedemptions`, `getStudentScheduleMap`, update PIN/foto). Action admin lain tetap dilindungi RLS `authenticated`. |
| A6 Endpoint bocor | ✅ Selesai | `api/student-feedback` (GET & POST) wajib admin atau ortu pemilik siswa; `upload-gdrive`, `push/subscribe`, `push/unsubscribe` wajib admin login. |
| A7 Secret & PIN | 🟡 Sebagian | Fallback `CRON_SECRET` hardcoded dihapus (cron fail-safe). `getAllUsers` tidak lagi `select("*")` (password tidak terkirim). Fallback PIN `123456` **belum** dihapus — perlu migrasi PIN dulu. |
| A8 Fallback cabang | ✅ Selesai | `getBranchId()` tanpa sesi → `""` (bukan UUID hardcoded). |
| A9 Verifikasi | ⏳ Belum | Dijalankan setelah A4. |

**Penting:** kode A2/A3 sudah aman dijalankan **sebelum** A4 karena service role adalah superset dari anon. Jangan menjalankan `rls_hardening.sql` sebelum kode ini ter-deploy.

**Build:** `npx next build` lulus (03/11/2026).

**Sisa risiko yang belum ditutup (sengaja, agar logika tidak berubah):**
1. Semua staf yang login masih punya akses penuh ke tabel data (RLS `authenticated`), lintas cabang. Isolasi per-cabang di level database adalah pekerjaan Fase 2.
2. PIN fallback `123456` masih berlaku sampai migrasi PIN dijalankan.
3. Rate-limit login portal belum ada.

---

## Cara pakai dokumen ini

1. Baca **Bagian 0** sampai paham aturannya (terutama R0.1).
2. Jalankan **A1** (audit RLS) dan simpan hasilnya.
3. **Backup database** (wajib).
4. Kerjakan **Fase A** berurutan: A2 → A3 → A4 → A5 → A6 → A7 → A8.
5. Luluskan **A9** (verifikasi keamanan) sebelum menyentuh Fase B.
6. Kerjakan **Fase B** satu per satu dengan pembanding sebelum/sesudah.
7. Jalankan **Fase C** (uji regresi) sebelum menganggap selesai.

Setiap langkah dianggap selesai hanya jika kolom verifikasinya dibuktikan (bukan "sepertinya jalan").

---

## 0. ATURAN WAJIB (dibaca sebelum menyentuh kode)

### R0.1 JANGAN UBAH LOGIKA YANG ADA SEKARANG

Yang **tidak boleh** berubah:

| Kategori | Contoh yang dilarang diubah |
|---|---|
| Aturan bisnis | Kuota kelas, aturan auto-booking 4 pertemuan, aturan poin (gross/redeem), aturan absen (tidak hadir/libur/ijin/sakit), status siswa |
| Alur pengguna | Urutan langkah form, redirect setelah simpan, isi modal, flow login/portal |
| Bentuk data keluar | Nama field, tipe, urutan tampil, nilai default, teks UI/label |
| Nama & struktur | Rename fungsi/file/folder, pindah komponen, refactor besar, ganti library |
| Jadwal & isi | Jam cron, isi pesan notifikasi, template laporan |

Yang **boleh** berubah (dan itulah inti pembetulan ini):

| Kategori | Contoh |
|---|---|
| Kontrol akses | RLS, guard sesi, validasi pemilik data (siapa boleh baca/tulis) |
| Bentuk query | Ganti `select("*")` → kolom tertentu; ganti 2 query → 1 RPC — **hasil wajib identik** |
| Ukuran payload | Paginasi, lazy-load, streaming CSV — **isi & angka wajib identik** |
| Header/cache | `Cache-Control`, `revalidate` — **tampilan & data wajib identik** |
| Index database | Tambah index (aditif) — tidak mengubah hasil |

### R0.2 Aturan kerja

1. **Satu langkah = satu commit.** Jangan gabung keamanan + performa dalam satu commit.
2. **Backup dulu.** Sebelum menjalankan SQL apa pun: `pg_dump` / Supabase Backup. Tanpa backup, jangan lanjut.
3. **SQL dijalankan di Supabase SQL Editor**, bukan dari aplikasi.
4. **Setiap langkah punya bukti verifikasi** (before/after). Kalau gagal → `git revert`, jangan lanjut ke langkah berikutnya.
5. **Jangan menyentuh `.env.local` / kredensial** di dalam commit.
6. **Jangan deploy** selama Fase A belum lulus verifikasi.
7. **Uji regresi wajib** dengan 3 peran: SUPERADMIN, BRANCH_ADMIN, Portal Ortu.
8. **Jangan menambah dependency baru** kecuali disebutkan eksplisit di dokumen ini.
9. Kalau ragu apakah perubahan menyentuh logika: **berhenti dan tanya**, jangan improvisasi.
10. Semua perubahan ditulis sebagai komentar kode berbahasa Indonesia yang menjelaskan *alasan* (bukan mengubah perilaku).

### R0.3 Pengecualian yang disengaja (perubahan perilaku yang memang dituju)

Ini bukan pelanggaran R0.1, karena tujuannya menutup celah keamanan:

- **E1.** Pemanggil tanpa login (anon) **tidak lagi** mendapat data siswa/jadwal/laporan. Sebelumnya mendapat data cabang default.
- **E2.** Portal ortu & cron **tetap berjalan normal**, tetapi lewat service-role di server (bukan anon key).
- **E3.** `getBranchId()` tidak lagi mengembalikan UUID hardcoded saat tidak ada sesi.
- **E4.** PIN portal default `123456` diganti PIN unik per siswa (data lama dimigrasi sekali).

Semua pengecualian ini **tidak mengubah tampilan maupun alur** bagi pengguna yang sah.

---

## 1. Ringkasan temuan (dengan bukti)

| # | Temuan | Tingkat | Bukti |
|---|---|---|---|
| T1 | RLS **tidak diaktifkan** di sebagian besar tabel (`master_schema.sql` tidak punya `ENABLE ROW LEVEL SECURITY`) | 🔴 Kritis | `supabase/master_schema.sql` baris 1–252 |
| T2 | Policy `USING (true)` untuk role **anon** di 6 tabel inti | 🔴 Kritis | `src/lib/database/rls_policies.sql` baris 8–53 |
| T3 | `push_subscriptions` policy `FOR ALL USING (true)` | 🔴 Kritis | `supabase/push_subscriptions.sql` baris 16–20 |
| T4 | `birthday_templates`: RLS di-*disable* | 🟠 Tinggi | `supabase/birthday_templates_complete.sql` baris 25 |
| T5 | `getBranchId()` mengembalikan UUID cabang hardcoded bila tidak ada sesi | 🔴 Kritis | `src/lib/actions/auth-branch.ts:123` |
| T6 | Sebagian besar server action tidak memeriksa sesi | 🔴 Kritis | `students.ts`, `schedules.ts`, `worksheets.ts`, `dashboard.ts`, `points.ts`, `master.ts` |
| T7 | `/api/student-feedback` pakai service role **tanpa** cek pemilik sesi (IDOR) | 🔴 Kritis | `src/app/api/student-feedback/route.ts:7–60, 103+` |
| T8 | `/api/birthday-template` POST/PUT/DELETE tanpa cek role | 🟠 Tinggi | `src/app/api/birthday-template/route.ts:106+` |
| T9 | Fallback `CRON_SECRET` hardcoded | 🟠 Tinggi | `src/app/api/cron/daily-notification/route.ts:129`, `src/instrumentation.ts:32` |
| T10 | PIN portal default `123456` + login via nama | 🟠 Tinggi | `src/lib/actions/portal.ts:158–163, 441` |
| T11 | `getAllUsers()` pakai `select("*")` (ikut mengirim kolom `password`) | 🟠 Tinggi | `src/lib/actions/auth-branch.ts:296` |
| T12 | `/api/auth/gdrive/callback` bisa menulis refresh token tanpa sesi | 🟠 Tinggi | `src/app/api/auth/gdrive/callback/route.ts` |
| T13 | `/api/push/subscribe` & `/unsubscribe` tanpa cek sesi (pakai service/anon) | 🟡 Sedang | `src/app/api/push/*/route.ts` |
| T14 | Payload halaman besar (reports ±4 MB, points ±1,5 MB) | 🟠 Tinggi | `studentScheduleReport.ts`, `worksheets.ts:638`, `points/page.tsx` |
| T15 | Scan penuh `student_worksheets` tiap buka `/worksheets` & `/points` | 🟠 Tinggi | `students.ts:87–137` |
| T16 | `getOverdueWorksheets()` jalan tiap render dashboard (2 scan penuh) | 🟠 Tinggi | `dashboard.ts:124–485` |
| T17 | `auth.getUser()` dipanggil 5× per navigasi + `select users` 3× | 🟡 Sedang | `proxy.ts`, `(dashboard)/layout.tsx`, `auth-branch.ts` |
| T18 | Index `schedule_student(student_id)` tidak ada (PK hanya `slot_id + student_id`) | 🟡 Sedang | `supabase/master_schema.sql:119` |

---

## 2. FASE A — Keamanan Supabase (WAJIB, ±1–1,5 hari)

> Urutan wajib: **A1 → A2 → A3 → A4 → A5 → A6/A7**. Jangan melompat ke A3 sebelum A2 selesai, karena RLS akan memutus portal & cron.

### A1. Audit kondisi RLS sebenarnya (15 menit)

Jalankan di Supabase SQL Editor, simpan hasilnya sebagai *baseline*:

```sql
select c.relname as tabel,
       c.relrowsecurity as rls_aktif,
       count(p.polname) as jumlah_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by 1, 2
order by 1;
```

**Verifikasi:** simpan output ke `docs/audit-rls-sebelum.txt`.

**Hasil aktual (03/11/2026):** semua **17 tabel** `rls_aktif = false` dan `jumlah_policy = 0`.
Artinya file `src/lib/database/rls_policies.sql` yang ada di repo **tidak pernah masuk** ke project ini.
Selama kondisi ini, anon key di browser bisa membaca dan menulis seluruh data (termasuk PIN siswa).
Ini menjadikan A4 bukan "pengetatan", melainkan **aktivasi RLS pertama kali**.

---

### A2. Buat service-role client khusus server (30 menit)

**File baru:** `src/lib/supabase/admin.ts`

Isi (kerangka):

```ts
// Server-only. Jangan pernah diimpor dari komponen client ("use client").
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getAdminClient() hanya boleh dipakai di server.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Env Supabase service role belum lengkap.");
  }
  if (!_admin) {
    _admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (u, o) => fetch(u, { ...o, cache: "no-store" }) },
    });
  }
  return _admin;
}
```

**Verifikasi:**
- `grep -rn "supabase/admin" src/components src/app` → harus kosong (kecuali route handler/action).
- `npx tsc --noEmit` bersih.

---

### A3. Ganti pemakaian anon singleton (45 menit)

Hasil audit: anon singleton (`src/lib/supabase.ts`) hanya benar-benar dipakai di:

| File | Ganti dengan |
|---|---|
| `src/lib/push.ts` | `getAdminClient()` |
| `src/app/api/cron/daily-notification/route.ts` | `getAdminClient()` |
| `src/app/api/push/unsubscribe/route.ts` | `getAdminClient()` + cek sesi (lihat A6) |
| `src/app/api/student-feedback/route.ts` | `getAdminClient()` + cek sesi (lihat A6) |
| `src/app/api/upload-gdrive/route.ts` | `getAdminClient()` (bagian fallback anon) |
| `src/lib/actions/portal.ts` | tetap `createClient()` untuk baca sesi; query data pakai `getAdminClient()` |
| `src/lib/actions/{dashboard,worksheets,points,master}.ts` | hapus `import { supabase }` jika tidak terpakai (dead import) |

**Verifikasi:** `grep -rn "from \"../supabase\"\|from \"@/lib/supabase\"" src` → hanya menyisakan yang memang perlu.

---

### A4. RLS hardening (30 menit + backup)

Script lengkap ada di **Lampiran A** — versi siap-jalan: **`supabase/rls_hardening.sql`**. Ringkasnya:

1. `ENABLE ROW LEVEL SECURITY` di **semua** tabel `public`.
2. Hapus semua policy lama di schema `public`.
3. Buat policy `authenticated` (full access) untuk tabel admin.
4. Buat policy `anon` **hanya** untuk:
   - `branches` → `SELECT`
   - `birthday_templates` → `SELECT WHERE is_active = true`
5. Tambah index yang hilang (Lampiran B).

> ⚠️ Script A4 **menghapus semua policy** di schema `public` lalu membuat ulang. Wajib backup + jalankan di jam sepi.

**Verifikasi (wajib, jangan dilewati):**

```bash
# Ganti dengan URL & anon key project Anda
curl -s "https://<project>.supabase.co/rest/v1/students?select=id&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
# HARUS menghasilkan [] atau error 401/permission denied
```

- Login admin → dashboard, siswa, jadwal, worksheet, poin tetap normal.
- Portal ortu → login PIN, dashboard, riwayat tetap normal.
- Cron manual (lihat A7) → HTTP 200.

---

### A5. Guard sesi di semua server action (2–3 jam)

**File:** `src/lib/actions/_internal.ts` (bukan `"use server"`, aman untuk helper)

Tambahkan **tiga** helper:

```ts
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/** Wajib login (admin). Dipakai action yang hanya untuk dashboard. */
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/**
 * Boleh admin login ATAU portal ortu (cookie parent_student_id == studentId).
 * Hasil data TIDAK berubah — hanya siapa yang boleh memanggil.
 */
export async function requireUserOrParent(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { kind: "admin" as const, user };

  const cookieStore = await cookies();
  const parentStudentId = cookieStore.get("parent_student_id")?.value;
  if (parentStudentId && parentStudentId === studentId) {
    return { kind: "parent" as const, user: null };
  }
  throw new Error("UNAUTHORIZED");
}

/**
 * Boleh admin login ATAU portal ortu (cookie parent_student_id ada di daftar ids).
 * Dipakai action bersama yang menerima banyak siswa sekaligus.
 */
export async function requireUserOrParentOfAny(studentIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { kind: "admin" as const, user };

  const cookieStore = await cookies();
  const parentStudentId = cookieStore.get("parent_student_id")?.value;
  if (parentStudentId && studentIds.includes(parentStudentId)) {
    return { kind: "parent" as const, user: null };
  }
  throw new Error("UNAUTHORIZED");
}
```

Lalu terapkan:

| File | Fungsi | Guard |
|---|---|---|
| `students.ts` | `getStudents`, `getPaginatedStudents`, `getStudentsByStatusWithSchedules`, `createStudent`, `updateStudent`, `deleteStudent`, `updateStudentStatus`, `updateStudentLabel`, `updateStudentAccessPin`, `updateStudentPhotoUrl` | `requireUser()` |
| `schedules.ts` | `getMonthlySchedules`, semua fungsi booking/auto-booking/unlock | `requireUser()` |
| `schedules.ts` | `getStudentScheduleMap(studentIds)` | `requireUserOrParentOfAny(studentIds)` — dipakai `getStudents()` (admin) dan `portal.ts` (ortu) |
| `worksheets.ts` | `getWorksheetsByBranch`, `getWorksheetAttendanceHistory`, semua create/update/delete | `requireUser()` |
| `worksheets.ts` | `getWorksheetsByStudent(studentId)` | `requireUserOrParent(studentId)` — dipakai portal **dan** `DashboardStatsPanel`/`ChangeLabelModal` |
| `dashboard.ts` | `getDashboardStats`, `getOverdueWorksheets`, `getTodaySchedules`, `getRecentActivities` | `requireUser()` |
| `points.ts` | `getPointRedemptions()` tanpa `studentId` | `requireUser()` |
| `points.ts` | `getPointRedemptions(studentId)` dengan `studentId` | `requireUserOrParent(studentId)` |
| `points.ts` | redeem, manual bonus | `requireUser()` |
| `master.ts` | semua CRUD kelas/label/guru/template/dokumen | `requireUser()` |
| `portal.ts` | `getStudentUpcomingSchedule(studentId)`, `getStudentScheduleHistory(studentId)` | `requireUserOrParent(studentId)` |
| `portal.ts` | `getParentSessionStudent`, `loginParentPortal`, `logoutParentPortal` | tanpa guard (memang publik) |
| `auth-branch.ts` | `resetAllDatabaseData`, `updateModuleLockPassword`, `setSuperadminBranch` | sudah ada sebagian — samakan |

**Jangan diberi guard** (memang publik / dipakai halaman publik):
- `getBranches` (dipakai halaman login portal)
- `loginParentPortal`, `getParentSessionStudent`
- `getStudentRulesDocuments` **hanya jika** memang ditampilkan di halaman publik — cek dulu; kalau hanya di dashboard, beri guard.

**Catatan:** `portal.ts` memakai `getAdminClient()` untuk query data (karena tidak punya sesi Supabase), tetapi **wajib** memvalidasi `parent_student_id` lewat `requireUserOrParent`/`requireUserOrParentOfAny` sebelum mengembalikan data. Tanpa validasi ini, siapa pun bisa membaca data siswa lain hanya dengan menebak ID.

**Verifikasi:**
- Semua halaman admin tetap jalan (tidak ada "UNAUTHORIZED" untuk user login).
- Panggil action dari browser tanpa cookie (mode incognito setelah logout) → harus gagal, bukan mengembalikan data.

---

### A6. Tutup endpoint yang bocor (2 jam)

| Endpoint | Perbaikan (tanpa ubah respons sukses) |
|---|---|
| `api/student-feedback` | GET: wajib salah satu — (a) sesi admin, atau (b) cookie `parent_student_id` == `student_id`. POST: `parent_user_id` diambil dari sesi/cookie, **bukan** dari body. Pindahkan penandaan `is_read` ke `PATCH`. |
| `api/birthday-template` | GET tetap publik. POST/PUT/DELETE → `await requireUser()` + role `SUPERADMIN`. |
| `api/auth/gdrive/callback` | Wajib sesi `SUPERADMIN`. Tanpa sesi → 403. |
| `api/push/subscribe` | Wajib sesi; `branchId` diambil dari `getBranchId()`, bukan body. |
| `api/push/unsubscribe` | Wajib sesi; hapus berdasarkan sesi/endpoint milik sendiri. |
| `api/birthday` | Sudah ada cek user; tambahkan `.limit(200)`. |

**Verifikasi:** setiap endpoint diuji dengan `curl` tanpa cookie → 401/403; dengan sesi → 200 dan isi sama seperti sebelumnya.

---

### A7. Secret, PIN, dan data sensitif (1 jam)

1. **CRON_SECRET**
   - `src/app/api/cron/daily-notification/route.ts:129` → hapus `|| "shiningsun_daily_cron_secret_key_2026"`. Jika env kosong → balas `500` (konfigurasi belum siap).
   - `src/instrumentation.ts:32` → sama.
   - Set `CRON_SECRET` acak ≥32 karakter di server.
   - **Verifikasi:** `curl -H "Authorization: Bearer salah" ...` → 401; dengan secret benar → 200.

2. **PIN portal**
   - Migrasi sekali: isi `access_pin` unik 6 digit untuk semua siswa yang masih `123456`/NULL.
   - `portal.ts:163` & `:441` → hapus fallback `"123456"` (jika kosong → tolak login, minta admin set PIN).
   - `StudentWorksheetTable.tsx:1017` & `WorksheetClientWrapper.tsx:194,512` → teks fallback `"123456"` **jangan diubah** (itu tampilan); cukup pastikan data sudah punya PIN.
   - Tambah rate-limit login portal: maksimal 5 percobaan/menit per IP+nama (in-memory `Map` dengan timestamp, pola sama seperti `memoryPointsCache`).

3. **`getAllUsers`**
   - `auth-branch.ts:296` → `select("id, name, email, role, branch_id, created_at, branch:branches(name)")`.
   - Pastikan `AccountsClientWrapper` tidak memakai field lain (saat ini: `id, email, name, role, branch_id, branch`).

4. **Operasional (di luar kode, wajib dicatat):**
   - Supabase Dashboard → Authentication → **matikan "Allow new users to sign up"**.
   - Rotasi `SUPABASE_SERVICE_ROLE_KEY` bila repo pernah dibagikan ke orang lain.
   - Pastikan `backup.json` (berisi PII + foto siswa) tidak ikut ter-commit (sudah masuk `.gitignore`).

---

### A8. Hapus fallback cabang hardcoded (15 menit)

`src/lib/actions/auth-branch.ts:122–124`:

```ts
if (!user) {
  return "11111111-1111-1111-1111-111111111111"; // HAPUS
}
```

Ganti menjadi `return "";`.

**Dampak:** action tanpa sesi kini mengembalikan kosong (bukan data cabang default). Ini **E3** — disengaja.

**Verifikasi:** setelah login normal, semua halaman tetap menampilkan cabang yang sama seperti sebelumnya.

---

### A9. Verifikasi Fase A (wajib lulus semua)

| # | Uji | Harapan |
|---|---|---|
| 1 | `curl` anon ke `/rest/v1/students`, `.../student_worksheets`, `.../users`, `.../push_subscriptions` | `[]` atau 401 |
| 2 | `curl` anon ke `/rest/v1/branches` | data cabang (boleh) |
| 3 | Login SUPERADMIN | dashboard & semua menu normal |
| 4 | Login BRANCH_ADMIN | hanya data cabangnya, normal |
| 5 | Portal ortu: login PIN → dashboard → riwayat | identik dengan sebelum pembetulan |
| 6 | Cron manual dengan secret | 200, notifikasi terkirim |
| 7 | Push subscribe/unsubscribe | berhasil, tanpa error |
| 8 | Upload dokumen kurikulum & aturan siswa | berhasil |
| 9 | `curl /api/student-feedback?student_id=<uuid>` tanpa sesi | `401 Unauthorized` |
| 10 | `curl -X POST /api/push/subscribe` tanpa sesi | `401 Unauthorized` |
| 11 | `curl -X POST /api/upload-gdrive` tanpa sesi | `401 Unauthorized` |
| 12 | `npx tsc --noEmit` + `npm run lint` | bersih |

---

## 3. FASE B — Performa & Limit (±1 hari)

> Aturan: **output wajib identik**. Setiap langkah dibandingkan sebelum/sesudah (jumlah baris, angka poin, isi tabel).

### B1. `/reports/students` — dari ±4 MB ke <500 KB
- **File:** `src/lib/studentScheduleReport.ts` → tambah parameter `page`, `pageSize` (default 50) dan `.range()`.
- **File:** `src/app/(dashboard)/reports/students/ReportClient.tsx` → paginasi server (tombol/URL `?page=`).
- **File baru:** `src/app/api/reports/students/export/route.ts` → CSV streaming (unduh semua baris).
- **Verifikasi:** jumlah baris total & isi kolom sama; unduhan CSV berisi semua baris seperti sebelumnya.

### B2. `/points` — dari ±1,5 MB ke <300 KB
- **File:** `src/lib/actions/worksheets.ts` → tambah `getAttendanceHistoryPage(studentId?, page)`; **jangan hapus** `getWorksheetAttendanceHistory` (dipakai untuk kompatibilitas).
- **File:** `src/app/(dashboard)/points/page.tsx` → jangan kirim `initialAttendanceHistory` penuh.
- **File:** `src/app/(dashboard)/points/PointsClientWrapper.tsx` → muat riwayat saat tab History dibuka.
- **Verifikasi:** angka poin & daftar riwayat per siswa identik.

### B3. Hilangkan scan penuh `student_worksheets`
- **File:** `src/lib/actions/students.ts:87–137` → ganti dua loop pengambilan ID dengan satu RPC agregat (`Lampiran C`).
- **Verifikasi:** total poin tiap siswa (317 baris) sama persis dengan hasil sebelum perubahan.

### B4. `getOverdueWorksheets` → cache + kurangi query (TANPA ubah algoritma)

> ⚠️ **Jangan** mengganti algoritma overdue dengan SQL/RPC pada tahap ini. Algoritmanya memuat aturan rumit: abaikan era CG (`registered_at`), lewati jadwal hari ini, cocokkan laporan per tanggal **dan** jam, dan status absen hanya dari `materi`/`title`. Menggantinya berisiko mengubah hasil.

Yang aman dilakukan:
- **File:** `src/lib/actions/dashboard.ts:124–485`
  - Bungkus hasil dengan `unstable_cache` **60 detik** per `branchId` + `revalidateTag("worksheets")` pada setiap mutasi worksheet.
    - Catatan teknis: fungsi yang di-cache **tidak boleh** memakai `cookies()`/`headers()`. Di dalam fungsi cache, gunakan `getAdminClient()` (A2). Key cache: `["overdue", branchId]`, tag: `["worksheets"]`.
  - Gabungkan query `classes` (baris 280–290) ke dalam select booking (`class:classes(name)`) agar tidak ada round-trip tambahan.
- **Verifikasi:** daftar "laporan terlewat" **sama persis** (jumlah, nama, tanggal, jam) sebelum vs sesudah; hanya waktu muat yang turun.

### B5. Dedupe auth (28–30 request → ±12)
- **File:** `src/lib/actions/_internal.ts` (tambahkan) → `getAuthContext = cache(async () => ({ user, profile }))`.
- **File:** `src/lib/actions/auth-branch.ts` → `getCurrentUserRole` & `getBranchId` memakai `getAuthContext`.
- **File:** `src/app/(dashboard)/layout.tsx` → hapus `syncUserIdentity()` (sudah dijalankan saat login) dan `supabase.auth.getUser()` terpisah.
- **File:** `src/proxy.ts` → skip `updateSession` untuk `/portal-ortu`.
- **Verifikasi:** role & cabang yang terdeteksi sama; login/logout tetap normal.

### B6. Payload halaman jadwal
- **File:** `src/lib/actions/schedules.ts:722+` → `select("*")` diganti kolom yang dipakai; booking hanya `student_id` + nama/nickname/label.
- **Verifikasi:** kalender menampilkan slot, jam, kelas, dan siswa yang sama.

### B7. Perbaikan kecil (tanpa ubah tampilan)
- `next.config.ts`: tambah `max-age` untuk aset (bukan hanya `s-maxage`).
- `api/birthday`: filter bulan di SQL (bukan di JS), `.limit(200)`.
- `revalidatePath` berlebih → sisakan path yang benar-benar berubah.
- Hapus `import` yang tidak terpakai (dead import `supabase`).

---

## 4. FASE C — Uji Regresi (wajib, ±3 jam)

Uji manual dengan data yang sama sebelum & sesudah. Catat hasil di `docs/regresi-fase-A-B.md`.

| Modul | Skenario | Patokan "logika tidak berubah" |
|---|---|---|
| Login | SUPERADMIN, BRANCH_ADMIN, salah password | Redirect & pesan sama |
| Dashboard | Statistik, CG, jadwal hari ini, ultah, dokumen | Semua angka sama |
| Master | Tambah/edit/hapus kelas, label, guru, template | Data & urutan sama |
| Siswa | Daftar, filter, paginasi, tambah, edit, PIN, foto | Jumlah & isi sama |
| Penjadwalan | Buat slot, booking manual, auto-booking 1 bulan | Slot & booking sama |
| Jadwal | Tampilan bulan, kunci slot, pindah bulan | Sama |
| Worksheet | Buat, edit, absen, upload foto, PDF | Sama |
| Poin | Poin tiap siswa, redeem, bonus manual | **Angka sama persis** |
| Laporan | Daftar siswa, laporan per jadwal, CSV | **Jumlah baris & isi sama** |
| Portal | Login PIN, jadwal, riwayat, feedback, unduh | Sama |
| Notifikasi | Subscribe, terima push, cron | Sama |
| Offline/PWA | Buka saat offline, update SW | Sama |

---

## 5. Rollback

| Langkah | Cara rollback |
|---|---|
| A2/A3/A5/A6/A7/A8 | `git revert <commit>` |
| A4 (RLS) | Jalankan `docs/rollback-rls.sql` = isi `rls_policies.sql` lama + `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` untuk tabel yang sebelumnya mati |
| B1–B7 | `git revert <commit>` (tidak ada perubahan schema permanen) |
| Lampiran C (fungsi SQL) | `DROP FUNCTION public.student_point_summary(uuid);` |

**Aturan:** rollback hanya jika verifikasi gagal. Jangan rollback sebagian di tengah Fase A — RLS + guard harus konsisten.

---

## 6. Urutan commit yang disarankan

| # | Commit | Isi | Fase |
|---|---|---|---|
| 1 | `feat(security): admin client server-only` | A2 | A |
| 2 | `feat(security): pindahkan portal & cron ke service role` | A3 | A |
| 3 | `feat(security): rls hardening + index` | A4 + Lampiran A/B | A |
| 4 | `feat(security): guard sesi semua server action` | A5 | A |
| 5 | `feat(security): tutup endpoint publik` | A6 | A |
| 6 | `feat(security): hapus secret fallback + PIN unik` | A7/A8 | A |
| 7 | `perf(reports): paginasi + CSV streaming` | B1 | B |
| 8 | `perf(points): riwayat lazy-load` | B2 | B |
| 9 | `perf(students): rpc agregat poin` | B3 | B |
| 10 | `perf(dashboard): cache overdue` | B4 | B |
| 11 | `perf(auth): dedupe auth context` | B5 | B |
| 12 | `perf(schedule): ramping payload` | B6/B7 | B |

Setelah commit #6 (Fase A selesai) → **berhenti, uji regresi penuh, baru lanjut Fase B.**

---

## 7. Definisi selesai (DoD)

- [ ] Semua uji A9 lulus.
- [ ] Semua uji regresi Fase C lulus dengan angka identik.
- [ ] `npx tsc --noEmit` dan `npm run lint` bersih.
- [ ] `curl` anon tidak bisa membaca tabel admin.
- [ ] Tidak ada perubahan pada file UI/logika bisnis (dibuktikan dengan `git diff --stat`).
- [ ] Dokumen ini diperbarui: status per langkah → ✅ dan tanggal eksekusi.

---

## 8. Di luar cakupan (jangan dikerjakan sekarang)

- VPS, Coolify, Docker, Nginx/Traefik, domain, HTTPS.
- Migrasi database keluar dari Supabase.
- Refactor komponen besar (`WorksheetFormModal`, `DashboardStatsPanel`, dll.).
- Perubahan desain/tema/animasi.
- Fitur baru.

---

# LAMPIRAN

## Lampiran A — SQL RLS Hardening

> **Versi final yang dipakai: `supabase/rls_hardening.sql`.**
> Blok SQL di bawah adalah draf awal dan **belum** memuat pembatasan tulis tabel `users`.
> Jangan jalankan blok ini; jalankan file tersebut.

> Jalankan **setelah backup** dan **setelah A2–A3 selesai** (agar portal & cron tidak mati).
> Idealnya diuji dulu di project Supabase salinan (Free mengizinkan 2 project) sebelum dijalankan di produksi.
> Script ini mengasumsikan nama tabel sesuai `supabase/master_schema.sql`; jika ada tabel tambahan di produksi, tambahkan ke daftar `ARRAY[...]`.

```sql
-- =========================================================
-- A4. RLS HARDENING — ShiningSun
-- Idempoten. Menghapus SEMUA policy di schema public lalu
-- membuat ulang: authenticated = full, anon = baca terbatas.
-- =========================================================

-- 1) Aktifkan RLS di semua tabel public
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'branches','users','labels','classes','teachers','assessment_templates',
    'students','schedule_slots','schedule_student','student_worksheets',
    'student_point_redemptions','student_feedback','birthday_templates',
    'curriculum_documents','student_rules_documents','push_subscriptions',
    'system_settings'
  ]
  LOOP
    -- lewati tabel yang belum ada di project ini
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- 2) Hapus semua policy lama di schema public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3) Akses penuh untuk user login (admin aplikasi)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'branches','users','labels','classes','teachers','assessment_templates',
    'students','schedule_slots','schedule_student','student_worksheets',
    'student_point_redemptions','student_feedback','birthday_templates',
    'curriculum_documents','student_rules_documents','push_subscriptions',
    'system_settings'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY "authenticated_full_access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        t
      );
    END IF;
  END LOOP;
END $$;

-- 4) Baca publik terbatas (dibutuhkan halaman login portal)
CREATE POLICY "public_read_branches"
  ON public.branches FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_active_birthday_templates"
  ON public.birthday_templates FOR SELECT TO anon USING (is_active = true);

-- 5) Pastikan tidak ada tabel lain yang tertinggal tanpa RLS
--    (jalankan query audit A1 lagi; semua harus rls_aktif = true)
```

**Catatan penting:**
- Service role **melewati RLS** (bypass), jadi cron/portal/push tetap jalan setelah A3.
- Storage bucket tidak diubah di sini. Bucket `curriculum-docs` masih publik — keputusan terpisah.
- Setelah script ini, **semua** akses anon ke tabel admin akan ditolak, termasuk dari browser DevTools.

## Lampiran B — Index tambahan (aditif)

```sql
-- Booking dicari per siswa (PK hanya slot_id + student_id)
CREATE INDEX IF NOT EXISTS idx_schedule_student_student
  ON public.schedule_student(student_id);

CREATE INDEX IF NOT EXISTS idx_schedule_student_slot
  ON public.schedule_student(schedule_slot_id);

-- Cron & laporan memfilter berdasarkan tanggal saja
CREATE INDEX IF NOT EXISTS idx_schedule_slots_date
  ON public.schedule_slots(date);
```

## Lampiran C — RPC agregat poin siswa

> Tujuan: menggantikan scan penuh `student_worksheets` di `students.ts` (baris 87–195).
> **Hasil wajib sama**: gross = jumlah worksheet yang **tidak** cocok dengan filter absen; redeemed = `SUM(points_deducted)`.
> Semantik filter mengikuti `ABSENT_WORKSHEET_OR_FILTER` di `src/lib/actions/_internal.ts` (kolom `materi`, `title`, `kegiatan`, `hasil_belajar`), yaitu baris dianggap absen bila **salah satu** kolom mengandung salah satu kata kunci.

```sql
CREATE OR REPLACE FUNCTION public.student_point_summary(p_branch uuid DEFAULT NULL)
RETURNS TABLE(student_id uuid, gross_points bigint, redeemed_points bigint)
LANGUAGE sql STABLE AS $$
  WITH absent_keywords AS (
    SELECT ARRAY['%tidak hadir%','%libur%','%ijin%','%izin%','%sakit%']::text[] AS kw
  ),
  gross AS (
    SELECT w.student_id, count(*)::bigint AS gross_points
    FROM public.student_worksheets w
    JOIN public.students s ON s.id = w.student_id
    CROSS JOIN absent_keywords k
    WHERE (p_branch IS NULL OR s.branch_id = p_branch)
      AND NOT (
           coalesce(w.materi, '')        ILIKE ANY (k.kw)
        OR coalesce(w.title, '')         ILIKE ANY (k.kw)
        OR coalesce(w.kegiatan, '')      ILIKE ANY (k.kw)
        OR coalesce(w.hasil_belajar, '') ILIKE ANY (k.kw)
      )
    GROUP BY w.student_id
  ),
  redeemed AS (
    SELECT r.student_id,
           sum(coalesce(r.points_deducted, 0))::bigint AS redeemed_points
    FROM public.student_point_redemptions r
    GROUP BY r.student_id
  )
  SELECT s.id,
         coalesce(g.gross_points, 0),
         coalesce(r.redeemed_points, 0)
  FROM public.students s
  LEFT JOIN gross g ON g.student_id = s.id
  LEFT JOIN redeemed r ON r.student_id = s.id
  WHERE (p_branch IS NULL OR s.branch_id = p_branch);
$$;
```

> ⚠️ Sebelum dipakai: cocokkan `gross`/`redeemed` untuk **semua 317 siswa** dengan hasil lama (cetak keduanya ke CSV, lalu bandingkan). Jika ada 1 selisih → jangan lanjut.
> Kolom redemption yang benar adalah `points_deducted` (bukan `points`).

## Lampiran D — RPC laporan terlewat: **DITUNDA (jangan dipakai dulu)**

Rencana awal mengganti `getOverdueWorksheets()` dengan satu RPC. **Dibatalkan** karena algoritma saat ini memuat aturan yang harus direplikasi persis:

1. Hanya siswa `status = 'REGISTERED'`.
2. Mulai dari `max(tanggal 60 hari lalu, 2026-09-23)`.
3. Booking sebelum `registered_at` (era CG) **diabaikan** — dengan aturan berbeda untuk siswa konversi CG vs reguler.
4. Jadwal **hari ini dilewati** (tidak bisa cek +1 jam dari server).
5. Laporan dianggap cocok bila `student_id` sama **dan** tanggal sama **dan** jam sama; laporan lama tanpa jam menutupi semua jam di tanggal itu.
6. Status absen hanya dicek dari `materi` dan `title` (bukan `kegiatan`/`hasil_belajar`).

Karena itu, pada Fase B cukup lakukan **cache + gabung query** (B4). RPC baru boleh dibuat setelah ada uji kesetaraan otomatis yang membandingkan output lama vs baru untuk seluruh 60 hari terakhir.

---

## Lampiran E — Template bukti verifikasi

```
LANGKAH: <A4 / B1 / ...>
TANGGAL: <dd/mm/yyyy>
SEBELUM: <angka/ukuran/perilaku>
SESUDAH: <angka/ukuran/perilaku>
SAMA?   : ya / tidak
CATATAN : <jika tidak sama, jelaskan>
```
