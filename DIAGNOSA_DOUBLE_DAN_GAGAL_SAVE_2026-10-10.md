# Diagnosa: Double di Laporan Perkembangan + Beberapa Anak Tidak Bisa Save

> Tanggal: 2026-10-10
> Sifat: **READ-ONLY — tidak ada kode yang diubah.**
> Tujuan: dibaca dulu sebelum memutuskan fix.
> Isi: temuan terverifikasi (file:baris) + Before (logika saat ini) vs After (usulan, BELUM diterapkan).

---

## 0. Ringkasan Eksekutif (1 menit)

Ada **2 masalah berbeda** dengan penyebab berbeda. Jangan dicampur:

| Gejala | Penyebab dominan (terverifikasi di kode) | Letak |
|---|---|---|
| **DOUBLE** — 1 anak + 1 tanggal muncul 2 baris | Jalur `/worksheets` simpan **tanpa** `slot/time` → tidak ada UNIQUE di DB untuk `NULL+NULL` → `check-then-insert` tanpa transaksi bisa lolos 2x. Ditambah error pre-check **ditelan lalu tetap insert**, dan jalur **Edit tanpa slot/time skip cek tabrakan total**. | `actions.ts:2439-2463`, `actions.ts:2624`, `schedule_link.sql:41-47`, `WorksheetClientWrapper.tsx:909-916` |
| **GAGAL SAVE** — beberapa anak tekan Simpan tapi ditolak / data seolah hilang | Aturan konservatif: **baris lama tanpa slot/time dianggap menempati tanggal itu** → semua save baru tanggal sama diblokir walau jam beda. Jalur `/worksheets` juga = **1 laporan per tanggal**, jadi anak 2 sesi sehari pasti sesi-2 ditolak. Plus fallback tanggal diam-diam ke **hari ini** kalau format tak dikenal. | `actions.ts:2347-2362`, `WorksheetFormModal.tsx:1267-1278`, `dateUtils.ts:117-118,175` |

Kunci pembeda: lihat **teks error persis** + **isi kolom `schedule_slot_id/schedule_time` baris yang double/bermasalah** (lihat Query Audit §5).

---

## 1. Scope & Batasan

- Tidak ada file `.ts/.tsx/.sql` yang diubah dalam diagnosa ini.
- File ini satu-satunya artefak baru.
- Semua potongan kode di bawah adalah **kutipan kondisi saat ini (Before)**. Kolom "After (usulan)" adalah rencana yang **belum diterapkan** — perlu persetujuan kamu.

---

## 2. Peta Alur (3 Jalur Masuk ke 1 Fungsi Simpan)

```
[A] /worksheets (WorksheetClientWrapper.tsx:909-916)
    props: students, initialData, worksheets=initialWorksheets, lockedStudentId
    TIDAK kirim: scheduleSlotId / scheduleTime / currentDate
    → selalu "flow lama": 1 siswa = 1 tanggal

[B] Dashboard Terlewat (DashboardStatsPanel.tsx:1162-1214)
    props: students=[overdueStudent], worksheets=overdueWorksheets (fresh per siswa),
           lockedStudentId, currentDate=missedDate, scheduleTime=missedTime, scheduleClassName
    TIDAK kirim: scheduleSlotId, TIDAK kirim: initialData
    → "flow jam tanpa slot": cek per tanggal+jam (jam saja, tanpa slot id)

[C] Kelola Siswa / Jadwal Hari Ini (ChangeLabelModal.tsx:338-364)
    props: students=[1 siswa], worksheets=worksheetsList,
           initialData={student_id}, lockedStudentId,
           currentDate=scheduleDate, scheduleSlotId, scheduleTime, scheduleClassName
    → satu-satunya jalur lengkap: tanggal + slot id + jam
```

Semua bermuara ke:

- Tambah: `createWorksheet(formData)` di `src/lib/actions.ts:2364-2523`
- Edit: `updateWorksheet(id, formData)` di `src/lib/actions.ts:2525-2689`
- Guard client: `duplicateInfo` + `submittedRef/isSubmitting` di `WorksheetFormModal.tsx:1235-1291,1629-1630,1695-1696`

Daftar `worksheets` yang dipakai guard client **berbeda sumber per jalur** dan **bisa basi**:

| Jalur | Isi `worksheets` | Freshness |
|---|---|---|
| [A] | `initialWorksheets` (snapshot page load) | basi sampai `router.refresh()` (`WorksheetClientWrapper.tsx:925`) |
| [B] | `overdueWorksheets` (fetch per siswa saat buka modal, `DashboardStatsPanel.tsx:267-273`) | fresh per siswa, tapi sukses hanya update lokal tanpa refresh (`:1168-1202`) |
| [C] | `worksheetsList` (per siswa) | fresh per modal |

---

## 3. Masalah 1 — DOUBLE

### 3.1 [A1] Flow lama tanpa slot/time tidak punya UNIQUE (lubang utama)

**Bukti:**
- `supabase/student_worksheets.sql:1-24` — tabel awal tanpa unique apapun.
- `supabase/student_worksheets_schedule_link.sql:41-47`:
  ```sql
  CREATE UNIQUE INDEX ... uq_worksheets_student_date_slot ...
    WHERE schedule_slot_id IS NOT NULL;
  CREATE UNIQUE INDEX ... uq_worksheets_student_date_time ...
    WHERE schedule_slot_id IS NULL AND schedule_time IS NOT NULL;
  ```
- Komentar file itu sendiri (`:4-6`): baris lama `NULL+NULL` **sengaja dikecualikan** agar migrasi tidak gagal.

**Before (saat ini) — `actions.ts:2439-2451`:**
```ts
} else {
  // Flow lama tanpa konteks jam: cegah double per siswa+tanggal.
  const { data: existing, error: checkError } = await supabaseServer
    .from("student_worksheets")
    .select("id")
    .eq("student_id", student_id)
    .eq("worksheet_date", worksheet_date)
    .limit(1);
  if (checkError) throw checkError;
  if (existing && existing.length > 0) {
    throw new Error(DUPLICATE_REPORT_MESSAGE);
  }
}
```
Ini `check-then-insert` **tanpa transaksi / tanpa lock**. Dua request yang masuk bersamaan bisa sama-sama baca `0 baris` lalu sama-sama insert. DB tidak akan menolak karena tidak ada unique untuk `NULL+NULL`.

**After (usulan, BELUM diterapkan) — pilih satu, jangan semua sekaligus:**
1. **Opsi DB (paling kuat):** backfill + unique bertahap untuk `NULL+NULL`. Butuh audit Q1 dulu — kalau data lama sudah double, unique langsung akan gagal. Tahapan: audit → dedup manual → baru tambah unique. Risiko: butuh jendela maintenance.
2. **Opsi aplikasi (tanpa migrasi):** jadikan pre-check + insert idempoten (mis. kunci per `student+date` via transaksi / `FOR UPDATE`, atau kirim `scheduleSlotId/scheduleTime` dari jalur [A] agar masuk ke partial unique yang sudah ada). Risiko: ubah perilaku "1 per tanggal" jadi "1 per jam" — perlu keputusan produk.
3. **Opsi minimal (observabilitas dulu):** tambah log `student_id, worksheet_date, slot, time, hasil pre-check` saat insert, tanpa ubah aturan. Risiko: nol, tapi double masih bisa terjadi sampai opsi 1/2 dipilih.

**Cara bedakan di lapangan:** jalankan Q1. Kalau hasilnya banyak → double warisan (sudah ada sebelum bug dilaporkan). Kalau Q1 kosong tapi double baru terus muncul → race A1/A2.

---

### 3.2 [A2] Error pre-check ditelan lalu tetap insert

**Before (saat ini) — `actions.ts:2452-2463`:**
```ts
} catch (e: any) {
  if (String(e?.message || "").startsWith("LAPORAN_SUDAH_TERISI")) throw e;
  // Selain duplikat terdeteksi, error cek diabaikan agar insert tetap dicoba
  // (unique index DB menjadi pengaman terakhir, termasuk untuk race condition).
  if (e && !isMissingColumnError(e) && !String(e?.message || "").includes("LAPORAN_SUDAH_TERISI")) {
    console.warn("Pre-check duplikat laporan dilewati:", e?.message || e);
  }
}
```
Niatnya baik (tetap bisa simpan saat migrasi belum jalan / DB glitch sesaat), tapi untuk flow lama efeknya: **pengaman terakhir tidak ada** (lihat A1), jadi insert tetap jalan → double.

**After (usulan, BELUM diterapkan):**
- Untuk flow lama (`slot+time` kosong): **jangan telan error cek** — gagalkan dengan pesan "coba lagi", jangan insert buta. Atau bedakan: telan hanya untuk `isMissingColumnError`, selain itu lempar.
- Untuk flow baru (ada slot/time): perilaku saat ini boleh dipertahankan karena masih ada unique sebagai jaring pengaman.
- Tanpa log server (`console.warn` tidak terlihat di prod), kejadian ini tidak terlacak. Usulan observabilitas: kirim ke tabel log / Sentry, tanpa ubah flow.

---

### 3.3 [A3] Edit tanpa slot/time skip cek tabrakan total

**Before (saat ini) — `actions.ts:2616-2649`:**
```ts
const effSlot = hasSlotField && updatePayload.schedule_slot_id !== undefined
  ? updatePayload.schedule_slot_id : ownSlot;
const effTime = hasTimeField && updatePayload.schedule_time !== undefined
  ? updatePayload.schedule_time : ownTime;
if (effSlot || effTime) {
  // ... cek dayRows kecuali diri sendiri, isSlotDuplicate ...
}
```
Kalau `effSlot` dan `effTime` sama-sama `null` (baris lama), **tidak ada pengecekan sama sekali**. Edit yang memindahkan tanggal ke tanggal yang sudah punya baris lain → lolos, DB juga lolos (tidak ada unique). Client pun mengecualikan edit: `WorksheetFormModal.tsx:1237` `if (isEditing) return empty`.

**After (usulan, BELUM diterapkan):**
- Tambahkan cabang `else`: kalau tanpa slot/time, cek `ada baris lain student+date` (kecualikan diri sendiri) seperti flow lama create. Ini menyamakan aturan create vs update.
- Risiko: edit tanggal yang sebelumnya "bisa" akan mulai ditolak — itu yang benar, tapi perlu komunikasi ke guru.

---

### 3.4 Guard client hanya per-instance modal (bukan penyebab utama, tapi mempermudah double lintas jalur)

**Before (saat ini):**
- `WorksheetFormModal.tsx:1629-1630`: `if (isSubmitting || submittedRef.current) return;`
- Dikunci di `:1695-1696` sebelum `await`, dibuka lagi hanya saat gagal (`:1793,1815`), tetap terkunci 1.2 dtk saat sukses (`:1790,1813-1815`). Tombol juga `disabled` (`:3784`).
- Artinya **double-click dalam 1 modal sudah aman**. Yang tidak aman: 2 tab / 2 HP / buka modal [A] dan [B] bersamaan / refresh saat `isSubmitting` (draft belum dihapus, `localStorage.removeItem` baru di `:1748` setelah sukses) / retry setelah error jaringan yang pesannya malah menyuruh "coba tekan Simpan lagi" (`:1800-1802`) padahal insert pertama mungkin sudah commit.

**After (usulan, BELUM diterapkan):**
- Idempotency key per form-instance (UUID dikirim + unique di DB) — fix struktural, tapi butuh migrasi.
- Atau minimal: setelah sukses jangan andalkan `router.refresh` saja (jalur [B] bahkan tidak refresh) — lakukan invalidasi/refresh agar guard client tidak basi.

---

## 4. Masalah 2 — BEBERAPA ANAK TIDAK BISA SAVE

### 4.1 [B1] Baris lama memblokir semua save baru tanggal sama (false-positive dominan)

**Before (saat ini) — server `actions.ts:2347-2362`:**
```ts
function isSlotDuplicate(newSlot, newTime, rows): boolean {
  return (rows || []).some((w) => {
    const wSlot = (w?.schedule_slot_id || "").toString();
    if (newSlot) {
      if (wSlot) return wSlot === newSlot;
      return true; // <-- baris lama tanpa slot MENUTUPI tanggal itu
    }
    const wTime = normalizeScheduleTime(w?.schedule_time);
    if (wTime) return wTime === newTime;
    return true; // <-- baris lama tanpa jam MENUTUPI tanggal itu
  });
}
```
Salinan persis di client `WorksheetFormModal.tsx:1267-1278` dengan komentar "dianggap menempati tanggal itu".

**Dampak konkret:**
- Anak punya 1 baris lama (`slot NULL, time NULL`) tanggal X → save baru tanggal X **dengan slot/jam apapun** tetap ditolak `LAPORAN_SUDAH_TERISI`.
- Dari sisi guru: "anak ini tidak bisa save", padahal sistem menganggapnya "cegah double".

**After (usulan, BELUM diterapkan) — perlu keputusan produk, 2 arah berlawanan:**
| Pilihan | Efek | Konsekuensi |
|---|---|---|
| **Ketat (pertahankan)** | Baris lama tetap memblokir | Double aman, tapi anak dengan data lama tidak bisa tambah sesi sampai data lama dibersihkan/dimigrasi (backfill slot/time) |
| **Longgar (ubah `return true` → `return false` untuk baris tanpa konteks)** | Save baru dengan slot/time beda diloloskan | Anak bisa save, tapi double legacy vs baru tidak lagi dicegah di level aplikasi (hanya mengandalkan unique yang juga tidak mencakup legacy) |

Tidak ada jawaban benar tanpa data Q1/Q4. **Jangan ubah baris ini sebelum audit.**

---

### 4.2 [B2] Jalur [A] = 1 laporan per tanggal (anak 2 sesi sehari pasti gagal sesi-2)

**Before (saat ini):** lihat A1 + `WorksheetClientWrapper.tsx:909-916` (tidak kirim konteks jam). Aturan: tanggal sama = duplikat, tanpa peduli jam.

**After (usulan, BELUM diterapkan):**
- Teruskan `scheduleSlotId/scheduleTime/currentDate` dari daftar jadwal ke modal [A] seperti jalur [C], atau sediakan pemilih "sesi/jam" di modal [A]. Ini mengubah makna "double" dari per-tanggal menjadi per-jam — perlu persetujuan produk + audit slot ganda (lihat §5 Q5).

---

### 4.3 [B3] Jalur [B] kirim jam tanpa slot id

**Before (saat ini) — `DashboardStatsPanel.tsx:1210-1212`:**
```tsx
lockedStudentId={overdueStudent.id}
currentDate={missedDate}
scheduleTime={missedTime || overdueStudent?.missedTime}
```
Tanpa `scheduleSlotId`, tanpa `initialData`. Maka `duplicateInfo` (`WorksheetFormModal.tsx:1254-1259`): `effSlot = null`, `effTime = missedTime`. Kalau riwayat (`overdueWorksheets`) berisi baris tanpa `schedule_time`, kembali ke `return true` → ditolak walau jam berbeda.

**After (usulan, BELUM diterapkan):**
- Kirim juga `scheduleSlotId` bila tersedia di data overdue (atau pastikan `missedTime` selalu terisi format `HH:MM` dan konsisten dengan `normalizeScheduleTime`). Tanpa ini, B1 terus menghantui jalur [B].

---

### 4.4 [B4] Fallback tanggal diam-diam ke hari ini

**Before (saat ini) — `dateUtils.ts:117-118,175`:**
```ts
if (!inputStr || !inputStr.trim()) return getTodayISO();
// ...
return getTodayISO(); // fallback akhir
```
Dipakai di submit client (`WorksheetFormModal.tsx:1710`: `parseIndonesianDateToISO(worksheetDateInput || getTodayISO())`) dan server (`actions.ts:2369`).

**Dampak:**
- Input kosong/rusak → tersimpan sebagai **hari ini** tanpa peringatan → save berikutnya hari ini dianggap double, atau guru mencari di tanggal yang benar dan menyimpulkan "tidak save".
- `normalizeClientDate` (`WorksheetFormModal.tsx:51-54`) hanya `slice(0,10)` — mengasumsikan ISO. Format `DD-MM-YYYY` lolos karena `parseIndonesianDateToISO` menanganinya (`dateUtils.ts:130-137`), tapi format lain jatuh ke `new Date(clean)` yang rawan zona waktu.

**After (usulan, BELUM diterapkan):**
- Validasi eksplisit: tolak submit kalau tanggal kosong/invalid dengan pesan, jangan fallback. Ini perubahan kecil tapi mengubah perilaku — perlu persetujuan.

---

### 4.5 [B5] Bukan duplikat: validasi identitas / auth / RLS

- `WorksheetFormModal.tsx:1640-1644`: `if (!isEditing && !effectiveStudentId)` → `Pilih siswa terlebih dahulu`. `effectiveStudentId` (`:1634-1638`) memprioritaskan `lockedStudentId → initialData → single → state`. Di Tambah umum multi-siswa yang belum pilih, ini pemblokir yang benar.
- `actions.ts:2391-2401,2544-2552`: cek `auth.getUser()` → pesan sesi kedaluwarsa. Di HP sinyal lemah ini bisa intermiten dan terlihat seperti "kadang bisa save kadang tidak".
- Mapping error RLS/policy/42501 ada di client (`WorksheetFormModal.tsx:1806-1809`), tapi tanpa log siapa/anak mana, tidak bisa dibedakan dari duplikat.
- **Cara bedakan:** catat teks error persis (lihat §6).

---

## 5. Query Audit Read-Only (Supabase SQL Editor — hanya SELECT)

```sql
-- Q0: pastikan migrasi link jadwal sudah applied di DB prod
SELECT column_name FROM information_schema.columns
WHERE table_name = 'student_worksheets'
  AND column_name IN ('schedule_slot_id','schedule_time');
SELECT indexname FROM pg_indexes WHERE tablename = 'student_worksheets';

-- Q1: double legacy NULL+NULL (penentu A1 + B1) — kalau banyak, ini warisan
SELECT student_id, worksheet_date, COUNT(*)
FROM public.student_worksheets
WHERE schedule_slot_id IS NULL AND schedule_time IS NULL
GROUP BY student_id, worksheet_date HAVING COUNT(*) > 1
ORDER BY worksheet_date DESC LIMIT 50;

-- Q2: double slot (pasca-migrasi seharusnya 0)
SELECT student_id, worksheet_date, schedule_slot_id, COUNT(*)
FROM public.student_worksheets WHERE schedule_slot_id IS NOT NULL
GROUP BY 1,2,3 HAVING COUNT(*) > 1 LIMIT 50;

-- Q3: double time (pasca-migrasi seharusnya 0)
SELECT student_id, worksheet_date, schedule_time, COUNT(*)
FROM public.student_worksheets
WHERE schedule_slot_id IS NULL AND schedule_time IS NOT NULL
GROUP BY 1,2,3 HAVING COUNT(*) > 1 LIMIT 50;

-- Q4: bedah 1 anak + 1 tanggal bermasalah (ganti UUID & tanggal)
SELECT id, student_id, worksheet_date, schedule_slot_id, schedule_time,
       title, bulan_ke, created_at
FROM public.student_worksheets
WHERE student_id = 'UUID-ANAK' AND worksheet_date = '2026-10-10'
ORDER BY created_at;

-- Q5: cek slot.id ganda untuk 1 sesi logis (sumber double lolos unique)
SELECT date, time, class_id, COUNT(*) AS slot_count,
       array_agg(id) AS slot_ids
FROM public.schedule_slots
GROUP BY date, time, class_id HAVING COUNT(*) > 1
ORDER BY date DESC LIMIT 50;

-- Q6: anak 2 sesi sehari (kandidat korban B2 — wajar jika 2 baris beda jam)
SELECT student_id, worksheet_date, COUNT(*),
       array_agg(schedule_time) AS times,
       array_agg(schedule_slot_id) AS slots
FROM public.student_worksheets
GROUP BY student_id, worksheet_date HAVING COUNT(*) > 1
ORDER BY worksheet_date DESC LIMIT 50;
```

Interpretasi:
- Q1 banyak + Q2/Q3 kosong → double warisan + B1 dominan. Jangan ubah `return true` sebelum backfill/dedup.
- Q1 kosong + double baru muncul → fokus A1/A2/A3 (race + edit).
- Q6 dengan `times` beda tapi salah satunya ditolak → korban B2 (aturan 1/hari vs kebutuhan 2 sesi/hari).

---

## 6. Bukti yang Dibutuhkan Darimu (tanpa ini fix bisa salah sasaran)

1. **1 contoh double:** nama anak + tanggal + hasil Q4 (kolom `schedule_slot_id/schedule_time/created_at` kedua baris). Apakah keduanya NULL, atau beda slot?
2. **1 contoh gagal save:** nama anak + tanggal + **teks error persis di layar** (bedakan: `sudah terisi` vs `Pilih siswa` vs `Sesi login` vs `Izin database` vs tanpa pesan) + dari halaman mana (Laporan Perkembangan / Dashboard Terlewat / Kelola Siswa).
3. **Apakah anak yang gagal punya 2 sesi di hari yang sama**, atau punya baris lama di tanggal itu?
4. **Hasil Q0:** apakah kolom + index link jadwal sudah ada di prod? (Menentukan apakah fallback pra-migrasi `actions.ts:2420-2433,2490-2495,2663-2671` masih aktif.)
5. Opsional: isi `debug.log` / log Vercel saat kejadian (untuk melihat `Pre-check duplikat laporan dilewati` dari A2).

---

## 7. Rencana Bertahap (usulan, belum dieksekusi)

**Tahap 0 — tanpa ubah kode (sekarang):** jalankan Q0–Q6 + kumpulkan §6. Keputusan B1-longgar vs ketat dan A1-opsi-DB vs aplikasi diambil dari data, bukan tebakan.

**Tahap 1 — observabilitas tanpa ubah aturan:** log terstruktur (server) `student_id, worksheet_date, slot, time, jalur (A/B/C), hasil pre-check, duplicate vs insert` + tampilkan `slot/time` di error client agar guru bisa lapor akurat. Risiko: nol terhadap logika.

**Tahap 2 — fix terarah (pilih setelah Tahap 0):**
- Jika Q1 dominan → dedup + backfill legacy dulu, baru sentuh aturan.
- Jika race A1 → idempotency / transaksi / teruskan konteks jam dari [A].
- Jika B2 terkonfirmasi (2 sesi/hari adalah kebutuhan sah) → ubah definisi double per-jam + pastikan tidak ada slot.id ganda (Q5).

---

## 8. Risiko Jika Langsung Fix Tanpa Audit

- Mengubah `return true` → `false` (B1 longgar) tanpa dedup: double legacy tidak lagi tertahan, laporan ganda bertambah.
- Menambah unique `NULL+NULL` tanpa dedup: migrasi **gagal** (ditolak DB karena data existing melanggar).
- Menambah `slot/time` wajib di [A] tanpa cek Q5: sesi dengan `slot.id` ganda tetap lolos unique walau logis sama → double "resmi".
- Mengubah fallback tanggal (B4) tanpa sosialisasi: guru yang terbiasa tanggal otomatis hari ini akan melihat error baru.

---

## 9. Referensi File:Baris (kondisi saat didiagnosa)

- `src/lib/actions.ts:2310-2311` pesan duplikat; `:2313-2342` helper; `:2347-2362` `isSlotDuplicate`; `:2364-2523` create; `:2439-2451` flow lama; `:2452-2463` telan error; `:2484-2495` insert+fallback; `:2525-2689` update; `:2624` skip cek edit; `:2674-2676` map unique.
- `src/components/features/worksheets/WorksheetFormModal.tsx:23-38` props; `:51-54` normalisasi tanggal; `:1225-1291` `duplicateInfo`; `:1627-1816` submit; `:1800-1809` mapping pesan.
- `src/app/(dashboard)/worksheets/WorksheetClientWrapper.tsx:907-928` modal tanpa konteks jadwal.
- `src/components/features/dashboard/DashboardStatsPanel.tsx:252-282` buka overdue; `:1162-1214` modal jam-tanpa-slot.
- `src/components/features/students/ChangeLabelModal.tsx:337-364` satu-satunya jalur lengkap slot+jam.
- `src/lib/dateUtils.ts:105-176` `getTodayISO` + `parseIndonesianDateToISO` + fallback.
- `supabase/student_worksheets.sql:1-40` tabel awal; `supabase/student_worksheets_schedule_link.sql:1-53` link + partial unique + query audit.

---

*Akhir file — menunggu hasil audit §5 dan bukti §6 sebelum fix apapun.*
