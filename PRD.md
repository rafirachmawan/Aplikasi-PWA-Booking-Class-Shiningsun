# Product Requirement Document (PRD) - ShiningSunBookingClass
**Version:** 1.0 (MVP Scope)  
**Author:** Senior Project Manager  
**Status:** Approved for Development  

---

## 1. Executive Summary & Objective
**ShiningSunBookingClass** adalah platform manajemen internal berbasis Progressive Web App (PWA) yang dirancang khusus untuk memfasilitasi pengelolaan kelas, pendaftaran siswa, dan mesin penjadwalan terisolasi di bawah arsitektur **Multi-Branch (Multi-Cabang)**. Sistem ini bertujuan untuk mengeleminasi kesalahan operasional seperti *overbooking*, bentrok tingkatan level (non-homogen), serta memangkas waktu administrasi melalui otomatisasi pembuatan jadwal bulanan.

## 2. User Personas & Otorisasi
Sistem ini memisahkan hak akses secara absolut demi menjaga keamanan operasional internal:
1. **Superadmin (Pusat):**
   - Memiliki visibilitas penuh terhadap semua cabang.
   - Mengelola pembuatan dan penonaktifan cabang (*Tenant Management*).
   - Memantau metrik agregat performa seluruh cabang.
2. **Branch Admin / Kasir (Cabang):**
   - Memiliki akses *full* terisolasi secara absolut hanya untuk cabangnya sendiri.
   - Tidak dapat melihat, mengubah, atau mengintervensi data cabang lain.
   - Bertanggung jawab atas operasional harian: setup kelas, pendaftaran siswa, konversi status, dan eksekusi mesin penjadwalan.

---

## 3. Fitur Utama MVP (Must-Have Requirements)

### 3.1. Master Data & Kustomisasi Cabang
* **Manajemen Kelas & Kuota:** Admin Cabang dapat menambahkan ruangan/jenis kelas dan menentukan kapasitas maksimal (kuota sesi) secara dinamis.
* **Sistem Manajemen Label / Level Tingkatan:**
    * **15 Fixed Labels (Paten):** Sistem menyediakan 15 tingkatan bawaan secara global yang terkunci (Montessori A, Montessori B, Level 1, Level 2, Level 3; masing-masing memiliki 3 variasi warna bawaan). Label ini tidak dapat dihapus atau diubah oleh Admin Cabang.
    * **Custom Labels (Fleksibel):** Admin Cabang dapat menambahkan label khusus yang hanya berlaku di cabangnya. 
    * *Logic Input:* Bidang *Main Level* berupa input teks bebas. Bidang *Sub Level* diisi menggunakan Dropdown Warna terintegrasi; saat warna dipilih, nama sub-level otomatis terisi dengan nama warna tersebut untuk standarisasi pencarian.

### 3.2. Manajemen Buku Induk Siswa
* **Kategorisasi Status:** Siswa didaftarkan sebagai **Siswa CG (Coba Gratis / Trial)** atau **Siswa Reguler (Registered)**. Tanggal pendaftaran wajib dicatat secara historis.
* **Kalkulasi Usia Otomatis Pintar:** Sistem wajib mendeteksi tanggal lahir siswa dari berbagai format input (lokal tekstual seperti "07 agustus 2023" maupun numerik "07/08/2023") dan menghitung usia riil secara otomatis hingga satuan bulan (Contoh keluaran: *2 Tahun 10 Bulan*).
* **Mesin Konversi Status:** Tab tampilan memisahkan daftar Siswa CG dan Reguler. Siswa CG dapat dikonversi menjadi Reguler dalam satu klik, dengan syarat wajib mengikatkan siswa tersebut pada salah satu Label/Level resmi sebelum disimpan.

### 3.3. Core Engine: Mesin Penjadwalan & Kalender Matriks
* **Visualisasi Dashboard:** Kalender matriks bulanan dan mingguan yang menampilkan status keterisian slot secara real-time.
* **Mode Penjadwalan Manual:** Admin memilih beberapa tanggal acak masuk ke dalam *draft keranjang*. Sebelum finalisasi, Jam dan Kelas dapat disesuaikan secara spesifik dan berbeda untuk tiap tanggal di dalam draft.
* **Mode Penjadwalan Otomatis (Generasi 1 Bulan):** Admin menyusun pola jadwal rutin hanya pada **Minggu Pertama** (misal: Senin Jam 08:00 Kelas Star, Jumat Jam 10:00 Kelas Sun). Ketika tombol "Simpan Otomatis 1 Bulan" ditekan, sistem mereplikasi pola tersebut secara matematis ke minggu ke-2, ke-3, dan ke-4 ke depan (total 4 pertemuan per sesi pola).

---

## 4. Sistem Validasi Bisnis (Background Guard)
Setiap kali transaksi jadwal akan disimpan ke database, sistem wajib mengeksekusi tiga lapis validasi berikut secara berurutan:
1.  **Slot Lock Validation:** Memeriksa apakah slot waktu/kelas tersebut sedang dikunci oleh admin (karena libur/pembersihan operasional). Jika terkunci, tolak pendaftaran.
2.  **Overbooking Prevention:** Memeriksa apakah jumlah siswa terdaftar di slot tersebut sudah mencapai batas `max_quota` kelas. Jika penuh (misal 4/4), sistem wajib memblokir pendaftaran baru.
3.  **Level Homogeneity Validation (Konflik Level):** * Untuk Kelas Reguler, sifatnya harus homogen. Jika slot sudah terisi oleh siswa berlabel *Montessori A*, maka siswa berlabel *Level 1* akan ditolak dengan notifikasi peringatan.
    * *Pengecualian CG:* Siswa dengan status Coba Gratis bersifat fleksibel dan diizinkan "numpang" masuk ke dalam slot level mana pun tanpa memicu konflik level.

---

## 5. Fitur Post-MVP (Nice-to-Have / Fase 2)
1.  **Auto-Fill via WhatsApp Parser:** Fitur membaca teks formulir mentah dari WA orang tua dan memetakan datanya secara otomatis ke kolom input pendaftaran (ditunda untuk menjaga akurasi data di awal rilisan).
2.  **Interactive Drag-and-Drop / Swap Reschedule:** Mekanisme pemindahan jadwal interaktif langsung di atas UI Kalender menggunakan metode geser-dan-lepas. Pada MVP, pemindahan jadwal dilakukan secara konvensional (Hapus jadwal lama -> Daftarkan ke jadwal baru).

---

## 6. PM Risk Assessment (Penilaian Risiko Produk)
* **Risiko Kompleksitas Validasi Valid:** Karena adanya pengecualian untuk siswa CG di tengah kelas homogen, algoritma pengecekan level berpotensi mengalami kebocoran logika jika tidak diuji secara menyeluruh melalui skenario *edge cases* (misal: jika kelas hanya berisi 3 siswa CG, lalu ada 1 siswa Reguler masuk, level kelas tersebut harus langsung terkunci mengikuti level siswa Reguler pertama tersebut).
* **Risiko PWA State Desynchronization:** Mengingat platform ini adalah PWA yang berjalan di perangkat *mobile/tablet* admin cabang, kegagalan koneksi internet sesaat dapat menyebabkan ketidaksesuaian tampilan kalender jika mekanisme *state management* tidak menangani status *offline/loading* dengan proteksi *read-only*.