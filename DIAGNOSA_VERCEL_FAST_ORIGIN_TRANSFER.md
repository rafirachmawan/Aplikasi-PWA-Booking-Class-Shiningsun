# Diagnosa Vercel - Fast Origin Transfer 9.11GB / 10GB

Tanggal: 01/10/2026
Project: Aplikasi PWA ShiningSun Penjadwalan
Akun: Rafi Rachmawan (Hobby)

## 1. Status Saat Ini

- Fast Origin Transfer: 9.11 GB / 10 GB (sisa 0.89 GB) - KRITIS
- Fast Data Transfer: 8.77 GB / 100 GB - aman
- Fluid Active CPU: 2h 11m / 4h
- CDN Requests: 181K / 1M
- Function Invocations: 149K / 1M

> Fast Origin Transfer = data keluar dari Server Origin Vercel (SSR / API / Function) ke CDN/user.
> Beda dengan Fast Data Transfer = data dari Edge Cache (masih aman).

## 2. Apakah Project Akan Berhenti?

Ya, jika tembus 10GB:

- Plan Hobby tidak ada overage billing.
- Jika limit kena, Vercel pause project / block deploy otomatis.
- Pause berlaku rolling 30 hari, bukan reset tanggal 1.
- Baru jalan lagi setelah pemakaian 30-hari terakhir turun, atau upgrade Pro.
- Opsi unblock 3x satu kali dari support hanya darurat, tidak bisa diandalkan.

Catatan: usage ini 1 akun untuk 6 project, ada duplikat:

- aplikasi-booking-class-shiningsun + aplikasi-pwa-booking-class-shiningsun (repo sama)
- zubair_smart_school + zubair_smart_school1 (repo Sekolah_Islam)

## 3. Penyebab Boros (Hasil Audit Kode)

### 3.1 100% SSR Dynamic (60-70%)

- File: `src/app/(dashboard)/layout.tsx:14` + 13 pages `export const dynamic="force-dynamic"`
- 0x `revalidate` di seluruh `src/`
- Setiap buka dashboard / ganti cabang / router.refresh() = HTML+RSC 200-800KB selalu dari Origin
- `src/lib/actions.ts` full `cookies()` bikin otomatis dynamic

### 3.2 router.refresh() 20+ titik (20%)

- `SchedulingClientWrapper.tsx:164,197,222,260,410,452,2250`
- `WorksheetClientWrapper.tsx:144,386,898`
- `BranchSelector.tsx:63,67`, `BackButtonHandler.tsx:41,95`
- Setiap mutasi = refetch full RSC layout (5-6 query Supabase)

### 3.3 Service Worker NetworkFirst Semua (10%)

- File: `src/app/sw.ts:17-36`
- Override JS CacheFirst -> NetworkFirst timeout 3s
- Chunk 239KB+221KB selalu hit Origin
- `public/sw.js` saat ini 1.7KB placeholder (build prod belum generate SW Serwist)

### 3.4 /api/upload-gdrive Proxy MBs (5-10% tapi spike)

- File: `src/app/api/upload-gdrive/route.ts:121-234`
- `formData -> arrayBuffer -> Buffer.concat -> fetch googleapis`
- Upload 5MB = 10MB transfer (up+down) lewat Vercel
- Tanpa limit size, tanpa direct-upload

### 3.5 /api/birthday Full-scan (5%)

- File: `src/app/api/birthday/route.ts:61-70`
- Tanpa limit/pagination, filter bulan di JS `:96-138`
- Tanpa Cache-Control header
- Dipanggil tiap mount `BirthdayListCollapsible.tsx:59`

### 3.6 Lainnya

- `src/middleware.ts:22` matcher terlalu luas (kena prefetch RSC, /sw.js, /manifest)
- `public/logo.png 302KB` + `src/app/icon.png 295KB` tidak dikompres
- `src/lib/supabase.ts:24` `cache: no-store` global
- 9x `<img>` mentah photo_url tanpa width/height
- `next.config.ts` tanpa `images.remotePatterns/formats`, tanpa `headers()` immutable
- `vercel.json` hanya cron, tanpa headers cache

## 4. Solusi

### 4.1 Darurat - Hari Ini (Tanpa Coding)

- [ ] Hapus/disable project duplikat, sisakan 1 ShiningSun saja
- [ ] Pause zubair_*, rafi-web-studio, website-profile-react jika tidak dipakai
- [ ] Hapus Preview Deployments lama
- [ ] Stop deploy berulang hari ini
- [ ] Opsional: pindah sementara ke VPS + Cloudflare Tunnel sambil fix

### 4.2 Fix Hemat 70-80% (Butuh Coding)

- [ ] Hapus `force-dynamic` di 11 file dashboard + portal-ortu/dashboard + (dashboard)/layout, biarkan cookies()/searchParams opt-out otomatis
- [ ] Tambah `export const revalidate=60` untuk birthday-templates, `revalidate=300` untuk template global
- [ ] API birthday: `s-maxage=60, stale-while-revalidate=300` + filter bulan di SQL + limit 200
- [ ] API birthday-template get-active: `s-maxage=300`
- [ ] API push/vapid-key: `s-maxage=86400`
- [ ] Pisah student-feedback GET vs PATCH mark-read
- [ ] sw.ts: kembalikan JS ke CacheFirst, tambah SWR untuk template, NetworkFirst 5min untuk birthday
- [ ] next.config.ts + vercel.json: tambah headers immutable `/_next/static/* (1y)`, `/logo.png (1d)`, images avif/webp
- [ ] Upload: ganti WorksheetFormModal.tsx:572 jadi direct upload / Supabase Storage + limit 5MB + kompresi client
- [ ] Kurangi router.refresh(): optimistic update di Scheduling/Worksheet/StudentClientWrapper
- [ ] Sempitkan middleware matcher hanya /dashboard/*, /schedule/*, /login*, /portal-ortu/dashboard/*
- [ ] Hapus supabase.ts:24 cache:no-store global, ganti per-query revalidate:60
- [ ] Kompres logo/icon 300KB -> WebP <50KB, tambah priority/sizes di Header.tsx:78-84

### 4.3 Jangka Panjang

- Opsi A: Upgrade Pro ($20) jika tetap di Vercel + komersial
- Opsi B: Pindah SSR ke VPS (Contabo/IDCloudHost) + CDN Cloudflare gratis, Vercel hanya preview
- Hobby hanya untuk personal non-komersial, PWA harian guru+ortu tidak cocok di Hobby

## 5. Estimasi Dampak

- Hapus duplikat project: -30-40% langsung
- Hapus force-dynamic + cache API: -60-70% Origin
- Fix SW + headers immutable: -10%
- Fix upload direct: hilangkan spike 5-10MB per upload

## 6. TODO Saya (bisa dimodifikasi)

- [ ] ...
- [ ] ...
