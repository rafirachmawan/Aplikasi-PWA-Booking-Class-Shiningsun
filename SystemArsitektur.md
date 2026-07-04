# System Architecture & User Flows - ShiningSunBookingClass
**Document Purpose:** Blueprint Alur Logika Bisnis & Alur Kerja Pengguna Mutlak  

---

## 1. Arsitektur Komunikasi Sistem
Aplikasi ini beroperasi menggunakan model komunikasi *Client-Server decoupled*. Antarmuka PWA di sisi klien mengirimkan instruksi terstruktur via protokol HTTPS RESTful API ke Backend Engine, yang kemudian memprosesnya ke Database dengan isolasi data berbasis *Branch ID Token*.

---

## 2. Alur Pengguna (Detailed User Flows)

### 2.1. Alur Manajemen Setup Master Data (Admin Cabang)
1. Admin Cabang melakukan Login via aplikasi PWA.
2. Sistem menerbitkan Token JWT yang mengunci properti `branch_id = X`.
3. Admin masuk ke halaman **Master Data Cabang**.
4. **Setup Kelas:** Admin mengisi form nama kelas dan kapasitas kuota -> Klik Simpan -> API memasukkan data dengan otomatis menyisipkan `branch_id = X`.
5. **Setup Label Custom:** Admin menginput Nama Tingkatan Utama (*free text*) -> Memilih Warna dari Dropdown Warna -> Sistem menangkap nama warna untuk mengisi *Sub Level* secara otomatis dan mengambil kode *Hex Color* -> Klik Simpan.

### 2.2. Alur Pendaftaran & Konversi Siswa
1. Admin membuka modul **Buku Induk Siswa**.
2. **Skenario Siswa CG (Coba Gratis):**
   - Admin mengisi data nama, tanggal daftar, dan tanggal lahir -> Sistem mengeksekusi fungsi kalkulator usia -> Menampilkan output riil di UI (misal: "3 Tahun 2 Bulan") -> Memilih status sebagai "CG" -> Klik Simpan. *(Label/Level dikosongkan pada tahap ini)*.
3. **Skenario Konversi ke Reguler:**
   - Admin membuka tab daftar Siswa CG -> Memilih tombol "Masukkan ke Reguler".
   - Sistem membuka jendela validasi wajib. **Tombol "Simpan Konversi" dalam keadaan terkunci (Disabled)** selama Admin belum memilih Label/Level resmi dari dropdown.
   - Admin memilih salah satu tingkatan (dari 15 Label Paten atau Label Custom cabang) -> Tombol aktif -> Klik Simpan -> Status siswa di database berubah menjadi `REGISTERED` dan `label_id` terikat permanen.

### 2.3. Alur Mesin Penjadwalan (Core Scheduling Mechanism)

#### Skenario A: Mode Manual (Fleksibel per Sesi)
```
[Pilih Siswa] -> [Pilih Tanggal Acak via Kalender] -> [Masuk Keranjang Draft]
                                                            |
[Sesuaikan Jam & Jenis Kelas secara Spesifik Per Tanggal di dalam Draft]
                                                            |
                                                   [Klik Simpan Jadwal]
                                                            |
                                             [Jalankan Lapis Validasi API]
                                                            |
                                            (Lolos) -> [Commit ke Database]
```

#### Skenario B: Mode Otomatis (Generasi Ruting 1 Bulan)
1. Admin mengaktifkan opsi **Mode Otomatis (1 Bulan)** pada modul penjadwalan.
2. Admin merancang pola pertemuan rutin **hanya untuk periode Minggu Pertama** (Contoh: Menetapkan Hari Senin Tanggal 1 Jam 08:00 Kelas Star, dan Hari Jumat Tanggal 5 Jam 10:00 Kelas Sun).
3. Admin menekan tombol "Simpan (Otomatis 1 Bulan)".
4. **Logika Backend Engine:**
   - Mengamankan data pola Minggu Pertama.
   - Menjalankan fungsi perulangan (*looping iterator*) sebanyak 3 siklus ke depan.
   - Pada tiap siklus, sistem menambahkan nilai waktu absolut sebanyak `+7 hari` secara matematis (Siklus 2 = Tanggal Pola + 7; Siklus 3 = Tanggal Pola + 14; Siklus 4 = Tanggal Pola + 21).
   - Seluruh baris tanggal baru hasil replikasi tersebut dikumpulkan ke dalam satu susunan data (*array array transaksi*).
   - Seluruh susunan dikirim ke Mesin Validasi sebelum eksekusi penyimpanan massal.

---

## 3. Logika Lapis Validasi Bisnis (Background Guard Flow)
Saat susunan data jadwal (baik dari Mode Manual maupun Otomatis) diterima oleh API, sistem akan menjalankan fungsi pengecekan berurutan per slot sesi:

1.  **Cek Status Kunci (`is_locked`):** Jika kolom `is_locked == true` pada slot tersebut, lemparkan perkecualian: *"Slot Kelas Sedang Diliburkan/Ditutup secara Operasional!"* -> Batalkan Transaksi.
2.  **Cek Kapasitas Kuota (`max_quota`):** Sistem menghitung jumlah baris aktif pada tabel pivot `schedule_student` untuk `schedule_slot_id` terkait. Jika hasil `COUNT >= max_quota`, lemparkan perkecualian: *"Kapasitas Sesi Kelas Sudah Penuh!"* -> Batalkan Transaksi.
3.  **Cek Konflik Level (Homogenitas):**
    * Sistem memeriksa properti `status` dari siswa yang akan dimasukkan.
    * Jika status siswa adalah `CG`, loloskan langsung ke tahap penyimpanan (Abaikan pengecekan level karena siswa trial bersifat fleksibel/bebas menumpang).
    * Jika status siswa adalah `REGISTERED`, sistem mencari tahu apakah sudah ada siswa berstatus `REGISTERED` lain yang terdaftar di slot tersebut.
    * Jika sudah ada, bandingkan `label_id` siswa baru dengan `label_id` siswa yang sudah ada di dalam slot.
    * Jika `label_id` TIDAK SAMA, blokir pendaftaran dan lemparkan peringatan: *"Bentrok Tingkatan! Kelas ini hanya untuk level [Nama Level Terdaftar]."* -> Batalkan Transaksi.
4.  Jika seluruh pemeriksaan di atas menghasilkan status aman, lakukan **Database Commit** secara menyeluruh.

---

## 4. PM Risk Assessment (Risiko Alur & Sinkronisasi)
* **Risiko Kegagalan Parsial pada Replikasi Otomatis:** Pada Mode Otomatis 1 Bulan, ada kemungkinan minggu ke-2 dan ke-3 aman, namun pada minggu ke-4 slot kelas yang dituju ternyata sudah penuh atau dikunci oleh admin untuk libur nasional. Jika sistem menyisipkan data secara parsial, data jadwal akan berantakan.  
    *Mitigasi bagi Developer:* Proses iterasi 1 bulan penuh harus dieksekusi di dalam satu payung **Database Transaction**. Jika ada satu saja dari total belasan slot replikasi yang gagal menembus lapis validasi kuota/kunci/level, seluruh proses generasi 1 bulan tersebut wajib dibatalkan secara utuh (*Rollback secara Total*) dan API mengembalikan pesan spesifik pada tanggal mana kegagalan validasi tersebut terjadi.