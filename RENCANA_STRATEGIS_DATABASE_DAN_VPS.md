# Roadmap & Rencana Strategis Database & Infrastruktur VPS (Zero Limit Plan)

> [!IMPORTANT]
> **PRINSIP DASAR:**
> Dokumen ini dirancang sebagai panduan jangka pendek, menengah, dan panjang agar aplikasi ShiningSun Penjadwalan bebas dari risiko **limit kuota (egress)**, **timeout serverless**, dan ketergantungan pihak ketiga, **tanpa merusak logika bisnis maupun struktur data yang sedang berjalan**.

---

## 1. Analisis Masalah Saat Ini

Aplikasi ShiningSun Penjadwalan saat ini menggunakan arsitektur:
* **Frontend & Backend:** Next.js (App Router) dihosting di **Vercel** (Free Tier).
* **Database & Auth:** **Supabase Cloud** (Free Tier).
* **Penyimpanan Media (Foto/Video):** Google Drive API (OAuth2).

### Risiko yang Dihadapi pada Setup Cloud Free Tier:
1. **Limit Egress Supabase (5 GB/bulan):** Jika akun free tier melebihi 5 GB egress, database otomatis di-pause / dibatasi hingga awal bulan berikutnya.
2. **Limit Vercel Serverless Function:** Timeout eksekusi maksimal 10–15 detik, memori function dibatasi, dan serverless container sering mati (*cold start*), sehingga cache in-memory aplikasi sering ter-reset.
3. **Ketergantungan Akun Pihak Ketiga:** Jika akun Supabase kena limit lagi, admin harus migrasi ulang proyek secara manual.

---

## 2. Pilihan Strategi Database & VPS

Berikut 3 opsi strategi yang dapat diambil:

```mermaid
flowchart TD
    subgraph Opsi_1["Opsi 1: Cloud Supabase + Web di VPS (Tahap Awal)"]
        W1["Next.js Web di VPS (Coolify/Dokploy)"]
        D1["Supabase Cloud Baru"]
        W1 -->|Koneksi Internet (Egress Hemat)| D1
    end

    subgraph Opsi_2["Opsi 2: Full Self-Hosted di 1 VPS (Paling Direkomendasikan)"]
        VPS["Satu Server VPS (RAM 4GB)"]
        W2["Next.js Web (Docker)"]
        D2["PostgreSQL / Supabase Self-Hosted"]
        W2 <-->|Internal Network (0 ms / 0 Kuota)| D2
    end

    subgraph Opsi_3["Opsi 3: Managed Serverless Postgres (Neon.tech)"]
        W3["Next.js Web di VPS"]
        D3["Neon.tech PostgreSQL Cloud"]
        W3 -->|PostgreSQL Protocol| D3
    end
```

### Tabel Perbandingan 3 Opsi

| Parameter | Opsi 1: Web VPS + Supabase Cloud | Opsi 2: Full Self-Hosted di 1 VPS ⭐ | Opsi 3: Web VPS + Neon.tech |
| :--- | :--- | :--- | :--- |
| **Batas Kuota Egress** | Masih ada (5 GB/bln Supabase) | **100% UNLIMITED (Bebas Limit)** | Bebas limit gratisan lebih besar |
| **Kecepatan Query (Latency)** | 150 – 350 ms (SG ke ID) | **1 – 5 ms (Super Cepat / Localhost)** | 100 – 250 ms |
| **Biaya Bulanan** | ~Rp 50.000 (VPS RAM 2GB) | ~Rp 120.000 – Rp 150.000 (VPS RAM 4GB) | ~Rp 50.000 (VPS) + Gratis Neon |
| **Kemudahan Setup** | Sangat Mudah | Mudah via 1-Click Coolify/Dokploy | Sedang (Perlu migrasi Auth) |
| **Keamanan Data** | Bergantung Cloud | Milik Sendiri (100% di Server Pribadi) | Bergantung Cloud |

---

## 3. Rencana Eksekusi Bertahap (Step-by-Step Roadmap)

### Fase 1: Jangka Pendek (Menjaga Akun Baru Tetap Aman)
1. **Push Perbaikan Keamanan:** Selesaikan push kode modular dan guard sesi ke production.
2. **Jalankan RLS Hardening:** Eksekusi `supabase/rls_hardening.sql` di Supabase SQL Editor agar anonim tidak bisa scrape data database.
3. **Pertahankan Strategi Media Google Drive:** Pastikan foto lembar kerja tetap tersimpan di Google Drive, bukan ke Supabase Storage.
4. **Hasil Fase 1:** Akun Supabase baru aman dari kebocoran data dan konsumsi egress turun drastis (~70-80% lebih hemat).

---

### Fase 2: Pindahkan Web ke VPS (Menghilangkan Limit Vercel)
1. **Sewa VPS:**
   * Rekomendasi Provider: **IDCloudHost** (Server Jakarta/Indonesia) atau **DigitalOcean / Hetzner**.
   * Spesifikasi Rekomendasi: Minimal **2 vCPU, RAM 2 GB, SSD 40 GB** (atau RAM 4 GB jika ingin langsung gabung database).
2. **Install Web GUI (Panel Mirip Vercel):**
   * Install **Coolify** atau **Dokploy** di VPS via satu baris perintah terminal.
   * Hubungkan GitHub repo Anda ke panel Coolify/Dokploy.
3. **Environment Variable:**
   * Masukkan `.env` yang sama persis seperti di Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Google Drive credentials).
4. **Hubungkan Domain / Subdomain:**
   * Arahkan domain/DNS Anda ke IP VPS dengan SSL otomatis (Let's Encrypt gratis via panel).
5. **Hasil Fase 2:** Tidak ada batasan timeout, aplikasi nyala terus, cache in-memory awet, dan tampilan manajemen mirip Vercel.

---

### Fase 3: Jangka Panjang — Full Self-Hosted Database di VPS (Bebas Limit Selamanya)
*Target: Aplikasi 100% independen dan tidak perlu bergantung pada Supabase Cloud.*

1. **Deploy Database di VPS:**
   * Di dalam panel Coolify, klik menu **+ New Resource** ➡️ **Database** ➡️ Pilih **PostgreSQL** atau **Supabase (Self-hosted)**.
2. **Migrasi Data (Zero Data Loss):**
   * Export skema & data dari Supabase Cloud via tool `pg_dump` atau menu Backup.
   * Import data ke PostgreSQL di VPS lokal.
3. **Ubah Koneksi:**
   * Ubah `NEXT_PUBLIC_SUPABASE_URL` / `DATABASE_URL` di aplikasi Next.js agar mengarah ke `http://localhost:5432` atau internal docker service name.
4. **Setup Backup Otomatis:**
   * Aktifkan auto-backup database harian di Coolify ke Google Drive / S3 storage (gratis).
5. **Hasil Fase 3:** 
   * **Rp 0 biaya langganan database.**
   * **Kecepatan query 1–5 ms (instan).**
   * **Bebas dari segala ancaman kuota limit/egress selamanya.**

---

## 4. Checklist Kesiapan Spesifikasi VPS

| Komponen | Web Only di VPS (Database di Supabase) | Web + Database Full di VPS |
| :--- | :---: | :---: |
| **CPU** | 1 – 2 vCPU | 2 vCPU |
| **RAM** | 2 GB | 4 GB |
| **Storage (Disk)** | 20 – 30 GB SSD | 40 – 60 GB SSD / NVMe |
| **OS** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 22.04 / 24.04 LTS |
| **Panel** | Coolify / Dokploy (Gratis) | Coolify / Dokploy (Gratis) |
| **Estimasi Biaya** | ~Rp 50.000 – Rp 80.000 / bulan | ~Rp 110.000 – Rp 160.000 / bulan |

