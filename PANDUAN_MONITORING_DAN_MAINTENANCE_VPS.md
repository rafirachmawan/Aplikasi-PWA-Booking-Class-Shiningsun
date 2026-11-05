# Panduan Standar Operasional (SOP) Monitoring & Maintenance VPS ShiningSun

Dokumen ini adalah panduan kerja (*runbook*) praktis bagi pengelola sistem/developer yang memegang tanggung jawab **Monitoring & Maintenance VPS** untuk aplikasi ShiningSun Preschool & Academy.

---

## 🎯 1. Ringkasan Peran & Tanggung Jawab
Sebagai penanggung jawab pemeliharaan server dan aplikasi, tujuan utama Anda adalah:
1. **Zero Downtime**: Memastikan aplikasi `https://shiningsun.tech` selalu aktif 24/7 dan bisa diakses lancar oleh guru dan orang tua murid.
2. **Data Safety**: Memastikan seluruh data siswa, lembar perkembangan, dan poin selalu memiliki cadangan (*backup*).
3. **Preventive Care**: Mencegah server kehabisan kapasitas (*disk full*), kebocoran memori (*memory leak*), atau error token API.
4. **Professional Reporting**: Memberikan laporan berkala kepada yayasan/klien agar mereka merasa aman dan puas dengan investasi biaya maintenance.

---

## 📅 2. Jadwal Rutinitas Kerja (Checklist)

Pekerjaan maintenance ini **tidak perlu menyita waktu seharian**, cukup ikuti jadwal berikut:

### A. Cek Mingguan (± 5 - 10 Menit)
- [ ] Buka menu **Runtime Logs** di Coolify: Periksa sekilas apakah ada pesan error yang berulang (misal kegagalan upload, sesi login terputus).
- [ ] Buka menu **Metrics** di Coolify / Hostinger: Pastikan penggunaan RAM berada di rentang normal (di bawah 80%).
- [ ] Cek halaman web utama `https://shiningsun.tech`: Pastikan sertifikat SSL (ikon gembok HTTPS) tetap aktif dan aman.

### B. Perawatan Bulanan (± 15 - 20 Menit)
- [ ] **Pembersihan Disk (Docker Prune)**: Bersihkan sampah build dan image lama agar harddisk VPS tidak penuh.
- [ ] **Backup Database**: Unduh salinan database terbaru dari Supabase dan simpan di Google Drive / laptop lokal.
- [ ] **Cek Kuota Supabase**: Periksa sisa kuota database storage dan bandwidth egress di dashboard Supabase.
- [ ] **Kirim Laporan Bulanan**: Kirim ringkasan status kesehatan web ke pengelola ShiningSun.

---

## 🛠️ 3. Panduan Teknis 4 Pilar Pemeliharaan

### Pilar 1: Kesehatan Harddisk & Memori VPS (Hardware Level)
Setiap kali Anda menekan tombol **Redeploy** atau update dari GitHub, Docker menyimpan salinan *build layer* dan image lama di dalam VPS. Lama-kelamaan harddisk bisa terisi 100% dan membuat web macet total.

#### Cara Membersihkan Sampah Docker (Sebulan Sekali):
1. Buka menu **Terminal** di Coolify (atau akses VPS via SSH / terminal Hostinger).
2. Jalankan perintah pembersihan aman berikut:
   ```bash
   docker system prune -af --volumes
   ```
3. Cek kembali kapasitas disk yang tersisa:
   ```bash
   df -h
   ```
   *Pastikan partisi utama (`/`) memiliki sisa ruang kosong minimal di atas 30%.*

---

### Pilar 2: Notifikasi Otomatis Web Down (Uptime Monitoring)
Jangan sampai Anda baru tahu web mati karena guru atau orang tua murid komplain. Pasang bot pemantau otomatis yang bekerja 24 jam gratis:

1. Buat akun gratis di salah satu layanan berikut:
   - **BetterStack** ([betterstack.com](https://betterstack.com)) *(Sangat direkomendasikan, tampilan modern & alert via email/WhatsApp)*
   - **UptimeRobot** ([uptimerobot.com](https://uptimerobot.com))
2. Tambahkan monitor baru:
   - **URL**: `https://shiningsun.tech`
   - **Monitoring Interval**: 3 menit atau 5 menit.
3. Hubungkan ke Email atau nomor WhatsApp Anda. Jika server down atau terjadi gangguan jaringan di VPS, Anda akan menerima alert dalam hitungan menit untuk segera mengecek Coolify.

---

### Pilar 3: Audit Log & Error Monitoring (Coolify Runtime Logs)
Gunakan fitur **Activity Logger** yang sudah terpasang di sistem:
1. Buka panel Coolify di `panel.shiningsun.tech` &rarr; Pilih aplikasi &rarr; **Runtime Logs**.
2. Manfaatkan filter pencarian di kolom **Find in logs**:
   - `[AUTH-ADMIN]` : Memantau admin/guru yang login dan logout.
   - `[PORTAL-ORTU]` : Memantau siapa saja orang tua yang aktif masuk ke portal.
   - `[WORKSHEET]` : Memantau penginputan lembar perkembangan siswa.
   - `[STUDENT]` : Memantau pendaftaran atau mutasi cabang siswa.
   - `error` atau `fail` : Menelusuri jika ada kendala jaringan atau kegagalan fungsi.

---

### Pilar 4: Jaring Pengaman Backup Database (Disaster Recovery)
Data siswa, riwayat rapor, dan poin adalah aset paling berharga bagi sekolah. Memiliki cadangan data mandiri adalah nilai jual terpenting Anda.

#### Cara Mengamankan Cadangan Database (Supabase):
1. Buka **Supabase Dashboard** &rarr; Pilih project ShiningSun.
2. Masuk ke menu **Project Settings** &rarr; **Database** &rarr; **Backups**.
3. Di paket Supabase Free/Pro, Anda bisa mengunduh file snapshot backup harian/mingguan.
4. Simpan file backup tersebut ke folder lokal khusus atau Google Drive arsip Anda.
5. *(Opsi via CLI jika diperlukan)*: Anda juga bisa menjalankan perintah `pg_dump` jika database ingin di-export langsung ke file `.sql`.

---

## 🚨 4. Panduan Darurat (Troubleshooting Ringkas)

| Gejala Masalah | Penyebab Umum | Langkah Penanganan Cepat |
| :--- | :--- | :--- |
| **Web tidak bisa diakses (502 Bad Gateway)** | Container Next.js berhenti atau crash | Buka Coolify &rarr; Klik tombol **Restart** pada aplikasi. Jika tetap gagal, klik **Redeploy**. |
| **Server lambat / tidak merespon** | RAM penuh (*Out of Memory*) | Cek terminal VPS &rarr; jalankan `free -h` dan `top`. Bersihkan cache dengan restart container di Coolify. |
| **Upload file PDF gagal** | File melebihi batas atau bucket storage belum siap | Cek log di Runtime Logs, pastikan file PDF di bawah 5MB dan bucket storage Supabase aktif. |
| **Peringatan SSL / Tidak Aman** | Masa aktif SSL Let's Encrypt belum ter-renew | Di Coolify menu *Domains*, klik toggle HTTPS off lalu on kembali, atau simpan ulang domain agar sertifikat SSL terbit ulang. |

---

## 📄 5. Template Laporan Bulanan ke Klien (Client Report)

Kirimkan pesan ini setiap akhir bulan (lewat WhatsApp / email pengelola) agar klien puas dan yakin bahwa uang maintenance mereka dimanfaatkan secara profesional:

```text
Halo Miss / Tim Pengelola ShiningSun,

Berikut adalah laporan bulanan pemeliharaan sistem & server website ShiningSun (shiningsun.tech) untuk bulan [Nama Bulan Tahun]:

📊 1. Status Kestabilan (Uptime):
- Uptime Server: 99.8% (Aplikasi berjalan stabil 24/7 tanpa kendala downtime yang berarti).
- Akses Portal Guru & Orang Tua: Berjalan normal dan lancar.

🛡️ 2. Pemeliharaan Infrastruktur:
- Penggunaan Kapasitas Server (Disk & RAM): Berada dalam kondisi sehat dan prima (Kapasitas sisa > 70%).
- Pembersihan Sampah Cache & Log Sistem: Selesai dijalankan rutin.
- Sertifikat Keamanan SSL (HTTPS): Aktif dan terverifikasi aman.

💾 3. Keamanan Data:
- Seluruh data siswa, riwayat lembar perkembangan, dan poin telah terverifikasi aman dan tersinkronisasi di cloud database.
- Cadangan (Backup) berkala telah diamankan.

Jika ada kebutuhan penyesuaian atau masukan mengenai sistem, silakan hubungi saya kapan saja. Terima kasih atas kerja samanya! 🙏
```

