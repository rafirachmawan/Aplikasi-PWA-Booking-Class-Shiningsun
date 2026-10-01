# Rencana Batch 2 — Hemat Origin 60-70% (Sentuh Logika, Eksekusi Besok)

> Status: RENCANA, belum dieksekusi. Batch 1 (headers cache, no-logic) sudah live.
> Prinsip Batch 2: menyentuh query, caching dinamis, dan flow refresh — wajib testing per langkah.
> Estimasi: 2-3 jam + 24 jam pantau Usage Vercel.

## 0. Pengaman Sebelum Mulai

- [ ] Pastikan Batch 1 sudah ter-deploy 1x ke prod `aplikasi-booking-class-shiningsun` dan `/login → 200`.
- [ ] Catat angka `Fast Origin Transfer` saat ini (baseline) dari dashboard Vercel.
- [ ] Buat branch baru: `git checkout -b hemat-origin-batch2`.
- [ ] Jangan deploy ke project yang paused (`aplikasi-pwa-...`). Deploy hanya ke prod hidup.
- [ ] Rollback plan: tiap langkah di-commit terpisah, kalau error tinggal `git revert` commit itu.

## 1. Hapus `force-dynamic` + Tambah `revalidate` (Dampak Terbesar)

Kondisi sekarang: 13-14 file pakai `export const dynamic = "force-dynamic"`, 0x `revalidate` di `src/`.
Akibat: 100% SSR via Origin, tiap navigasi + prefetch + `router.refresh()` = HTML+RSC baru 200-800KB.

### 1a. Hapus `force-dynamic` yang redundan (aman, logika sama)

File (hapus baris `export const dynamic = "force-dynamic"` saja, biarkan `cookies()`/`searchParams` yang opt-out otomatis):

- `src/app/(dashboard)/layout.tsx:14`
- `src/app/(dashboard)/dashboard/page.tsx:26`
- `src/app/(dashboard)/schedule/page.tsx:6`
- `src/app/(dashboard)/scheduling/page.tsx:6`
- `src/app/(dashboard)/students/page.tsx:6`
- `src/app/(dashboard)/teachers/page.tsx:5`
- `src/app/(dashboard)/worksheets/page.tsx:5`
- `src/app/(dashboard)/points/page.tsx:5`
- `src/app/(dashboard)/templates/page.tsx:5`
- `src/app/(dashboard)/master/page.tsx:5`
- `src/app/(dashboard)/birthday-templates/page.tsx:4`
- `src/app/(dashboard)/reports/students/page.tsx:7`
- `src/app/portal-ortu/dashboard/page.tsx:12`
- `src/app/login-basic/page.tsx:6`

Risiko: rendah — halaman yang baca `cookies()`/`searchParams` (`actions.ts`, schedule/scheduling) tetap dynamic otomatis. Yang murni static jadi bisa di-cache.

### 1b. Tambah `revalidate` untuk halaman jarang berubah

- `src/app/(dashboard)/birthday-templates/page.tsx` → tambah `export const revalidate = 60;`
- `src/app/(dashboard)/master/page.tsx` → tambah `export const revalidate = 300;` (cek dulu: kalau master data sering diubah admin, pakai 60)

Verifikasi: `npm run build` → tabel route harus menunjukkan sebagian jadi `○ (Static)` / ISR, bukan semua `ƒ (Dynamic)`.

## 2. `/api/birthday` — Filter di SQL + Limit + Cache Privat (Jangan Shared!)

File: `src/app/api/birthday/route.ts:60-77`

Peringatan data: route ini personal per `user + branch_id + cookie superadmin_branch_id`. **Dilarang** `s-maxage` shared (bocor antar cabang). Yang boleh: `private` + batasi payload.

- [ ] Tambah filter bulan di SQL (ganti filter JS `:96-138`): pakai RPC atau `.filter()` tanggal, atau query `date_of_birth` dengan rentang 1 bulan. Target: yang ditransfer hanya siswa ultah bulan itu, bukan semua `REGISTERED`.
- [ ] Tambah `.limit(200)` + select kolom minimal (hapus `branches`, `labels` jika tidak dipakai di UI bulan ini — cek `BirthdayListCollapsible.tsx` dulu kolom apa yang dirender).
- [ ] Tambah header: `Cache-Control: private, max-age=60` (cache per-browser 1 menit, tidak shared di edge).
- [ ] Frontend `BirthdayListCollapsible.tsx:50-80`: tambah debounce + `AbortController` agar ganti bulan cepat tidak double-fetch.

Verifikasi: buka dashboard sebagai 2 cabang berbeda → pastikan data tidak tertukar. Cek size response di DevTools Network turun (target <100KB).

## 3. Pisah `student-feedback` GET vs Tulis (Agar GET Bisa Hemat)

File: `src/app/api/student-feedback/route.ts:89-187`

Masalah: `GET` melakukan `update({is_read:true}) :183-187` (write-on-GET) sehingga tidak pernah bisa di-cache.

- [ ] Pindahkan `update is_read` ke method `PATCH` baru.
- [ ] Frontend `BirthdayListCollapsible.tsx:706-708` + `FeedbackHistoryModal`: GET tetap, lalu panggil `PATCH` sekali untuk mark-read.
- [ ] GET dikasih `Cache-Control: private, no-store` (tetap fresh tapi payload sudah kecil setelah N+1 `:144-146` dioptimasi jadi join tunggal).

Risiko: sedang — ubah kontrak API. Testing: buka-tutup modal feedback, pastikan status baca tetap berubah.

## 4. Kurangi `router.refresh()` — Optimistic Update

Tiap `refresh()` = refetch full RSC layout (5-6 query) dari Origin. Target: potong 50% panggilan.

- `SchedulingClientWrapper.tsx:164,197,222,260,410,452,2250` (7x) → ganti update lokal state dulu, `refresh()` hanya 1x setelah sukses (atau `revalidatePath` targeted di Server Action).
- `WorksheetClientWrapper.tsx:144,386,898`, `StudentClientWrapper.tsx:254,1064`, `ScheduleClientWrapper.tsx:855` → pola sama.
- `BranchSelector.tsx:63,67` → biarkan `refresh()` (ganti cabang memang butuh data baru), tapi pastikan tidak double (sekarang push + refresh berurutan).
- `BackButtonHandler.tsx:41,95` → hapus `refresh()` setelah `push` (halaman tujuan sudah fetch sendiri).
- `lib/actions.ts` ~40x `revalidatePath` → audit: ganti yang path-nya luas (`/dashboard`) jadi path spesifik (`/dashboard/schedule`), yang no-op karena tidak ada cache bisa dihapus.

Verifikasi: lakukan CRUD jadwal/siswa/worksheet di dev → UI update tanpa reload penuh, Network tab menunjukkan 1 request bukan 3-4.

## 5. Upload Langsung ke Storage (Hilangkan Spike 10MB per File)

File: `src/app/api/upload-gdrive/route.ts:121-234`, pemanggil `WorksheetFormModal.tsx:572`, `StudentRulesSection.tsx:106`

Masalah: file 2-10MB lewat Vercel 2 arah (ingress+egress). Satu rapor 5MB = ~10MB Origin.

Opsi A (disarankan, tanpa ubah akun Google): pindah lampiran ke Supabase Storage + `getPublicUrl` (pola sudah ada di `CurriculumSection.tsx:131`). Vercel hanya terima metadata.

Opsi B (tetap GDrive): browser → Google direct via resumable upload URL, Vercel hanya tukar token + simpan fileId.

- [ ] Tambah limit 5MB + validasi tipe di client SEBELUM upload.
- [ ] Tambah kompresi foto client (canvas resize max 1600px, quality 0.8) — foto HP 4MB jadi ~400KB.
- [ ] Hapus `Buffer.concat` + `fetch googleapis multipart` dari route Vercel.

Risiko: tinggi — testing wajib: upload foto + PDF sebagai admin & guru, pastikan file bisa dibuka dari laporan. Siapkan fallback: kalau gagal, kembalikan route lama (commit terpisah).

## 6. Sempitkan `middleware.ts` + Rename ke `proxy.ts`

File: `src/middleware.ts:4-23`

- [ ] Sempitkan matcher dari `/(.*)` luas menjadi hanya: `/dashboard/:path*`, `/schedule/:path*`, `/scheduling/:path*`, `/login*`, `/portal-ortu/dashboard/:path*`. Exclude: `RSC` prefetch header, `/sw.js`, `/manifest*`, `/icon.png`, `/logo.png`, `/_next/*`.
- [ ] Next 16 deprecated `middleware` → `proxy` (warning saat build kemarin). Rename file + export sesuai pesan `https://nextjs.org/docs/messages/middleware-to-proxy`. Ini perubahan konvensi framework, testing: login, session refresh, redirect `/ → /dashboard`.

Risiko: sedang-tinggi — kalau matcher salah, halaman bisa lolos auth atau sebaliknya infinite redirect. Testing checklist auth wajib (login salah, session expired, akses langsung `/dashboard` tanpa login).

## 7. Hapus `cache: no-store` Global Supabase

File: `src/lib/supabase.ts:24` — `fetch: (url,opts)=>fetch(url,{...opts,cache:"no-store"})` memaksa semua query Supabase bypass cache.

- [ ] Hapus override global tersebut.
- [ ] Ganti per-query yang datanya shared/jarang berubah (`getBranches`, `getClasses`) dengan `next: { revalidate: 60 }`.
- [ ] Query personal (jadwal hari ini, worksheet) biarkan fresh.

Risiko: sedang — kalau ada query yang diasumsikan selalu fresh, bisa tampil basi 60 detik. Review `lib/actions.ts` (panduan besok menyebut refactor ini untuk atasi connection drop — jangan kembalikan koneksi global statis, hanya ubah flag cache).

## 8. Aset: WebP + `next/image` + Fix Serwist Build

- [ ] `public/logo.png` + `src/app/icon.png` (sudah lossless 253KB di Batch 1) → convert ke WebP <50KB. Perlu ubah referensi `Header.tsx:78-84`, `manifest.ts`, `sw.ts` (`icon: "/icon.png"`) — cari semua `"icon.png"` dan `/logo.png` dulu via grep.
- [ ] 9x `<img>` mentah (`BirthdayListCollapsible.tsx:318,410,575`, `StudentWorksheetTable.tsx:860-861`, dll.) → ganti `next/image` + `width/height` + `loading="lazy"`, atau tambah dimensi eksplisit. (URL eksternal Supabase/GDrive tidak makan Origin, tapi perbaiki LCP.)
- [ ] Investigasi `public/sw.js` placeholder 1.7KB: `@serwist/next` tidak meng-inject saat build Turbopack. Cek: build dengan webpack (`next build` tanpa `turbopack:{}`?) vs update `@serwist/next` ke versi support Next 16. Jangan ubah pipeline di hari yang sama dengan langkah 1-7 — jadikan eksperimen terpisah.

## 9. Checklist Verifikasi Akhir (Wajib Sebelum Merge ke `main`)

1. `npm run build` hijau, perhatikan tabel route (harus ada yang `○`/ISR) dan tidak ada error TypeScript.
2. Tes manual: login admin + guru + portal ortu; CRUD jadwal, siswa, worksheet; upload lampiran; ganti cabang; notifikasi push.
3. Tes 2 cabang berbeda untuk `/api/birthday` (pastikan tidak bocor).
4. Deploy ke prod 1x jam sepi, pantau Usage 24 jam — target Origin harian turun ≥50%.
5. Kalau ada error: `git revert` commit langkah terkait, deploy ulang, diskusi lagi.

## 10. Urutan Eksekusi Besok (Disarankan)

| Urutan | Langkah | Risiko | Butuh Testing |
|--------|---------|--------|---------------|
| 1 | §1 force-dynamic + revalidate | Rendah | Build + buka tiap halaman |
| 2 | §4 refresh() + revalidatePath | Sedang | CRUD tiap modul |
| 3 | §2 birthday + §3 feedback | Sedang | 2 cabang + modal |
| 4 | §6 middleware/proxy | Sedang-Tinggi | Full auth checklist |
| 5 | §7 supabase cache | Sedang | Semua list + refresh |
| 6 | §5 upload direct | Tinggi | Upload foto+PDF |
| 7 | §8 aset + Serwist | Rendah-Sedang | LCP + install PWA |

> Aturan: 1 langkah = 1 commit = 1 testing. Jangan gabung §5/§6 dalam 1 deploy.
> Kalau waktu mepet: kerjakan §1 + §4 saja — itu sudah 60%+ penghematan.
