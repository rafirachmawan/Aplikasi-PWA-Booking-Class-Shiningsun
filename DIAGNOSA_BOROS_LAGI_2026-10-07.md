# Diagnosa Boros Lagi — Fast Origin Transfer 9.43 / 10 GB

Tanggal: 07/10/2026
Project: Aplikasi PWA ShiningSun Penjadwalan
Akun: Rafi Rachmawan (Hobby, shared 6 project)
Sumber: screenshot Vercel 07/10/2026 + audit kode lokal

Batasan user:
- Jangan hapus/pause project lain (zubair, rafi-web-studio, website-profile-react)
- Tetap gratis, client tidak mau upgrade ke Pro
- Fokus: Fast Origin Transfer (bukan CDN Requests / Fluid CPU)

---

## 1. Status Saat Ini

- Fast Origin Transfer: **9.43 GB / 10 GB** (sisa 0.57 GB) — KRITIS
- Sebelumnya 9.11 GB (01/10) → naik **+0.32 GB / 6 hari**. Batch 1 memperlambat, tidak menghentikan.
- Fluid Active CPU: 2h 11m / 4h (tidak berubah)
- CDN Requests: 173K / 1M — aman
- Sifat limit Hobby: rolling 30 hari, bukan reset tanggal 1. Fix hari ini pun angka tidak langsung 0.

> Fast Origin Transfer = byte keluar dari Origin Vercel (SSR / RSC / API Route / Function) ke CDN/user.
> Beda dengan Fast Data Transfer = dari edge cache.

---

## 2. Kenapa Boros Lagi (Hasil Audit Kode 07/10)

### 2.1 Semua halaman tetap Dynamic via cookies() (60-70% Origin)

Hapus `force-dynamic` saja tidak bikin static, karena:

- `src/app/(dashboard)/layout.tsx:14` — komentar Batch2, tapi layout memanggil `cookies()` via `actions.ts`
- `src/lib/actions.ts:107,112,148,2919,2941,2974,3109,3121,3226,4001,4048` — 11x `cookies()`
- `src/lib/supabase/server.ts:5` — `cookies()` tiap `createClient()`

Akibat: 1x buka/refresh dashboard = origin SSR penuh:
- Layout: `syncUserIdentity, getCurrentUserRole, getBranchId, getUser, getModuleLockPasswords` + profile + branch (5-7 query)
- Page `src/app/(dashboard)/dashboard/page.tsx:163-170`: `getDashboardStats, getTodaySchedules, getClasses, getOverdueWorksheets, getActiveBranchName, getModuleLockPasswords, getStudentRulesDocuments, getCurriculumDocuments` (6-8 query)
- Total ~13 query → HTML+RSC 200-800KB selalu dari Origin.

### 2.2 cache: no-store global masih ada

- `src/lib/supabase.ts:24` — `fetch: (url, options) => fetch(url, { ...options, cache: "no-store" })`
- Memaksa semua query Supabase bypass cache. Seharusnya dihapus, ganti per-query shared (`getBranches`, `getClasses`) dengan `next: { revalidate: 60 }`.

### 2.3 /api/birthday full-scan

- `src/app/api/birthday/route.ts:61-77` — `select` semua `status=REGISTERED` tanpa `.limit()`, filter bulan di JS `:101-135`
- Cache `private, max-age=60` sudah ada (`:93,196`) — bagus, tapi payload tetap full tabel
- Dipanggil tiap mount: `BirthdayListCollapsible.tsx`, `BirthdayListPanel.tsx:73,96`

### 2.4 student-feedback GET = write-on-GET (uncacheable)

- `src/app/api/student-feedback/route.ts:178-188` — `update({is_read:true})` di dalam GET
- Plus N+1: `profiles` `:144-146` tiap GET
- Solusi: pindah mark-read ke `PATCH` baru, GET read-only

### 2.5 router.refresh() 20+ titik + revalidatePath luas

- `SchedulingClientWrapper.tsx:164,197,222,260,410,452,2250` (7x)
- `WorksheetClientWrapper.tsx:160,402,923`, `StudentClientWrapper.tsx:254,1064`, `ScheduleClientWrapper.tsx:855`
- `BranchSelector.tsx:63,67`, `BackButtonHandler.tsx:96`, `Header.tsx:30`, master managers (`TeacherManager`, `ClassManager`, `LabelManager`, `AssessmentTemplateManager`) ~8x
- `src/lib/actions.ts` ~40x `revalidatePath("/dashboard")`, `"/portal-ortu/dashboard"`, `"/worksheets"`, `"/master"` — path luas menginvalidasi cache yang baru dihemat

Tiap `refresh()` = refetch full RSC layout dari Origin.

### 2.6 /api/upload-gdrive proxy via Vercel (spike tercepat)

- `src/app/api/upload-gdrive/route.ts:169-213` — `arrayBuffer → Buffer.from → Buffer.concat → fetch googleapis multipart`
- Guard 5MB `:128,162` sudah ada, tapi hanya cap: file 5MB = ~10MB Origin (up + down)
- Pemanggil: `WorksheetFormModal.tsx:572`, `StudentRulesSection.tsx:106` — belum ada kompresi client

### 2.7 Pendukung: cron + deploy churn

- `src/app/api/cron/daily-notification/route.ts:167-178` — full-scan CG + loop push per-subscriber + `autoFillHolidayWorksheets` 4 query beruntun (makan Fluid CPU 2h11m)
- `SessionKeepAlive.tsx` aman (langsung browser → Supabase, tidak lewat Vercel)
- `git log`: ~15 deploy 25 Sep–6 Okt + `Recent Previews` di screenshot ikut makan Origin
- Kuota shared: `aplikasi-booking-class-shiningsun` + `aplikasi-pwa-...` (repo sama, satu paused tapi history tetap hitung rolling) + 4 project lain dalam 1 akun Hobby 10GB

---

## 3. Rencana Hemat (Tetap Gratis, Tanpa Sentuh Project Lain)

### P0 — Baseline tanpa coding

- [ ] Catat angka Origin sekarang dari dashboard Vercel
- [ ] Cek breakdown per-project di Usage (pastikan ShiningSun dominan)
- [ ] Stop deploy berulang, deploy 1x jam sepi
- [ ] Hapus Preview Deployments lama **milik ShiningSun saja** (bukan project lain)

### P1 — Potong Origin terbesar (1 langkah = 1 commit = 1 test)

- [ ] `birthday`: tambah `.limit(200)` + select kolom minimal + filter bulan di SQL. Header tetap `private, max-age=60` (dilarang `s-maxage` — bocor antar cabang). Test 2 cabang.
- [ ] `student-feedback`: pindah `update is_read` ke `PATCH`, GET read-only + `private, no-store`. Test buka-tutup modal.
- [ ] Hapus `supabase.ts:24` global, ganti `getBranches`/`getClasses` dengan `next: { revalidate: 60 }`. Query personal biarkan fresh.
- [ ] Kurangi `refresh()`: optimistic update di Scheduling/Worksheet/Student, hapus `refresh()` di `BackButtonHandler.tsx:96` setelah `push`, sempitkan `revalidatePath("/dashboard")` → path spesifik.

### P2 — Upload tetap GDrive tapi hemat 90%

- [ ] Validasi 5MB + tipe di client SEBELUM upload
- [ ] Kompresi canvas (max 1600px, q0.8): foto HP 4MB → ~400KB
- [ ] File: `WorksheetFormModal.tsx:572`, `StudentRulesSection.tsx:106`. Route Vercel tetap, tapi byte Origin turun drastis.

### Verifikasi akhir

1. `npm run build` hijau
2. Test: login admin + guru + portal ortu, CRUD jadwal/siswa/worksheet, upload foto+PDF, ganti cabang
3. Deploy 1x jam sepi, pantau Usage 24 jam — target Origin harian turun ≥50%

---

## 4. Jika Masih Jebol

Hobby 10GB shared 6 project memang tidak didesain untuk PWA harian guru+ortu. Karena tidak boleh upgrade, opsi gratis tersisa:

- Pindah SSR ke VPS (Contabo/IDCloudHost) + Cloudflare Tunnel gratis, Vercel hanya untuk preview
- Atau batasi pemakaian: 1 domain prod saja, matikan cron harian, batasi upload lampiran

---

## 5. Referensi File Sebelumnya

- `DIAGNOSA_VERCEL_FAST_ORIGIN_TRANSFER.md` — diagnosa awal 01/10
- `RENCANA_BATCH2_HEMAT_ORIGIN.md` — rencana Batch 2 (sebagian sudah live: headers cache, sw CacheFirst, proxy matcher, birthday private cache, upload guard 5MB)
