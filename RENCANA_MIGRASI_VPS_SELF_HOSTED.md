# Runbook Migrasi: Vercel + Supabase Cloud → VPS Hostinger + Coolify + Supabase Self-Hosted

> **Dokumen:** Rencana eksekusi bertahap (runbook operasional)
> **Aplikasi:** Aplikasi PWA Booking Class ShiningSun
> **Status:** Rencana — belum dieksekusi
> **Tanggal dibuat:** 4 November 2026
> **Sifat:** Dokumen ini adalah panduan operasional. Setiap fase punya titik rollback yang jelas.

---

## Daftar Isi

1. [Ringkasan & Keputusan](#1-ringkasan--keputusan)
2. [Variabel yang Harus Diisi](#2-variabel-yang-harus-diisi-todo)
3. [Inventaris Teknis (Hasil Audit Repo)](#3-inventaris-teknis-hasil-audit-repo)
4. [Arsitektur Sebelum vs Sesudah](#4-arsitektur-sebelum-vs-sesudah)
5. [Prasyarat & Backup Wajib](#5-prasyarat--backup-wajib)
6. [FASE 1 — VPS & Coolify](#6-fase-1--vps--coolify)
7. [FASE 2 — Deploy Web (Database Tetap Supabase Cloud)](#7-fase-2--deploy-web-database-tetap-supabase-cloud)
8. [FASE 3 — Cutover Domain & Briefing Admin](#8-fase-3--cutover-domain--briefing-admin)
9. [FASE 4 — Persiapan Supabase Self-Hosted](#9-fase-4--persiapan-supabase-self-hosted)
10. [FASE 5 — Migrasi Database (Malam Cutover)](#10-fase-5--migrasi-database-malam-cutover)
11. [FASE 6 — Pasca Migrasi & Perawatan](#11-fase-6--pasca-migrasi--perawatan)
12. [Lampiran](#12-lampiran)

---

## 1. Ringkasan & Keputusan

### 1.1 Kondisi Awal

| Komponen | Sekarang |
| :--- | :--- |
| **Web / Backend** | Next.js 16 (App Router) di **Vercel** (Hobby/Free) |
| **URL Produksi** | `https://aplikasi-booking-class-shiningsun.vercel.app/login` |
| **Database** | **Supabase Cloud** — project `dokunkpvpmaozozusnhk` |
| **Auth** | Supabase Auth (email + password) |
| **Storage** | Supabase Storage, bucket `kurikulum` (publik, PDF) |
| **File siswa (foto/rapor)** | **Google Drive** (DB hanya menyimpan URL) |
| **Push notification** | `web-push` + VAPID keys, tabel `push_subscriptions` |
| **Cron harian** | `vercel.json` → `/api/cron/daily-notification`, `0 22 * * *` UTC (05:00 WIB) |
| **Cron di VPS** | Sudah ada di `src/instrumentation.ts` — otomatis aktif bila `process.env.VERCEL` tidak ada |

### 1.2 Target Akhir

| Komponen | Target |
| :--- | :--- |
| **Web / Backend** | Next.js di **VPS Hostinger KVM 2** (Jakarta), dikelola **Coolify** |
| **Database** | **Supabase self-hosted** di VPS yang sama (Postgres + GoTrue + PostgREST + Storage) |
| **Domain** | Domain baru (gratis 1 tahun dari Hostinger) — **isi di §2** |
| **SSL** | Let's Encrypt otomatis via Coolify/Traefik |
| **Cron** | `instrumentation.ts` (sudah siap, tidak perlu cron eksternal) |
| **Biaya** | ± **Rp 151.900/bln** (KVM 2, promo 24 bulan) — perpanjangan ± Rp 232.900/bln |

### 1.3 Prinsip Eksekusi

> **SATU FASE = SATU PERUBAHAN.**
> Kalau satu fase gagal, kamu harus tahu persis komponen mana yang salah.

1. **Fase 2 dulu, database belum disentuh.** Web pindah ke VPS sementara database tetap di Supabase Cloud. Nol risiko data.
2. **Database dipindah paling akhir**, dalam satu jendela maintenance yang terkunci (write-freeze).
3. **Vercel & Supabase Cloud tidak dihapus** sampai 30 hari setelah migrasi selesai.
4. **Supabase Cloud tidak pernah ditulis** selama migrasi — hanya dibaca. Jadi selalu utuh sebagai cadangan.
5. Setiap fase punya **rollback < 10 menit**.

### 1.4 Estimasi Waktu

| Fase | Estimasi | Downtime | Risiko |
| :--- | :--- | :--- | :--- |
| Fase 1 — VPS & Coolify | 45–60 menit | 0 | Rendah |
| Fase 2 — Deploy web | 1–2 jam (termasuk uji) | 0 | Rendah |
| Fase 3 — Cutover domain | 30 menit | 5–15 menit (propagasi DNS) | Rendah, rollback cepat |
| Fase 4 — Persiapan Supabase self-hosted | 2–3 jam (bisa dicicil) | 0 | Sedang |
| Fase 5 — Migrasi database | 60–90 menit (malam) | **60–90 menit** | **Sedang–Tinggi** |
| Fase 6 — Pasca & bersih-bersih | 30 menit + 30 hari tunggu | 0 | Rendah |

**Total kerja aktif:** ± 2–3 malam santai.

---

## 2. Variabel yang Harus Diisi (TODO)

> Isi tabel ini sebelum mulai. Ganti semua placeholder `<...>` di dokumen ini.

| Variabel | Nilai | Keterangan |
| :--- | :--- | :--- |
| `DOMAIN` | `<ISI_DI_SINI>` | Contoh: `shiningsun-booking.com` |
| `DOMAIN_WEB` | `https://<DOMAIN>` | Aplikasi utama |
| `DOMAIN_UJI` | `https://app.<DOMAIN>` | Untuk uji coba sebelum cutover |
| `DOMAIN_API` | `https://api.<DOMAIN>` | Endpoint Supabase self-hosted |
| `IP_VPS` | `<ISI_DI_SINI>` | IP publik VPS Hostinger |
| `JAM_MULAI` | `<ISI_DI_SINI>` | Jam mulai maintenance, mis. `22:00 WIB` |
| `JAM_SELESAI` | `<ISI_DI_SINI>` | Jam target selesai, mis. `23:30 WIB` |
| `TANGGAL_CUTOVER` | `<ISI_DI_SINI>` | Mis. Sabtu, 15 November 2026 |
| `IP_RUMAH` | `<ISI_DI_SINI>` | IP publik kamu (untuk whitelist dashboard Coolify) |

**Cara cek IP publik:** buka https://ifconfig.me

### 2.1 Data yang Harus Diambil dari Supabase Cloud

Ambil **sebelum** memulai Fase 4. Simpan di password manager / catatan terenkripsi.

| Data | Lokasi di Dashboard Supabase | Dipakai untuk |
| :--- | :--- | :--- |
| **JWT Secret** | Project Settings → API → JWT Settings | Kunci agar password & key lama tetap valid |
| **anon key** | Project Settings → API → Project API keys | Sudah ada di `.env.local` |
| **service_role key** | Project Settings → API → Project API keys | Sudah ada di `.env.local` |
| **Connection string (Session pooler)** | Project Settings → Database → Connection string | Untuk `pg_dump` |
| **Versi Postgres** | Project Settings → Infrastructure | Menentukan image Docker |
| **Project ref / region** | Project Settings → General | Catatan |

> ⚠️ **Jangan pernah** commit JWT Secret atau service_role key ke Git.

---

## 3. Inventaris Teknis (Hasil Audit Repo)

### 3.1 Stack

```
Next.js 16.2.10 (App Router) + React 19 + TypeScript
PWA: Serwist 9.5 (@serwist/next)  → src/app/sw.ts → public/sw.js
Tailwind CSS 4
Supabase: @supabase/ssr 0.12 + @supabase/supabase-js 2.110
Push: web-push 3.6.7
Arsitektur data: dominan Server Actions (src/lib/actions/*)
```

### 3.2 Environment Variables (11 variabel)

| Nama | Sifat | Berubah saat pindah web? | Berubah saat pindah DB? |
| :--- | :--- | :---: | :---: |
| `NEXT_PUBLIC_SUPABASE_URL` | Publik, **inline saat build** | ❌ | ✅ `https://api.<DOMAIN>` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publik, **inline saat build** | ❌ | ❌ (key lama dipakai ulang) |
| `SUPABASE_SERVICE_ROLE_KEY` | Rahasia (server) | ❌ | ❌ (key lama dipakai ulang) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Publik, **inline saat build** | ❌ | ❌ |
| `VAPID_PRIVATE_KEY` | Rahasia | ❌ | ❌ |
| `VAPID_SUBJECT` | — | ❌ | ❌ |
| `CRON_SECRET` | Rahasia | ❌ | ❌ |
| `GOOGLE_OAUTH_CLIENT_ID` | Semi-publik | ❌ | ❌ |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Rahasia | ❌ | ❌ |
| `GOOGLE_DRIVE_FOLDER_ID` | — | ❌ | ❌ |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Rahasia | ❌ | ❌ |

> 🔴 **PENTING — `NEXT_PUBLIC_*` di-inline saat `next build`.**
> Mengubah nilainya di Coolify **tidak cukup dengan restart** — **wajib Rebuild**.
> Ini sumber bug paling umum saat pindah.

### 3.3 Titik yang Terikat pada Origin/Domain

| Item | Berkas | Dampak kalau domain berubah |
| :--- | :--- | :--- |
| **Service Worker PWA** | `src/app/sw.ts` | PWA terinstall di origin lama tidak otomatis pindah → admin harus install ulang |
| **Push subscription** | tabel `push_subscriptions` | Subscription lama terikat origin lama → admin klik "aktifkan notif" lagi |
| **Google OAuth redirect** | `src/app/api/auth/gdrive/callback/route.ts:37-38` | Memakai `req.nextUrl.origin` (tidak hardcode) → cukup daftarkan URI baru di Google Cloud Console |
| **Supabase Auth URL** | Dashboard Supabase | Tambahkan domain baru |
| **URL file kurikulum** | tabel `curriculum_documents.file_url` | URL absolut `...supabase.co/storage/...` → **harus di-rewrite** saat pindah DB |

### 3.4 Berkas/Rute yang Perlu Diperhatikan

| Path | Peran |
| :--- | :--- |
| `src/instrumentation.ts` | Cron harian mode VPS. Skip otomatis bila `process.env.VERCEL` ada |
| `src/proxy.ts` | Middleware Next 16 (refresh session Supabase) |
| `src/app/api/cron/daily-notification/route.ts` | Endpoint cron, butuh header `Authorization: Bearer <CRON_SECRET>` |
| `src/components/features/dashboard/CurriculumSection.tsx` | Satu-satunya pemakaian Supabase Storage **dari browser** → butuh `DOMAIN_API` yang bisa diakses publik |
| `vercel.json` | Berisi cron + header khusus Vercel (**tidak berlaku di VPS**) |
| `next.config.ts` | Header cache untuk `logo.png`, `sw.js`, dll (tetap berlaku di VPS) |

### 3.5 Ringkasan: Apakah Perlu Ubah Kode?

| Fase | Perubahan kode |
| :--- | :--- |
| Web pindah ke VPS | **Tidak ada** |
| DB pindah ke self-hosted | **Tidak ada** (cukup env + rebuild) |
| Opsional (perbaikan) | Pindahkan header dari `vercel.json` → `next.config.ts`; tambah `output: 'standalone'` bila pakai Dockerfile |

---

## 4. Arsitektur Sebelum vs Sesudah

### Sebelum

```mermaid
flowchart LR
    U["Admin (tablet)"] -->|HTTPS| V["Vercel — Next.js"]
    V -->|HTTP + egress| S["Supabase Cloud<br/>Auth · PostgREST · Storage"]
    V -->|API| G["Google Drive"]
    V -.->|cron 05:00 WIB| P["Push Service"]
```

### Sesudah (target)

```mermaid
flowchart LR
    U["Admin (tablet)"] -->|HTTPS| T["Traefik (Coolify)"]
    T --> W["Next.js container"]
    T --> K["Supabase Kong<br/>api.domain"]
    W -->|internal Docker<br/>tanpa egress| DB["Postgres<br/>public · auth · storage"]
    K --> DB
    W -->|API| G["Google Drive"]
    W -.->|cron internal| P["Push Service"]
```

### Fase antara (setelah Fase 2, sebelum Fase 5)

```mermaid
flowchart LR
    U["Admin"] -->|HTTPS| T["Traefik (VPS)"]
    T --> W["Next.js di VPS"]
    W -->|egress internet<br/>150–350 ms| S["Supabase Cloud<br/>(database TETAP di sini)"]
    W -->|API| G["Google Drive"]
```

---

## 5. Prasyarat & Backup Wajib

### 5.1 Checklist Prasyarat

- [ ] VPS Hostinger KVM 2 aktif (2 vCPU / 8 GB / 100 GB NVMe), lokasi **Indonesia**
- [ ] Domain terdaftar dan DNS zone bisa diakses di hPanel
- [ ] Akses root/SSH ke VPS
- [ ] Akses ke Vercel (project owner)
- [ ] Akses ke Supabase Dashboard (project owner)
- [ ] Akses ke Google Cloud Console (OAuth client)
- [ ] Daftar nomor WA admin cabang untuk pengumuman
- [ ] Sudah membaca §10 (Fase 5) **sampai habis** sebelum eksekusi malam

### 5.2 Backup Wajib (Lakukan SEBELUM apa pun)

> **Aturan: backup yang belum pernah di-restore bukan backup.**

```bash
# 1. Simpan semua env (di laptop, JANGAN di Git)
cp .env.local ~/backup-shiningsun/env.local.bak

# 2. Dump database Supabase Cloud (jalankan dari laptop)
#    Ambil connection string: Project Settings → Database → Session pooler
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres'

pg_dump --schema=public --schema=auth --schema=storage \
        --no-owner --no-privileges \
        -f backup-$(date +%Y%m%d).sql "$SUPABASE_DB_URL"

# 3. Verifikasi file dump tidak kosong dan tidak terpotong
ls -lh backup-*.sql
tail -5 backup-$(date +%Y%m%d).sql   # harus ada baris penutup "-- PostgreSQL database dump complete"
grep -c "COPY " backup-$(date +%Y%m%d).sql   # hitung blok data

# 4. Simpan di 2 tempat: laptop + Google Drive
```

- [ ] `backup-YYYYMMDD.sql` tersimpan di 2 tempat
- [ ] Sudah dicek: ada penanda `PostgreSQL database dump complete` di akhir file
- [ ] Ukuran file masuk akal (bukan 0 byte)

### 5.3 Uji Restore (di laptop, sekali saja)

```bash
# Butuh Postgres lokal (Docker)
docker run -d --name pgtest -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:15

sleep 5
psql "postgresql://postgres:test@localhost:5433/postgres" -f backup-YYYYMMDD.sql

# Cek jumlah tabel
psql "postgresql://postgres:test@localhost:5433/postgres" \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"

docker rm -f pgtest
```

- [ ] Restore berhasil tanpa error fatal
- [ ] Jumlah tabel sesuai

---

## 6. FASE 1 — VPS & Coolify

> **Tujuan:** VPS siap menerima aplikasi.
> **Downtime:** 0. **Rollback:** hapus VPS (tidak ada yang terpengaruh).

### 6.1 Sewa VPS

| Setting | Nilai |
| :--- | :--- |
| Paket | **KVM 2** |
| Lokasi | **Indonesia (Jakarta)** — pilih saat setup, **tidak bisa diubah setelah aktif** |
| OS Template | **Ubuntu 24.04 dengan Coolify** (kalau tersedia) / Ubuntu 24.04 LTS |
| Backup | Aktifkan (Hostinger: backup mingguan gratis) |

- [ ] VPS aktif
- [ ] Catat `IP_VPS`

### 6.2 Login Pertama & Hardening

```bash
# Dari laptop
ssh root@IP_VPS

# 1. Update sistem
apt update && apt upgrade -y

# 2. Buat user non-root
adduser rafi
usermod -aG sudo rafi

# 3. Buat SSH key dari laptop (buka terminal BARU di laptop, bukan di VPS)
#    ssh-keygen -t ed25519 -C "rafi-vps"
#    ssh-copy-id rafi@IP_VPS

# 4. Tes login user baru (terminal baru)
#    ssh rafi@IP_VPS

# 5. Baru setelah login user baru berhasil, kunci root & password login
#    sudo nano /etc/ssh/sshd_config
#      PermitRootLogin no
#      PasswordAuthentication no
#    sudo systemctl restart ssh
```

### 6.3 Firewall (UFW)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirect ke HTTPS + Let's Encrypt)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8000/tcp    # Dashboard Coolify (SEMENTARA, akan dikunci di §6.6)
sudo ufw allow 6001/tcp    # Coolify realtime
sudo ufw allow 6002/tcp    # Coolify terminal
sudo ufw enable
sudo ufw status verbose
```

### 6.4 Swap 4 GB (wajib untuk 2 vCPU)

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verifikasi
free -h
swapon --show

# Kurangi agresivitas swap (opsional, untuk server dengan RAM besar)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

- [ ] `free -h` menunjukkan Swap 4.0Gi

### 6.5 Install Coolify

```bash
# Kalau VPS dibuat TANPA template Coolify:
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Proses 3–10 menit (paling lama pull image). Setelah selesai akan muncul:

```
Coolify is ready!
Public IPv4  http://IP_VPS:8000
```

- [ ] Buka `http://IP_VPS:8000`
- [ ] Daftar akun admin (email + password kuat) — **user pertama otomatis super admin**
- [ ] Simpan kredensial di password manager
- [ ] Onboarding: **Servers → + Add → Localhost → Validate Server**

### 6.6 Kunci Dashboard Coolify

```bash
# Ganti IP_RUMAH dengan IP publik kamu (cek di https://ifconfig.me)
sudo ufw delete allow 8000/tcp
sudo ufw allow from IP_RUMAH/32 to any port 8000
sudo ufw status numbered
```

> Kalau IP kamu dinamis, pertimbangkan Cloudflare Tunnel untuk dashboard,
> dan **jangan** biarkan port 8000 terbuka ke publik.

- [ ] Port 8000 hanya bisa diakses dari IP kamu
- [ ] Dashboard masih bisa dibuka

### 6.7 Backup Konfigurasi Coolify

```bash
# File ini berisi encryption key & secret Coolify.
# Kalau hilang, semua konfigurasi hilang.
sudo cat /data/coolify/source/.env
# Salin isinya ke password manager / file terenkripsi di laptop
```

- [ ] Isi `/data/coolify/source/.env` tersimpan di tempat aman

### 6.8 Konfigurasi Awal Coolify

| Menu | Setting |
| :--- | :--- |
| Settings → Instance Settings → **Instance Domain** | `https://coolify.<DOMAIN>` (opsional, setelah DNS siap) |
| Settings → **Backup** | Arahkan ke S3/Google Drive bila tersedia |
| Server → Localhost → **Docker Cleanup** | Aktifkan (hapus image lama otomatis, penting untuk disk 100 GB) |

---

## 7. FASE 2 — Deploy Web (Database Tetap Supabase Cloud)

> **Tujuan:** Aplikasi berjalan penuh di VPS, **tanpa menyalin data apa pun**.
> **Downtime:** 0 (admin masih memakai Vercel).
> **Rollback:** hapus aplikasi di Coolify. Supabase Cloud tidak tersentuh.

### 7.1 Siapkan DNS Uji Coba

Di hPanel → **Domains → DNS Zone Editor**, tambahkan:

| Type | Name | Points to | TTL |
| :--- | :--- | :--- | :--- |
| `A` | `app` | `IP_VPS` | `300` |

> Jangan arahkan `@` dan `www` dulu. Itu dilakukan di Fase 3.

- [ ] `app.<DOMAIN>` mengarah ke IP VPS (cek: `nslookup app.<DOMAIN>`)

### 7.2 Buat Aplikasi di Coolify

1. Coolify → **+ New Resource → Application → Public Repository**
2. Isi:

| Field | Nilai |
| :--- | :--- |
| Repository | URL repo GitHub `Aplikasi-PWA-Booking-Class-Shiningsun` |
| Branch | `main` |
| Build Pack | **Nixpacks** |
| Ports Exposes | `3000` |
| Base Directory | `/` |

3. **Build Command** (default Nixpacks sudah benar, tapi pastikan):
   ```
   npm ci && npm run build
   ```
4. **Start Command**:
   ```
   npm run start
   ```
5. **Domains**: `https://app.<DOMAIN>`
6. Centang **HTTPS** (Let's Encrypt)

> **Kenapa Nixpacks, bukan Dockerfile?**
> Nixpacks mendeteksi Next.js otomatis. Tidak perlu menambah Dockerfile ke repo,
> jadi **nol perubahan kode** di fase ini. Dockerfile bisa ditambahkan nanti
> kalau butuh kontrol lebih (mis. `output: 'standalone'`).

### 7.3 Environment Variables

Isi di Coolify → tab **Environment Variables**.
Salin **persis** dari `.env.local`. **Jangan** tambahkan tanda kutip.

```env
NEXT_PUBLIC_SUPABASE_URL=https://dokunkpvpmaozozusnhk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dari .env.local>
SUPABASE_SERVICE_ROLE_KEY=<dari .env.local>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<dari .env.local>
VAPID_PRIVATE_KEY=<dari .env.local>
VAPID_SUBJECT=mailto:admin@shiningsun.com
CRON_SECRET=<dari .env.local>
GOOGLE_OAUTH_CLIENT_ID=<dari .env.local>
GOOGLE_OAUTH_CLIENT_SECRET=<dari .env.local>
GOOGLE_DRIVE_FOLDER_ID=<dari .env.local>
GOOGLE_DRIVE_REFRESH_TOKEN=<dari .env.local>
```

Tambahan (bukan dari `.env.local`, tapi penting):

```env
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=4096
```

- [ ] 11 variabel tersalin
- [ ] `NODE_OPTIONS` terisi (mencegah OOM saat build di 2 vCPU)
- [ ] Tidak ada spasi di awal/akhir nilai

### 7.4 Pengaturan Replica

| Setting | Nilai | Alasan |
| :--- | :--- | :--- |
| **Replicas** | **1** | `instrumentation.ts` menjalankan cron di dalam proses Node. Kalau 2 replica → notifikasi terkirim 2x |

- [ ] Replicas = 1

### 7.5 Deploy

Klik **Deploy**. Pantau log build:

```
✓ Compiled successfully
✓ Generating static pages
✓ Build completed
```

- [ ] Build selesai tanpa error
- [ ] Status aplikasi **Running (healthy)**
- [ ] `https://app.<DOMAIN>/login` terbuka, ada ikon gembok (SSL valid)

> **Kalau build gagal dengan `Killed` / `out of memory`:**
> tambah swap (§6.4), pastikan `NODE_OPTIONS=--max-old-space-size=4096`,
> lalu Deploy ulang.

### 7.6 Daftarkan Redirect URI Google OAuth

Karena origin berubah dari `vercel.app` ke domain baru:

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
2. Pilih OAuth 2.0 Client ID milik aplikasi
3. **Authorized redirect URIs → + Add URI**:
   ```
   https://app.<DOMAIN>/api/auth/gdrive/callback
   ```
   (nanti saat cutover, tambahkan juga `https://<DOMAIN>/api/auth/gdrive/callback`)
4. **Save**

- [ ] URI `app.` sudah ditambahkan (jangan hapus URI vercel.app dulu)

### 7.7 Tambahkan URL ke Supabase Auth

Supabase Dashboard → **Authentication → URL Configuration**:

| Field | Nilai |
| :--- | :--- |
| Site URL | `https://app.<DOMAIN>` (sementara; nanti diubah ke `https://<DOMAIN>`) |
| Redirect URLs | `https://app.<DOMAIN>/**` |

- [ ] Tersimpan

### 7.8 Verifikasi Cron (Jebakan Dobel)

**Masalah:** `vercel.json` masih punya cron `0 22 * * *`. Sementara `instrumentation.ts`
di VPS **juga** menjalankan cron yang sama. Keduanya membaca tabel
`push_subscriptions` yang **sama** → **admin menerima notifikasi 2x**.

**Solusi (lakukan sekarang, jangan ditunda):**

Pilih salah satu:

**Opsi A (paling mudah):** Vercel → Project → Settings → Advanced → **Pause Project**.
→ Vercel berhenti total, tidak ada cron, tidak ada build dobel.
→ Admin yang masih buka `...vercel.app` akan lihat halaman "project paused". Ini **diharapkan**.

**Opsi B (kalau perlu Vercel tetap hidup):** hapus blok `crons` di `vercel.json`, commit, deploy ulang.

- [ ] Vercel cron sudah dimatikan
- [ ] Tes cron VPS manual:

```bash
curl -i -H "Authorization: Bearer <CRON_SECRET>" https://app.<DOMAIN>/api/cron/daily-notification
```

Harapan: HTTP 200, log di Coolify menampilkan proses pengiriman, dan (
jika dijalankan menjelang jadwal) push sampai ke HP.

> ⚠️ Cron ini mengirim notifikasi nyata ke semua admin. Jalankan hanya
> kalau kamu siap. Untuk tes aman, cek log saja tanpa menyentuh production.

### 7.9 Checklist Uji Fungsional (WAJIB — jangan lanjut sebelum semua ✅)

Gunakan **akun uji**, bukan akun super admin produksi.

| # | Fitur | Cara Uji | ✅ |
| :--- | :--- | :--- | :--- |
| 1 | Login | Login dengan akun uji, cek masuk dashboard | ☐ |
| 2 | Proteksi sesi | Buka `/dashboard` tanpa login (incognito) → harus redirect ke login | ☐ |
| 3 | Logout | Klik logout → kembali ke halaman login | ☐ |
| 4 | Data siswa | Buka daftar siswa, cari 1 siswa, buka detail | ☐ |
| 5 | Jadwal | Buka halaman jadwal, lihat 1 minggu penuh | ☐ |
| 6 | Simpan jadwal | Tambah 1 jadwal → cek di Supabase Cloud, barisnya muncul | ☐ |
| 7 | Generate otomatis | Generate 1 bulan → cek jumlah sesi masuk | ☐ |
| 8 | Guru / label | Buka master data guru & label | ☐ |
| 9 | Poin siswa | Tambah/kurangi poin 1 siswa | ☐ |
| 10 | Worksheet | Upload 1 foto → **pastikan masuk ke Google Drive** | ☐ |
| 11 | Lihat PDF worksheet | Buka file yang baru diupload | ☐ |
| 12 | Dokumen kurikulum | Upload 1 PDF → **ini tes Supabase Storage dari browser** | ☐ |
| 13 | Hapus dokumen | Hapus PDF tadi → file ikut terhapus | ☐ |
| 14 | Rapor | Generate rapor 1 siswa | ☐ |
| 15 | Portal ortu | Buka `/portal-ortu` dengan kode siswa | ☐ |
| 16 | Push notif | Klik "aktifkan notifikasi" → cek `push_subscriptions` bertambah | ☐ |
| 17 | PWA install | Buka di HP → Add to Home Screen → buka dari ikon | ☐ |
| 18 | Offline shell | Matikan internet → buka PWA → masih tampil shell | ☐ |
| 19 | Session refresh | Diamkan 1 jam, lalu klik menu → masih login (proxy refresh) | ☐ |
| 20 | Log server | Coolify → Logs: tidak ada error berulang | ☐ |

**Semua ✅ → Fase 2 selesai. Kalau ada ❌, perbaiki dulu. Jangan lanjut.**

---

## 8. FASE 3 — Cutover Domain & Briefing Admin

> **Tujuan:** Domain utama mengarah ke VPS.
> **Downtime:** 5–15 menit (propagasi DNS).
> **Rollback:** hapus record `@` & `www` → Vercel aktif lagi (jika belum dihapus).

### 8.1 Tambah DNS Domain Utama

hPanel → **Domains → DNS Zone Editor**:

| Type | Name | Points to | TTL |
| :--- | :--- | :--- | :--- |
| `A` | `@` | `IP_VPS` | `300` |
| `A` | `www` | `IP_VPS` | `300` |

- [ ] Kedua record ditambahkan
- [ ] Cek propagasi: `nslookup <DOMAIN>` → IP_VPS

### 8.2 Daftarkan Domain Utama di Coolify

Aplikasi Next.js → **Domains** → tambahkan baris baru:

```
https://<DOMAIN>,https://www.<DOMAIN>
```

- [ ] SSL untuk domain utama terbit (ikon gembok hijau)
- [ ] `https://<DOMAIN>/login` terbuka normal

### 8.3 Update Semua Konfigurasi Eksternal

| Lokasi | Ubah menjadi |
| :--- | :--- |
| Google Cloud Console → Authorized redirect URIs | tambah `https://<DOMAIN>/api/auth/gdrive/callback` |
| Supabase → Authentication → Site URL | `https://<DOMAIN>` |
| Supabase → Redirect URLs | `https://<DOMAIN>/**` |

- [ ] 3 konfigurasi di atas diperbarui

### 8.4 Briefing Admin (kirim H-1 dan H-0)

**Template WA — H-1:**

> Assalamualaikum Bapak/Ibu,
>
> Mulai besok, aplikasi jadwal ShiningSun pindah ke alamat baru:
> **https://<DOMAIN>**
>
> Mohon lakukan ini besok pagi:
> 1. Buka **https://<DOMAIN>** di browser HP/tablet
> 2. Login seperti biasa (email & password tetap sama)
> 3. Klik menu browser → **"Tambahkan ke layar utama" / "Install App"**
> 4. Setelah aplikasi terbuka dari ikon baru, klik **"Aktifkan Notifikasi"** sekali
> 5. **Hapus ikon aplikasi yang lama** (yang alamatnya vercel.app)
>
> Data tidak berubah, tidak ada yang hilang. Terima kasih.

**Template WA — H-0 (pagi setelah cutover):**

> Aplikasi sudah pindah ke **https://<DOMAIN>** ✅
> Alamat lama sudah tidak dipakai. Mohon install ulang ikon di layar utama
> sesuai langkah kemarin. Kalau ada kendala, hubungi saya.

- [ ] Pesan H-1 terkirim
- [ ] Pesan H-0 terkirim

### 8.5 Pantau 3–7 Hari

| Yang dipantau | Cara | Target |
| :--- | :--- | :--- |
| RAM / CPU | Coolify → Server → Metrics | RAM < 6 GB, CPU < 70% |
| Error log | Coolify → Application → Logs | Tidak ada error berulang |
| Disk | `df -h` | < 80% |
| Admin komplain | Grup WA | Nol keluhan fungsional |

**Kalau ada masalah berat:** lihat §12.6 (Rollback Fase 3).

---

## 9. FASE 4 — Persiapan Supabase Self-Hosted

> **Tujuan:** Supabase self-hosted siap dan **sudah berisi data**, tapi aplikasi produksi
> **belum** memakainya. Bisa dikerjakan siang hari, dicicil.
> **Downtime:** 0.
> **Rollback:** hapus service Supabase di Coolify.

### 9.1 Tambah DNS untuk API

| Type | Name | Points to | TTL |
| :--- | :--- | :--- | :--- |
| `A` | `api` | `IP_VPS` | `300` |

> Subdomain ini **wajib publik**, karena browser admin mengunggah dokumen
> kurikulum langsung ke Supabase Storage (lihat `CurriculumSection.tsx`).

- [ ] `api.<DOMAIN>` resolve ke IP VPS

### 9.2 Deploy Service Supabase di Coolify

1. Coolify → **+ New Resource → Service → Supabase**
2. Tunggu semua container dibuat. Daftar container:
   `supabase-db`, `supabase-kong`, `supabase-auth`, `supabase-rest`,
   `supabase-storage`, `supabase-imgproxy`, `supabase-meta`, `supabase-studio`,
   `supabase-supavisor`, `supabase-realtime`, `supabase-analytics`, `supabase-vector`

### 9.3 Hemat RAM — Matikan yang Tidak Dipakai

Aplikasi ini **tidak** memakai: analytics, realtime, edge functions.

| Container | Aksi | Hemat |
| :--- | :--- | :--- |
| `supabase-analytics` | Stop | ~250 MB |
| `supabase-vector` | Stop | ~150 MB |
| `supabase-realtime` | Stop | ~100 MB |
| `supabase-studio` | Stop setelah setup selesai (opsional) | ~150 MB |

> Setelah dimatikan, pastikan `supabase-kong` tetap sehat
> (Kong punya `depends_on: analytics` — kalau Kong ikut mati, biarkan analytics jalan
> dengan `healthcheck` tetap aktif, atau ubah dependency-nya).

- [ ] RAM terpakai turun (cek `free -h`)

### 9.4 🔴 Samakan Identitas dengan Project Lama

**Ini langkah paling kritis di seluruh migrasi.** Tanpa ini, semua user harus
reset password dan kode harus diubah.

Di Coolify → Service Supabase → **Environment Variables**, ubah:

| Variabel | Nilai | Kenapa |
| :--- | :--- | :--- |
| `SERVICE_PASSWORD_JWT` | **JWT Secret project lama** | Agar token lama tetap valid, password user ikut pindah |
| `SERVICE_SUPABASEANON_KEY` | **anon key lama** (dari `.env.local`) | Agar `NEXT_PUBLIC_SUPABASE_ANON_KEY` tidak perlu diubah |
| `SERVICE_SUPABASESERVICE_KEY` | **service_role key lama** | Agar `SUPABASE_SERVICE_ROLE_KEY` tidak perlu diubah |

> **Cara mendapatkan JWT Secret lama:**
> Supabase Cloud → Project Settings → API → JWT Settings → **JWT Secret** → Reveal.

- [ ] `SERVICE_PASSWORD_JWT` = JWT Secret lama
- [ ] `SERVICE_SUPABASEANON_KEY` = anon key lama
- [ ] `SERVICE_SUPABASESERVICE_KEY` = service_role key lama
- [ ] Restart service Supabase

### 9.5 Set URL Publik Supabase

| Variabel | Nilai |
| :--- | :--- |
| `SERVICE_URL_SUPABASEKONG` / domain service | `https://api.<DOMAIN>` |
| `SUPABASE_PUBLIC_URL` | `https://api.<DOMAIN>` |
| `API_EXTERNAL_URL` (GoTrue) | `https://api.<DOMAIN>` |
| `SITE_URL` (GoTrue) | `https://<DOMAIN>` |
| `ADDITIONAL_REDIRECT_URLS` | `https://<DOMAIN>,https://app.<DOMAIN>` |

- [ ] Service Supabase punya domain `https://api.<DOMAIN>` dengan SSL valid
- [ ] `https://api.<DOMAIN>/rest/v1/` merespons (boleh 401/404, yang penting bukan error SSL)

### 9.6 Restore Data Uji Coba

```bash
# Di laptop, arahkan ke Postgres self-hosted.
# Cara termudah: buka port sementara lewat SSH tunnel (JANGAN buka 5432 ke publik)
ssh -L 5433:localhost:5432 rafi@IP_VPS
```

Lalu di terminal lain:

```bash
# Ambil password postgres dari Coolify → Service Supabase → Environment Variables
# (POSTGRES_PASSWORD / SERVICE_PASSWORD_POSTGRES)
psql "postgresql://postgres:<password>@localhost:5433/postgres" -f backup-YYYYMMDD.sql
```

**Kalau restore `auth` schema gagal** (perbedaan versi GoTrue):

```bash
# Restore hanya public + storage; auth dibuat ulang oleh GoTrue
pg_dump --schema=public --no-owner --no-privileges -f public-only.sql "$SUPABASE_DB_URL"
psql "$SELFHOST_DB_URL" -f public-only.sql
```

→ Lalu user dibuat ulang lewat Supabase Studio / Admin API, dan password
direset sekali. **Ini fallback yang bisa diterima** kalau jumlah user sedikit.

- [ ] Restore selesai tanpa error fatal
- [ ] `SELECT count(*) FROM public.students;` mengembalikan angka wajar

### 9.7 Migrasi File Storage (bucket `kurikulum`)

Bucket bersifat **publik**, jadi kita bisa salin langsung via SDK.
Buat file sementara `scripts/migrate-storage.mjs` (jangan di-commit):

```js
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'

const OLD_URL = 'https://dokunkpvpmaozozusnhk.supabase.co'
const OLD_KEY = process.env.OLD_SERVICE_ROLE_KEY
const NEW_URL = 'https://api.<DOMAIN>'
const NEW_KEY = process.env.NEW_SERVICE_ROLE_KEY
const BUCKET  = 'kurikulum'

const oldDb = createClient(OLD_URL, OLD_KEY)
const newDb = createClient(NEW_URL, NEW_KEY)

const { data: files, error } = await oldDb.storage.from(BUCKET).list('', { limit: 1000 })
if (error) throw error

console.log(`Ditemukan ${files.length} file`)

for (const f of files) {
  const { data: blob, error: dlErr } = await oldDb.storage.from(BUCKET).download(f.name)
  if (dlErr) { console.error('GAGAL download', f.name, dlErr.message); continue }

  const buf = Buffer.from(await blob.arrayBuffer())
  const { error: upErr } = await newDb.storage
    .from(BUCKET)
    .upload(f.name, buf, { contentType: f.metadata?.mimetype || 'application/pdf', upsert: true })

  console.log(upErr ? `GAGAL upload ${f.name}: ${upErr.message}` : `OK ${f.name}`)
}
```

Jalankan:

```bash
cd "D:\Rafi\Project\Aplikasi PWA ShiningSun Penjadwalan"
$env:OLD_SERVICE_ROLE_KEY="<service_role_lama>"
$env:NEW_SERVICE_ROLE_KEY="<service_role_baru>"
node scripts/migrate-storage.mjs
```

- [ ] Jumlah file OK = jumlah file lama
- [ ] Buka 2–3 PDF dari `https://api.<DOMAIN>/storage/v1/object/public/kurikulum/<file>` → tampil

### 9.8 🔴 Rewrite URL File di Database

URL file tersimpan **absolut** menunjuk ke Supabase Cloud. Jika tidak di-rewrite,
tombol "Lihat PDF" akan mati begitu Supabase Cloud dihapus.

```sql
-- Jalankan di Postgres self-hosted
-- Cek dulu berapa baris yang akan berubah
SELECT count(*) FROM public.curriculum_documents
WHERE file_url LIKE 'https://dokunkpvpmaozozusnhk.supabase.co%';

-- Backup nilainya
CREATE TABLE _bak_curriculum_url AS
SELECT id, file_url FROM public.curriculum_documents;

-- Rewrite
UPDATE public.curriculum_documents
SET file_url = replace(
      file_url,
      'https://dokunkpvpmaozozusnhk.supabase.co',
      'https://api.<DOMAIN>'
    )
WHERE file_url LIKE 'https://dokunkpvpmaozozusnhk.supabase.co%';

-- Verifikasi
SELECT id, file_url FROM public.curriculum_documents LIMIT 5;
```

- [ ] 0 baris yang masih menunjuk `supabase.co`
- [ ] Semua PDF terbuka dari aplikasi

### 9.9 Uji Aplikasi dengan Database Baru (di domain uji)

1. Coolify → aplikasi Next.js → Environment Variables
2. Ubah:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://api.<DOMAIN>
   ```
3. **Rebuild** (bukan restart) — karena `NEXT_PUBLIC_*` inline saat build
4. Buka `https://app.<DOMAIN>/login` → login → jalankan ulang checklist §7.9

- [ ] Checklist §7.9 semua ✅ dengan database self-hosted

> Di titik ini kamu punya **dua sistem lengkap dan berfungsi**:
> produksi asli (Vercel + Cloud) dan salinan (VPS). Memilih mana yang jadi
> produksi = hanya soal DNS. Ini posisi paling aman.

### 9.10 Ukur Durasi Dump & Restore

**Jangan menebak.** Catat waktu nyata untuk menentukan `JAM_MULAI`–`JAM_SELESAI`.

```bash
time pg_dump --schema=public --schema=auth --schema=storage \
             --no-owner --no-privileges \
             -f /tmp/test.sql "$SUPABASE_DB_URL"

time psql "$SELFHOST_DB_URL" -f /tmp/test.sql
```

| Proses | Durasi terukur |
| :--- | :--- |
| `pg_dump` | `<.....>` menit |
| `psql` restore | `<.....>` menit |
| Copy storage | `<.....>` menit |
| **Total + buffer 100%** | `<.....>` menit |

- [ ] Durasi terukur dicatat → dipakai untuk menentukan jendela maintenance

---

## 10. FASE 5 — Migrasi Database (Malam Cutover)

> 📅 **Tanggal:** `<TANGGAL_CUTOVER>`
> 🕘 **Jendela:** `<JAM_MULAI>` – `<JAM_SELESAI>` WIB
> **Downtime:** 60–90 menit (terkunci, disengaja)
> **Rollback:** balikkan env + rebuild → ± 10 menit

### 10.1 Konsep: Write-Freeze

`pg_dump` adalah **foto sesaat**. Semua tulisan setelah dump selesai **hilang**.

```
22:00  🔒 KUNCI TULIS   ← mulai di sini
22:00  pg_dump
22:08  psql restore
22:25  copy storage + rewrite URL
22:35  rebuild web
22:45  verifikasi
22:55  🔓 BUKA TULIS di DB baru
```

**Freeze harus menutup seluruh jendela**, bukan hanya saat dump.

**Kenapa tidak pakai sinkronisasi delta / dual-write?**
Karena tidak ada mekanisme aman untuk itu di setup ini: tidak ada kolom penanda
sinkronisasi, dan dual-write butuh mengubah semua Server Action (risiko tinggi).
Freeze 60–90 menit jauh lebih murah daripada risiko data hilang diam-diam.

### 10.2 Timeline

| Waktu | Aksi | PIC |
| :--- | :--- | :--- |
| H-7 | Backup penuh + uji restore | |
| H-1 08:00 | Kirim WA pengumuman maintenance | |
| H-1 | Verifikasi semua prasyarat §5.1 | |
| T-30m | Kirim WA pengingat "selesaikan pekerjaan" | |
| **T+0** | 🔒 **Freeze** (§10.4) | |
| T+2m | Dump final (§10.5) | |
| T+10m | Restore final (§10.6) | |
| T+25m | Copy storage + rewrite URL (§10.7) | |
| T+35m | Ganti env + rebuild (§10.8) | |
| T+45m | Verifikasi 5 cek (§10.9) | |
| T+55m | Smoke test + buka akses (§10.10) | |
| T+60m | Kirim WA "sudah normal" | |
| T+1d | Monitor error log | |
| T+30d | Hapus Supabase Cloud & Vercel | |

### 10.3 Langkah 0 — Persiapan 30 Menit Sebelum

- [ ] Buka semua tool dalam keadaan siap:
  - Terminal laptop (untuk `pg_dump`)
  - Terminal SSH ke VPS
  - Coolify di tab terpisah
  - Supabase Dashboard (SQL Editor)
  - Google Cloud Console
  - Grup WA admin (untuk pengumuman)
- [ ] Catat hasil baseline: row count semua tabel dari Supabase Cloud (§12.3)
- [ ] Pastikan HP kamu bisa menerima WA dari admin (jika ada kendala)

### 10.4 Langkah 1 — Freeze (🔒 TULIS DIKUNCI)

**Cara A (disarankan): Pause project Vercel.**

Vercel → Project → Settings → Advanced → **Pause Project**

→ Semua admin melihat halaman "project paused". Mustahil menulis.

**Cara B (cadangan): kunci di database.**

```sql
-- Supabase Cloud → SQL Editor
-- 0. Simpan kondisi awal
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon','authenticated');
-- SALIN HASILNYA KE FILE. Ini untuk rollback.

-- 1. Kunci tulis
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public
  FROM authenticated, anon;
```

- [ ] Freeze aktif (coba simpan data dari akun uji → harus gagal)
- [ ] Waktu freeze dicatat: `______`

> ⚠️ **Mulai titik ini, jangan ada yang menulis ke Supabase Cloud.**
> Kamu sendiri juga tidak boleh menambah data lewat dashboard.

### 10.5 Langkah 2 — Dump Final

```bash
cd ~/backup-shiningsun

# Nama file dengan timestamp, supaya tidak tertukar
DUMP="final-$(date +%Y%m%d-%H%M).sql"

time pg_dump --schema=public --schema=auth --schema=storage \
             --no-owner --no-privileges \
             -f "$DUMP" "$SUPABASE_DB_URL"

# Validasi
ls -lh "$DUMP"
tail -3 "$DUMP"            # HARUS ada "PostgreSQL database dump complete"
grep -c "^COPY " "$DUMP"   # jumlah blok COPY
```

- [ ] File dump ada dan ukurannya wajar
- [ ] Baris penutup `dump complete` ada ← **jangan lanjut kalau tidak ada**
- [ ] File langsung di-copy ke Google Drive (cadangan kedua)

### 10.6 Langkah 3 — Restore Final

```bash
# Lewat SSH tunnel (jangan buka 5432 ke internet)
ssh -L 5433:localhost:5432 rafi@IP_VPS

# Di terminal lain:
SELFHOST="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5433/postgres"

# Bersihkan schema public agar tidak dobel
psql "$SELFHOST" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
psql "$SELFHOST" -c "GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;"

# Restore
time psql "$SELFHOST" -f "$DUMP" 2>&1 | tee restore.log

# Cek error
grep -i "error" restore.log | head -20
```

- [ ] Restore selesai
- [ ] `grep -i error` → tidak ada error fatal (peringatan `already exists` masih OK)

### 10.7 Langkah 4 — Storage & Rewrite URL

```bash
node scripts/migrate-storage.mjs
```

```sql
-- Postgres self-hosted
UPDATE public.curriculum_documents
SET file_url = replace(file_url,
      'https://dokunkpvpmaozozusnhk.supabase.co',
      'https://api.<DOMAIN>')
WHERE file_url LIKE 'https://dokunkpvpmaozozusnhk.supabase.co%';
```

- [ ] Jumlah file storage sama
- [ ] 0 URL tersisa menunjuk `supabase.co`

### 10.8 Langkah 5 — Ganti Env & Rebuild

Coolify → aplikasi Next.js → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://api.<DOMAIN>
```

Lalu **Rebuild** (bukan restart). Tunggu build selesai (5–10 menit di 2 vCPU).

- [ ] Build sukses
- [ ] Aplikasi Running

### 10.9 Langkah 6 — Verifikasi (5 Cek)

Jalankan di **kedua** database, bandingkan.

**Cek 1 — Jumlah baris per tabel**

```sql
SELECT table_name,
       (xpath('/row/c/text()',
         query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name),
         false, true, '')))[1]::text::int AS jumlah_baris
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE'
ORDER BY 1;
```

- [ ] Semua angka **identik**

**Cek 2 — Data terakhir masuk**

```sql
SELECT 'students' AS tabel, count(*), max(created_at) FROM public.students
UNION ALL SELECT 'schedules', count(*), max(created_at) FROM public.schedules
UNION ALL SELECT 'curriculum_documents', count(*), max(uploaded_at) FROM public.curriculum_documents;
```

- [ ] `max(created_at)` identik di kedua DB

**Cek 3 — Sequence (penyebab "duplicate key")**

```sql
SELECT sequencename, last_value FROM pg_sequences WHERE schemaname='public' ORDER BY 1;
```

- [ ] Nilai sama. Kalau lebih kecil, perbaiki:
  ```sql
  SELECT setval('nama_sequence', (SELECT max(id) FROM nama_tabel));
  ```

**Cek 4 — File Storage**

```sql
SELECT bucket_id, count(*) FROM storage.objects GROUP BY bucket_id;
```

- [ ] Angka sama
- [ ] 2–3 PDF terbuka normal dari aplikasi

**Cek 5 — Spot check transaksi terakhir**

```sql
SELECT * FROM public.schedules ORDER BY created_at DESC LIMIT 3;
```

- [ ] 3 baris teratas ada di kedua DB dengan isi sama

### 10.10 Langkah 7 — Smoke Test & Buka Akses (🔓)

1. Login super admin → jalankan checklist ringkas:

| # | Aksi | ✅ |
| :--- | :--- | :--- |
| 1 | Login berhasil (**password lama**, bukan reset) | ☐ |
| 2 | Dashboard terbuka, data tampil | ☐ |
| 3 | Tambah 1 jadwal → cek masuk DB baru | ☐ |
| 4 | Hapus jadwal tadi | ☐ |
| 5 | Upload dokumen kurikulum | ☐ |
| 6 | Upload foto worksheet → masuk Google Drive | ☐ |
| 7 | Generate rapor | ☐ |
| 8 | Portal ortu | ☐ |

2. Semua ✅ → **buka akses:**

```sql
-- Kalau memakai Cara B di §10.4
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public
  TO authenticated, anon;
```

3. Kirim WA: "Maintenance selesai, aplikasi bisa dipakai kembali."

- [ ] Semua smoke test ✅
- [ ] WA terkirim
- [ ] Catat waktu selesai: `______` (total downtime = `______` menit)

### 10.11 🔙 Rollback Fase 5

**Kapan:** smoke test gagal dan tidak bisa diperbaiki < 20 menit.

```bash
# 1. Coolify → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://dokunkpvpmaozozusnhk.supabase.co

# 2. Rebuild (5–10 menit)

# 3. Buka kembali tulis di Supabase Cloud (kalau pakai Cara B)
```

```sql
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public
  TO authenticated, anon;
```

```bash
# 4. Unpause Vercel (kalau di-pause)
```

> Karena Supabase Cloud **hanya dibaca** selama migrasi, rollback ini
> **tidak kehilangan data apa pun**.

**Jangan lupa:** perbaiki masalahnya, lalu ulangi dari §10.4 pada malam lain.
Supabase self-hosted bisa dibiarkan hidup (tidak mengganggu).

---

## 11. FASE 6 — Pasca Migrasi & Perawatan

### 11.1 Backup Otomatis Database (WAJIB)

**Opsi A — Coolify Scheduled Task**

Coolify → Service Supabase → **Scheduled Tasks** → tambah:

```
Nama: backup-db
Jadwal: 0 18 * * *   (01:00 WIB)
Perintah:
  pg_dump -U postgres -d postgres --no-owner --no-privileges \
  | gzip > /tmp/backup-$(date +\%Y\%m\%d).sql.gz
```

Lalu unggah ke Google Drive/S3 (butuh `rclone` di container, atau pakai
script di host yang mount volume).

**Opsi B — Cron di host (lebih sederhana)**

```bash
# /home/rafi/backup-db.sh
#!/bin/bash
set -e
DATE=$(date +%Y%m%d)
DIR=/home/rafi/backups
mkdir -p $DIR
docker exec supabase-db pg_dump -U postgres -d postgres --no-owner --no-privileges \
  | gzip > $DIR/db-$DATE.sql.gz
find $DIR -name 'db-*.sql.gz' -mtime +14 -delete   # simpan 14 hari
```

```bash
chmod +x /home/rafi/backup-db.sh
crontab -e
# 0 18 * * * /home/rafi/backup-db.sh >> /home/rafi/backups/cron.log 2>&1
```

- [ ] Backup harian jalan (cek besok: file `.gz` muncul)
- [ ] **Uji restore sekali** — backup yang belum dites bukan backup

### 11.2 Monitoring

| Yang dipantau | Tool | Ambang waspada |
| :--- | :--- | :--- |
| RAM | Coolify Metrics | > 90% |
| Disk | `df -h` | > 80% |
| Error app | Coolify Logs | ada error berulang |
| Container mati | Coolify (auto-restart) | ada yang restart terus |
| SSL expire | Coolify (auto-renew) | — |

Tambahkan **UptimeRobot** (gratis) untuk ping `https://<DOMAIN>/login` tiap 5 menit.

### 11.3 Perawatan Disk

```bash
# Bersihkan image & build cache lama (aman, tidak menghapus volume)
docker system prune -af --volumes=false
docker builder prune -af

# Cek ukuran
df -h
docker system df
```

- [ ] Dijalankan 1x sebulan

### 11.4 Arsip & Penghapusan (T+30 hari)

- [ ] 30 hari tanpa keluhan data hilang
- [ ] Backup final Supabase Cloud tersimpan di 2 tempat
- [ ] Supabase Cloud → **Pause project** (bukan delete)
- [ ] Setelah 30 hari lagi → **Delete project**
- [ ] Vercel → **Delete project** (atau biarkan paused)
- [ ] Domain lama `...vercel.app` tidak dipakai lagi

---

## 12. Lampiran

### 12.1 Checklist Env Vars (salin-tempel saat setup)

```env
# ── Supabase ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://dokunkpvpmaozozusnhk.supabase.co   # FASE 5: → https://api.<DOMAIN>
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Push notification ─────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@shiningsun.com

# ── Cron ──────────────────────────────────────────────
CRON_SECRET=

# ── Google Drive ──────────────────────────────────────
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_DRIVE_FOLDER_ID=
GOOGLE_DRIVE_REFRESH_TOKEN=

# ── Runtime ───────────────────────────────────────────
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=4096
```

### 12.2 Cheat Sheet Perintah Harian

```bash
# Status semua container
docker ps --format 'table {{.Names}}\t{{.Status}}'

# Log aplikasi Next.js
docker logs -f --tail 100 <nama-container-nextjs>

# Masuk ke Postgres
docker exec -it supabase-db psql -U postgres

# Ukuran database
docker exec supabase-db psql -U postgres -c \
  "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Ukuran per tabel (10 terbesar)
docker exec supabase-db psql -U postgres -c \
  "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size
   FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"

# Koneksi aktif
docker exec supabase-db psql -U postgres -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Restart seluruh stack Supabase
cd /data/coolify/services/<uuid-supabase> && docker compose restart

# Cek disk
df -h && docker system df
```

### 12.3 SQL Verifikasi (jilid lengkap)

```sql
-- 1. Jumlah baris semua tabel
SELECT table_name,
       (xpath('/row/c/text()',
         query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name),
         false, true, '')))[1]::text::int AS jumlah_baris
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE'
ORDER BY 1;

-- 2. Sequence
SELECT sequencename, last_value FROM pg_sequences WHERE schemaname='public' ORDER BY 1;

-- 3. Storage
SELECT bucket_id, count(*) FROM storage.objects GROUP BY bucket_id;

-- 4. User auth (jumlah harus sama)
SELECT count(*) FROM auth.users;

-- 5. Ukuran database
SELECT pg_size_pretty(pg_database_size(current_database()));

-- 6. Tabel tanpa primary key (potensi masalah performa)
SELECT c.relname FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=c.oid AND contype='p');

-- 7. Checksum per tabel besar (opsional, verifikasi paling kuat)
SELECT md5(string_agg(t::text, '' ORDER BY id)) AS checksum FROM public.schedules t;
```

### 12.4 SQL Freeze / Unfreeze

```sql
-- KUNCI
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public
  FROM authenticated, anon;

-- BUKA
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public
  TO authenticated, anon;
```

### 12.5 Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
| :--- | :--- | :--- |
| Build `Killed` / OOM | RAM 2 vCPU habis saat `next build` | Pastikan swap 4 GB aktif; `NODE_OPTIONS=--max-old-space-size=4096`; deploy di jam sepi |
| Login gagal setelah migrasi DB | `SERVICE_PASSWORD_JWT` ≠ JWT Secret lama | Set ulang JWT secret, restart `supabase-auth`, cek `auth.users` terisi |
| Upload PDF kurikulum gagal | `NEXT_PUBLIC_SUPABASE_URL` masih `supabase.co` atau `api.` tidak publik | Rebuild dengan URL baru; pastikan DNS `api` → VPS dan SSL valid |
| Tombol "Lihat PDF" 404 | `curriculum_documents.file_url` belum di-rewrite | Jalankan §9.8 |
| Notifikasi terkirim 2x | Vercel cron masih aktif | Pause Vercel atau hapus `crons` di `vercel.json` |
| Notifikasi tidak terkirim | `CRON_SECRET` tidak ada / admin belum re-subscribe | Cek env; minta admin klik "aktifkan notif" lagi |
| Foto worksheet gagal upload | Refresh token Google Drive bermasalah | Buka `/api/auth/gdrive` → otorisasi ulang → token tersimpan ke `system_settings` |
| "duplicate key value violates unique constraint" | Sequence tidak ikut ter-restore | `SELECT setval('nama_seq', (SELECT max(id) FROM tabel));` |
| Halaman putih setelah deploy | `NEXT_PUBLIC_*` berubah tapi hanya restart | **Rebuild**, bukan restart |
| SSL gagal terbit | DNS belum propagasi / port 80 tertutup | Cek `nslookup`, `ufw status`; tunggu 5–10 menit |
| Dashboard Coolify tidak bisa dibuka | Port 8000 dikunci ke IP lain | SSH: `sudo ufw status numbered` → izinkan IP baru |
| RAM penuh setelah beberapa hari | Image lama menumpuk | `docker system prune -af`; aktifkan Docker Cleanup di Coolify |
| `pg_dump` gagal connect | Pakai direct IPv4 (tidak tersedia di Free) | Pakai **Session pooler** `...pooler.supabase.com:5432` |
| Restore `auth` schema error | Beda versi GoTrue | Restore `public` saja; buat ulang user (lihat §9.6) |

### 12.6 Prosedur Rollback Ringkas

| Fase | Gejala | Rollback | Waktu |
| :--- | :--- | :--- | :--- |
| **2** (web di VPS) | App tidak jalan di VPS | Buka `...vercel.app` lagi; hapus app di Coolify | 1 menit |
| **3** (cutover domain) | Domain baru bermasalah | Hapus record `A @` & `A www`; unpause Vercel | 5–15 menit |
| **4** (persiapan DB) | Supabase self-hosted kacau | Hapus service Supabase di Coolify; produksi tidak terpengaruh | 5 menit |
| **5** (migrasi DB) | Smoke test gagal | Env balik ke `supabase.co` → Rebuild → unfreeze → unpause Vercel | 10–20 menit |

> **Aturan emas:** kalau ragu di tengah Fase 5, **rollback dulu**.
> Kamu selalu bisa mengulang malam lain. Data di Supabase Cloud aman
> karena tidak pernah ditulis selama migrasi.

### 12.7 Yang TIDAK Perlu Dipindah

| Data | Lokasi | Catatan |
| :--- | :--- | :--- |
| Foto laporan perkembangan siswa | **Google Drive** | DB hanya simpan URL. Tetap jalan tanpa perubahan |
| File rapor PDF | Google Drive | Sama |
| Refresh token Google Drive | tabel `system_settings` | Ikut migrasi bersama database |
| Dokumen kurikulum (PDF) | Supabase Storage, bucket `kurikulum` | **Perlu** disalin (§9.7) |

### 12.8 Catatan Teknis Tambahan

1. **`vercel.json` tidak berlaku di VPS.** Header cache untuk `manifest.webmanifest`
   dan `/api/push/vapid-key` tidak akan aktif. Kalau ingin performa PWA sama,
   pindahkan header tersebut ke `next.config.ts` → `async headers()`
   (perubahan kode opsional, bisa dilakukan kapan saja setelah migrasi).

2. **`src/instrumentation.ts` sudah siap VPS.** Dia otomatis aktif karena
   `process.env.VERCEL` tidak ada. Tidak perlu cron eksternal.
   Konsekuensi: **replicas harus 1**.

3. **`sharp` / image optimization.** Di Linux glibc, `next/image` butuh
   konfigurasi tambahan [memory allocator sharp](https://sharp.pixelplumbing.com/install#linux-memory-allocator)
   bila RAM ketat. Untuk 8 GB RAM dengan traffic kecil, biasanya tidak perlu.

4. **Timezone container.** `instrumentation.ts` menghitung WIB manual
   (`Date.now() + 7 jam`), jadi tidak bergantung pada `TZ` container. Aman.

5. **Bucket `kurikulum` bersifat publik.** Setelah pindah, URL PDF akan
   memakai domain `api.<DOMAIN>`. Ini normal dan tidak menambah kerentanan
   dibanding sebelumnya.

6. **PWA cache lama.** Admin yang sudah pernah membuka domain baru bisa
   menyimpan versi lama di service worker. Jika ada laporan "tampilan aneh",
   minta admin: tutup app → buka lagi → atau hapus & install ulang PWA.

---

## 13. Log Eksekusi

> Isi saat menjalankan. Berguna kalau ada masalah di kemudian hari.

| Tanggal | Fase | Aksi | Hasil | Catatan |
| :--- | :--- | :--- | :--- | :--- |
| | | | | |
| | | | | |
| | | | | |

**Durasi terukur:**

| Proses | Durasi |
| :--- | :--- |
| Build Next.js di VPS | |
| `pg_dump` | |
| Restore `psql` | |
| Copy storage | |
| Rebuild setelah ganti env | |
| **Total downtime Fase 5** | |

---

*Dokumen ini dibuat sebagai runbook operasional. Setiap fase selesai → centang checklist → lanjut fase berikutnya. Jangan lompat fase.*
