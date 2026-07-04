# Database Schema & Planning - ShiningSunBookingClass
**Architecture:** Multi-Branch Isolation Layer  
**Database Paradigm:** Relational Database Management System (RDBMS) - Rekomendasi: PostgreSQL / MySQL  

---

## 1. Prinsip Utama Keamanan Data (Tenant Isolation)
Seluruh tabel transaksi dan master data wajib memiliki kolom `branch_id`. Akses data di tingkat API harus difilter secara ketat berdasarkan `branch_id` yang tersemat pada token otentikasi pengguna, **BUKAN** berdasarkan parameter kiriman dari *request body* atau *query string* halaman depan.

---

## 2. Struktur Tabel Logis (Data Dictionary)

### 2.1. Tabel: `branches` (Buku Induk Cabang)
Menyimpan entitas bisnis utama. Seluruh data operasional tunduk pada ID di tabel ini.
| Nama Kolom | Tipe Data | Atribut / Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | UUID / BigInt | Primary Key, Auto Increment | ID Unik Cabang |
| `name` | VARCHAR(150) | Not Null | Nama Cabang (misal: Shining Sun Surabaya) |
| `address` | TEXT | Nullable | Alamat fisik cabang |
| `is_active` | BOOLEAN | Default: True, Not Null | Status operasional cabang |
| `created_at` | TIMESTAMP | Default: CURRENT_TIMESTAMP | Log waktu pembuatan |

### 2.2. Tabel: `users` (Manajemen Akun Internal)
| Nama Kolom | Tipe Data | Atribut / Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | UUID / BigInt | Primary Key | ID Unik User |
| `branch_id` | UUID / BigInt | Foreign Key (`branches.id`), Nullable | Kosong jika Superadmin, Terisi jika Admin Cabang |
| `name` | VARCHAR(100) | Not Null | Nama lengkap pengguna |
| `email` | VARCHAR(150) | Unique, Not Null | Kredensial login |
| `password` | VARCHAR(255) | Not Null | Hash password (terenkripsi) |
| `role` | ENUM | ('SUPERADMIN', 'BRANCH_ADMIN') | Hak akses tingkat sistem |

### 2.3. Tabel: `labels` (Master Level & Tingkatan)
Menyimpan data tingkatan siswa. Mendukung data bawaan sistem dan data kustom cabang.
| Nama Kolom | Tipe Data | Atribut / Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | UUID / BigInt | Primary Key | ID Unik Label |
| `branch_id` | UUID / BigInt | Foreign Key (`branches.id`), Nullable | **NULL** jika merupakan 15 Fixed Labels Pusat |
| `main_level` | VARCHAR(100) | Not Null | Nama Utama Level (e.g., "Montessori A") |
| `sub_level` | VARCHAR(50) | Not Null | Nama Warna (e.g., "Kuning Muda") |
| `hex_color` | VARCHAR(7) | Not Null | Kode Hex Warna (e.g., "#FEF08A") |
| `is_system_default`| BOOLEAN | Default: False, Not Null | **True** untuk 15 Label Bawaan (Proteksi Hapus) |

### 2.4. Tabel: `classes` (Master Ruangan / Jenis Kelas)
| Nama Kolom | Tipe Data | Atribut / Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | UUID / BigInt | Primary Key | ID Unik Kelas |
| `branch_id` | UUID / BigInt | Foreign Key (`branches.id`), Not Null | Kunci relasi isolasi cabang |
| `name` | VARCHAR(100) | Not Null | Nama Kelas (e.g., "Kelas Star", "Kelas Sun") |
| `max_quota` | INTEGER | Not Null, Default: 4 | Kapasitas maksimum siswa per sesi |

### 2.5. Tabel: `students` (Buku Induk Siswa Cabang)
| Nama Kolom | Tipe Data | Atribut / Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | UUID / BigInt | Primary Key | ID Unik Siswa |
| `branch_id` | UUID / BigInt | Foreign Key (`branches.id`), Not Null | Kunci relasi isolasi cabang |
| `label_id` | UUID / BigInt | Foreign Key (`labels.id`), Nullable | **Wajib Terisi** jika status = 'REGISTERED' |
| `name` | VARCHAR(150) | Not Null | Nama Lengkap Siswa |
| `date_of_birth` | DATE | Not Null | Digunakan untuk kalkulasi usia dinamis di API |
| `status` | ENUM | ('CG', 'REGISTERED') | CG = Coba Gratis, REGISTERED = Reguler |
| `registration_date`| DATE | Not Null | Tanggal pendaftaran untuk tracking historis |

### 2.6. Tabel: `schedule_slots` (Master Sesi Jadwal / Transaksi Slot)
Tabel ini mencatat pembukaan slot waktu operasional pada kalender.
| Nama Kolom | Tipe Data | Atribut / Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | UUID / BigInt | Primary Key | ID Unik Slot Jadwal |
| `branch_id` | UUID / BigInt | Foreign Key (`branches.id`), Not Null | Kunci relasi isolasi cabang |
| `class_id` | UUID / BigInt | Foreign Key (`classes.id`), Not Null | Relasi ke jenis ruangan kelas |
| `date` | DATE | Not Null (Format: YYYY-MM-DD) | Tanggal sesi |
| `time` | TIME | Not Null (Format: HH:MM) | Jam mulai sesi |
| `is_locked` | BOOLEAN | Default: False, Not Null | True jika slot dikunci (Libur/Tutup) |

### 2.7. Tabel Pivot: `schedule_student` (Relasi Transaksi Jadwal & Siswa)
Menggantikan konsep penyimpanan berbasis *Array* untuk menjaga integritas data relasional dan mempermudah agregasi kuota secara atomik.
| Nama Kolom | Tipe Data | Atribut / Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `schedule_slot_id`| UUID / BigInt | Foreign Key (`schedule_slots.id`), On Delete Cascade | Relasi ke slot jadwal |
| `student_id` | UUID / BigInt | Foreign Key (`students.id`), On Delete Cascade | Relasi ke siswa terdaftar |

---

## 3. Strategi Indexing & Optimasi Query
Untuk mencegah penurunan performa (*lagging*) saat memuat matriks kalender bulanan yang padat, *Developer* **wajib** menerapkan *Composite Indexing* pada kombinasi kolom berikut:
1.  `INDEX idx_schedule_lookup ON schedule_slots (branch_id, date, class_id);`
2.  `INDEX idx_student_branch ON students (branch_id, status);`

---

## 4. PM Risk Assessment (Risiko Database & Integritas)
* **Race Condition pada Perhitungan Kuota:** Jika dua kasir menekan tombol "Simpan Jadwal" di detik yang sama untuk slot sisa 1 kursi, query `COUNT` standar dapat kecolongan (*double-book*).  
    *Mitigasi bagi Developer:* Proses penyimpanan wajib dibungkus dalam **Database Transaction** dengan klausa `SELECT ... FOR UPDATE` (Pessimistic Locking) pada tabel `schedule_slots` sebelum menyisipkan baris baru ke tabel pivot `schedule_student`.
* **Aksi Penghapusan Berbahaya (Data Purge Risk):** Penghapusan label kustom atau penutupan kelas secara ceroboh dapat memutuskan relasi riwayat booking masa lalu.  
    *Mitigasi bagi Developer:* Gunakan pendekatan *Soft Delete* (kolom `deleted_at`) atau pasang constraint `RESTRICT` pada relasi kunci asing (`Foreign Key Constraints`) agar sistem menolak penghapusan jika data master tersebut sedang digunakan oleh entitas siswa atau jadwal aktif.