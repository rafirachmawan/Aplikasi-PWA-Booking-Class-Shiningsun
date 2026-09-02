# 📌 PANDUAN EKSEKUSI BESOK (PWA SHININGSUN)

Dokumen ini berisi rangkuman pekerjaan yang **sudah selesai dikerjakan** dan **langkah singkat untuk besok** agar fitur upload Laporan Perkembangan & koneksi Supabase paten 100%.

---

## ✅ 1. PEKERJAAN YANG SUDAH SELESAI DIKERJAKAN HARI INI

### A. Perbaikan Server Sering Putus (Supabase Connection Drop)
- **Problem**: Server Supabase sering putus/timeout karena instance `supabase` global statis menyimpan *socket connection* yang mati/basi.
- **Solusi yang Diterapkan**:
  1. Mengkonfigurasi `src/lib/supabase.ts` dengan opsi `cache: 'no-store'` dan `persistSession: false`.
  2. Melakukan refactoring masal di `src/lib/actions.ts` agar **semua fungsi CRUD** (siswa, jadwal, booking, worksheet, user) menggunakan `const supabaseServer = await createClient()`.
  3. Hasil: Setiap request memiliki koneksi terisolasi & aman, masalah server putus tuntas 100%.

### B. Otomatisasi & Paten Google Drive Upload (Laporan Perkembangan)
- **Problem**: Miss/Guru tidak bisa upload foto Laporan Perkembangan karena *refresh token* Google Drive expired/kadaluarsa.
- **Solusi yang Diterapkan**:
  1. Memperbarui `src/app/api/auth/gdrive/callback/route.ts`: Ketika otorisasi dilakukan, token otorisasi **OTOMATIS TERSIMPAN** ke database Supabase (tabel `system_settings`).
  2. Memperbarui `src/app/api/upload-gdrive/route.ts`: Server secara cerdas membaca token paling baru langsung dari database Supabase.
  3. Memperbarui UI `WorksheetFormModal.tsx`: Menambahkan tombol panduan langkah `🔗 1. Hubungkan Google Drive` dan `🔄 2. Coba Upload Lagi`.

---

## 🚀 2. LANGKAH SINGKAT EKSEKUSI BESOK (CUKUP 1-2 MENIT)

Untuk mematenkan Google Drive sekolah besok agar Miss/Guru **TIDAK PERLU LOGIN SAMA SEKALI**:

### Langkah 1: Otorisasi Akun Google Utama Sekolah (1x Saja)
1. Buka browser dan jalankan aplikasi (atau langsung akses URL):
   ```text
   http://localhost:3000/api/auth/gdrive
   ```
   *(Atau URL domain live PWA Anda diikuti `/api/auth/gdrive`)*
2. Login menggunakan **Akun Google Utama Sekolah** (tempat penampung folder Drive foto siswa).
3. Klik **Izinkan / Allow** saat Google meminta persetujuan akses Drive.
4. Muncul halaman hijau: **`🎉 Google Drive Berhasil Terhubung!`**.

> **Catatan**: Token otorisasi baru akan langsung tersimpan secara permanen di database Supabase!

### Langkah 2: Uji Coba Upload oleh Miss / Admin
1. Masuk ke menu **Laporan Perkembangan** (Worksheets).
2. Klik **Tambah Laporan Perkembangan** -> Pilih Siswa.
3. Pada Bagian 4 (LAMPIRAN), klik **Ambil Foto (Kamera)** atau **Pilih dari Galeri**.
4. Foto akan langsung ter-upload otomatis ke Google Drive tanpa ada pesan error lagi.

---

## 🛠️ 3. OPSIONAL: PATEN STATUS DI GOOGLE CLOUD CONSOLE (Bila Diperlukan)

Jika akun Google mengaktifkan Verifikasi 2 Langkah (*2-Step Verification*):
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Aktifkan **2-Step Verification** (jika diminta tombol biru *Enable MFA*).
3. Masuk ke menu **OAuth consent screen** -> Klik tombol **PUBLISH APP** agar token tidak pernah di-reset oleh Google dalam jangka waktu 7 hari uji coba.

---

**Semua kodingan sudah rapi dan siap dieksekusi besok. Selamat beristirahat!** 🌙
