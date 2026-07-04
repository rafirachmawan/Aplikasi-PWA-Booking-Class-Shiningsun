# Daftar Sisa Pekerjaan (To-Do List) - ShiningSun PWA

Aplikasi PWA ini sudah memiliki fondasi *Frontend* dan *Backend* yang sangat kokoh. Sebagian besar fitur UI, koneksi Supabase, dan form pembuatan data sudah rampung.

Berikut adalah daftar pekerjaan (PR) yang belum dikerjakan dan bisa Anda lanjutkan esok hari. Daftar ini diurutkan berdasarkan skala prioritas:

## 1. Modul Penjadwalan: Booking Siswa ke Slot (Prioritas Tinggi)
Saat ini, admin sudah bisa membuat slot kelas di matriks kalender, tetapi **belum bisa memasukkan (booking) siswa ke dalam kelas tersebut.**
- **Tugas UI:** Saat tombol "Booking Siswa" di laci manajemen jadwal diklik, tampilkan daftar *dropdown* (atau modal) yang memuat nama-nama siswa aktif.
- **Tugas Backend:** Buat Server Action `bookStudentToSlot(student_id, schedule_id)` yang akan memasukkan data ke tabel `schedule_student`.
- **Validasi (Penting):** Tambahkan logika untuk mengecek apakah jumlah siswa yang sudah *booking* kurang dari `max_quota` kelas. Jika penuh, tolak proses *booking*.

## 2. Modul Penjadwalan: Fitur Kunci Slot (Slot Lock)
Sesuai rancangan arsitektur, tutor berhak menutup pendaftaran kelas (mengunci) meskipun kuota masih ada.
- **Tugas UI:** Tambahkan tombol/ikon "Gembok" (Lock) pada setiap sesi kelas di laci manajemen jadwal.
- **Tugas Backend:** Buat fungsi `toggleLockStatus(schedule_id, is_locked)` untuk meng-*update* nilai `is_locked` di tabel `schedule_slots`.

## 3. Fitur Hapus & Edit (Full CRUD)
Saat ini kita baru menyelesaikan bagian *Create* (Membuat) dan *Read* (Membaca). Di dunia nyata, admin sering melakukan kesalahan ketik.
- **Tugas:** Tambahkan fungsi "Edit" dan "Hapus" pada halaman:
  - Buku Induk Siswa (misal: meralat tanggal lahir atau mengeluarkan siswa).
  - Jadwal Kelas (menghapus jadwal kelas yang salah tanggal/jam).
  - Master Data (meralat nama ruang kelas atau menghapus label kustom).

## 4. Instalasi PWA (Progressive Web App) Asli
Meski aplikasinya sudah responsif layaknya HP, ini masih berupa *website* biasa. Kita perlu menyulapnya menjadi aplikasi yang bisa di-install (*Add to Homescreen*).
- **Tugas:** Integrasikan *library* `next-pwa` atau `@serwist/next`.
- **Tugas:** Buat file `manifest.json` yang berisi ikon logo ShiningSun, tema warna dasar, dan nama aplikasi.
- **Hasil Akhir:** Muncul tombol "Install App" saat admin membuka link website ini di Google Chrome HP mereka.

## 5. Autentikasi Login Cabang (Tahap Akhir)
Saat ini, semua data diarahkan ke satu cabang statis (`DEFAULT_BRANCH_ID`). Ketika aplikasi akan dirilis ke banyak cabang, setiap cabang butuh *password*.
- **Tugas:** Setup Supabase Auth (Email/Password).
- **Tugas UI:** Buat halaman Login.
- **Logika:** Setelah admin login, tarik `branch_id` dari profil mereka, lalu terapkan ID tersebut secara otomatis ke semua tabel di Dashboard (tidak lagi *hardcoded*).
