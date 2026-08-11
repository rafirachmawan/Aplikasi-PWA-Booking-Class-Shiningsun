# 🔧 Setup Upload Google Drive — Langkah Terakhir

> **Status**: ⏳ Tinggal 1 langkah terakhir (verifikasi HP)
> **Estimasi waktu**: 5 menit
> **Syarat**: HP POCO C75 (akun shiningsunbalesono@gmail.com) harus ada di tangan

---

## ✅ Yang Sudah Selesai

- [x] Buat Project di Google Cloud Console (`ShiningSun Booking Class`)
- [x] Aktifkan Google Drive API
- [x] Buat Service Account (tidak bisa dipakai di Gmail pribadi)
- [x] Buat OAuth2 Client ID (`Web application`)
- [x] Konfigurasi OAuth consent screen
- [x] Tambahkan Authorized redirect URIs
- [x] Kode API upload-gdrive sudah dibuat di aplikasi
- [x] Kode OAuth callback sudah dibuat di aplikasi
- [x] `.env.local` sudah diisi Client ID & Client Secret

---

## 📋 Langkah Besok (Tinggal 1x Saja!)

### Langkah 1: Jalankan Server Lokal

```bash
npm run dev
```

### Langkah 2: Buka URL Otorisasi Google Drive

Buka di browser:

```
http://localhost:3000/api/auth/gdrive
```

### Langkah 3: Login & Verifikasi

1. Pilih akun **shiningsunbalesono@gmail.com**
2. Google akan kirim notifikasi ke **HP POCO C75**
3. **Ketuk angka** yang muncul di layar laptop pada HP tersebut
4. Klik tombol **Izinkan / Allow** di browser

### Langkah 4: Salin Refresh Token

Setelah berhasil, akan muncul halaman hijau bertuliskan:
```
✅ Google Drive Berhasil Terhubung!
```

Salin **Refresh Token** yang ditampilkan.

### Langkah 5: Paste ke `.env.local`

Buka file `.env.local` di project, cari baris:

```env
GOOGLE_DRIVE_REFRESH_TOKEN=
```

Ganti menjadi:

```env
GOOGLE_DRIVE_REFRESH_TOKEN=paste_refresh_token_disini
```

### Langkah 6: Restart Server

```bash
# Tekan Ctrl+C untuk stop server, lalu jalankan ulang:
npm run dev
```

---

## 🎉 Selesai!

Setelah langkah di atas, fitur upload foto di form **Tambah Laporan Perkembangan** akan:
- ✅ Guru tinggal klik tombol **📁 Pilih Foto dari HP / Laptop**
- ✅ Foto otomatis ter-upload ke folder **"Lembar Perkembangan"** di Google Drive
- ✅ Link Google Drive otomatis terisi di form laporan
- ✅ Tidak perlu login Google lagi selamanya (refresh token permanen)

---

## 📂 File-File Terkait di Project

| File | Fungsi |
|------|--------|
| `.env.local` | Konfigurasi OAuth2 credentials |
| `src/app/api/auth/gdrive/route.ts` | Redirect ke halaman login Google |
| `src/app/api/auth/gdrive/callback/route.ts` | Menerima callback & menampilkan refresh token |
| `src/app/api/upload-gdrive/route.ts` | API upload file ke Google Drive |
| `src/components/features/worksheets/WorksheetFormModal.tsx` | UI tombol upload foto di form laporan |
| `src/lib/gdriveUtils.ts` | Utility extract file ID & generate preview link |

---

## ⚠️ Catatan Penting

- **Refresh token ini PERMANEN** — tidak perlu diperbarui kecuali mas mencabut izin akses di Google Account Settings
- **Jangan share `.env.local`** ke publik karena berisi kredensial rahasia
- Semua foto yang diupload akan masuk ke folder Google Drive: **Lembar Perkembangan** (Folder ID: `1FkTsGGFmRCOzh8Zb2GeDHNyo3s7HK3bd`)
- Kuota penyimpanan menggunakan **Google Drive pribadi (15 GB gratis)**

---

> 💡 **Untuk deploy di Vercel**: Setelah mendapatkan refresh token, tambahkan juga variabel environment yang sama di **Vercel Dashboard → Settings → Environment Variables**:
> - `GOOGLE_OAUTH_CLIENT_ID`
> - `GOOGLE_OAUTH_CLIENT_SECRET`
> - `GOOGLE_DRIVE_FOLDER_ID`
> - `GOOGLE_DRIVE_REFRESH_TOKEN`
