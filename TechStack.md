# Technology Stack Specification - ShiningSunBookingClass
**Target Platform:** Progressive Web App (PWA)  
**Deployment Model:** Monolithic API / Single-Tenant Codebase dengan Multi-Tenant Database Isolation  

---

## 1. Frontend Layer (Antarmuka Pengguna PWA)
Komponen halaman depan dirancang agar responsif tinggi saat diakses melalui perangkat tablet atau smartphone oleh admin cabang di lapangan.

* **Core Framework:** **React.js** atau **Next.js (Client-Side Rendering Focus)**.
    - *Alasan:* Ekosistem komponen UI yang matang untuk kalender dan performa manipulasi DOM state yang cepat saat mengelola *draft keranjang* penjadwalan manual.
* **PWA Engine:** **Workbox / Service Workers**.
    - *Kebutuhan Mutlak:* PWA wajib dikonfigurasi untuk memiliki kemampuan caching aset statis dan *manifest.json* agar aplikasi dapat diinstal langsung ke *home screen* perangkat admin cabang (Android/iOS) tanpa melalui App Store/Play Store.
* **State Management:** **React Context API** atau **Zustand**.
    - *Alasan:* Dibutuhkan pengelolaan state global yang efisien untuk menyimpan antrean *draft* tanggal jadwal manual sebelum dikirim secara kolektif ke backend.
* **Styling & UI Components:** **Tailwind CSS**.
    - *Alasan:* Menjamin fleksibilitas pewarnaan dinamis menggunakan utilitas class untuk menampilkan kode *Hex Color* dari label kustom/paten secara presisi.

---

## 2. Backend API Layer (Logika Bisnis & Validasi)
Komponen belakang bertanggung jawab penuh atas seluruh komputasi matematis dan penegakan aturan validasi bisnis.

* **Core Runtime & Framework:** **Node.js (NestJS / Express)** ATAU **PHP (Laravel 10+)**.
    - *Alasan:* Keduanya memiliki dukungan ekosistem yang sangat kuat untuk menangani *Database Transactions*, *Date-Time Manipulation* tingkat lanjut, dan pembuatan tugas terjadwal (*cron jobs*).
* **Date-Time Engine:** **Moment.js**, **Luxon**, atau **Carbon (jika Laravel)**.
    - *Kebutuhan Mutlak:* Pustaka manipulasi tanggal sangat krusial untuk:
        1. Menghitung jarak usia dari tanggal lahir hingga tingkat bulan secara presisi.
        2. Melakukan kalkulasi tanggal absolut matematika (`+7 days` secara iteratif) pada mesin generasi jadwal otomatis 1 bulan tanpa terpengaruh anomali bulan kabisat atau pergantian tahun.

---

## 3. Database & Storage Layer
* **Primary Database:** **PostgreSQL** atau **MySQL (Version 8.0+)**.
    - *Alasan:* Mendukung tingkat isolasi transaksi data yang tinggi, integritas referensial (Foreign Keys), dan performa agregasi query yang cepat melalui indexing yang tepat.
* **Database Seeder Engine:** Bawaan framework backend.
    - *Kebutuhan Mutlak:* Digunakan untuk menanamkan (*seed*) 15 Fixed Labels permanen secara otomatis saat sistem pertama kali dipasang di server produksi, dilindungi dengan bendera flag `is_system_default = true`.

---

## 4. Authentication & Security
* **Mechanism:** **JSON Web Token (JWT)** dengan algoritma enkripsi minimal HS256.
* **Payload Claims:** Token JWT wajib membawa informasi terenkripsi: `user_id`, `role`, dan `branch_id`. Setiap request ke API dilindungi oleh middleware otentikasi yang membaca klaum `branch_id` tersebut untuk menyuntikkan klausa pembatas data pada query database.

---

## 5. PM Risk Assessment (Risiko Teknologi & Ketergantungan)
* **Risiko Fragmentasi PWA pada iOS (Safari):** Service worker dan instalasi PWA pada perangkat iOS memiliki kebijakan pembatasan penyimpanan lokal (*storage eviction*) yang lebih ketat dibanding Android. Jika admin menggunakan iPad lama, aplikasi berisiko mengalami *logout* paksa atau kegagalan simpan cache aset.  
    *Mitigasi:* Pastikan arsitektur frontend tidak mengandalkan *Local Storage* untuk data-data transaksional krusial; gunakan penyimpanan lokal hanya untuk sesi token, sementara data jadwal murni ditarik langsung dari API secara real-time.
* **Kerentanan Format Parsing Tanggal Lahir Lokal:** Penggunaan string teks bebas dari parsing WhatsApp (Post-MVP) atau salah ketik input manual lokal (seperti mencampur penulisan "Agustus" dengan "August") dapat mematahkan pustaka datetime backend, menyebabkan error 500 (*Internal Server Error*).  
    *Mitigasi bagi Developer:* Buat modul *sanitizer/validator* tanggal yang ketat di sisi API sebelum data dikirim ke mesin kalkulator usia. Jika format tidak dikenali, lemparkan error balik (HTTP 422 Unprocessable Entity) dengan pesan instruksi yang ramah pengguna.