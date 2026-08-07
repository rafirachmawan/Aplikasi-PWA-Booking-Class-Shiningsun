# 📄 Rencana Spesifikasi & Implementasi Fitur: Lembar Kerja Siswa & Portal Orang Tua

Dokumen ini berisi analisis kapasitas, arsitektur teknis, perancangan skema database, alur pengguna, dan tahapan implementasi fitur **Lembar Kerja Siswa** dengan integrasi **Google Drive** serta **Portal Orang Tua (Tanpa Beban Server / 100% Free Tier Safe)**.

---

## 📊 1. Analisis Kapasitas & Evaluasi Risiko (Anti-Jebol)

Kekhawatiran utama client adalah **aplikasi jebol / melebihi limit berbayar** saat dipakai 200–500 siswa & orang tua. Berikut adalah analisis resminya:

### Tabel Perbandingan Limit Free Tier vs Estimasi Penggunaan:

| Parameter Server | Limit Free Tier | Estimasi Penggunaan (500 Siswa) | Status |
| :--- | :--- | :--- | :--- |
| **Supabase Auth (MAU)** | 50.000 Active Users / bulan | ~500 orang tua | 🟢 **SANGAT AMAN** (Baru 1% dari limit) |
| **Supabase Database Size** | 500 MB | ~10–20 MB (Data teks & nilai) | 🟢 **SANGAT AMAN** |
| **Supabase Bandwidth** | 5 GB / bulan | ~100–300 MB / bulan | 🟢 **SANGAT AMAN** |
| **Vercel Bandwidth** | 100 GB / bulan | ~2–5 GB / bulan | 🟢 **SANGAT AMAN** |
| **File Storage** | 1 GB (Supabase) | **0 Bytes** (Menggunakan Google Drive) | 🟢 **SANGAT AMAN** |

### ⚠️ Titik Rawan yang Berhasil Dihindari:
* **Upload Foto/PDF Mentah ke Supabase**: Jika foto lembar kerja (3–8 MB/foto) disimpan di Supabase Storage, 1 GB akan habis dalam beberapa minggu.
* **Solusi**: File fisik disimpan di **Google Drive**, aplikasi hanya menyimpan string URL (link) pendek di database.

---

## 🎯 2. Ringkasan & Tujuan Fitur

1. **Lembar Kerja Siswa (Student Worksheets / Progress Reports)**:
   - Guru/Admin dapat mencatat laporan perkembangan, materi pembelajaran, tanggal pelaksanaan, serta melampirkan **Link Google Drive** file lembar kerja/tugas siswa.
2. **Portal Orang Tua (Parent Portal)**:
   - Orang tua siswa dapat mengakses dan melihat daftar lembar kerja serta laporan perkembangan anak mereka dari HP masing-masing.
3. **Efisiensi & Skalabilitas**:
   - **0 Bytes File Storage di Supabase**: File lembar kerja fisik (PDF/Foto) di-host sepenuhnya di Google Drive sekolah.
   - **0 Bytes Bandwidth Egress**: Vercel & Supabase hanya memproses data teks/JSON singkat.

---

## 🔑 3. Mekanisme Akses Orang Tua (Parent Portal)

### Perbandingan Opsi Login Orang Tua:

| Kriteria | Opsi A: PIN / Kode Unik Siswa (*Rekomendasi Utama*) | Opsi B: Supabase Auth Email & Password |
| :--- | :--- | :--- |
| **Kemudahan Orang Tua** | ⭐⭐⭐⭐⭐ Sangat Mudah (Tanpa daftar/ingat email) | ⭐⭐⭐ Harus ingat email & password |
| **Beban Layanan** | ⭐⭐⭐⭐⭐ Bebas kendala lupa password | ⭐⭐ Rawan lupa password & butuh reset |
| **Sistem Login** | Input Nama Siswa / ID + Kode Akses (PIN) | Form Login Supabase standar |

### Alur Akses Orang Tua (Opsi A - PIN Akses):
1. Orang tua membuka route khusus: `/rapor` atau `/portal-ortu`.
2. Orang tua memasukkan **Nama Siswa / ID Siswa** + **PIN Akses** (diberikan oleh pihak sekolah).
3. Setelah validasi PIN berhasil, sistem menyimpan token/cookie sesi singkat di HP orang tua.
4. Orang tua langsung dialihkan ke dashboard tampilan laporan & lembar kerja khusus anak mereka.

---

## 📁 4. Alur Kerja File Google Drive (Guru ➔ Database ➔ Orang Tua)

1. **Sisi Guru / Admin**:
   - Guru mengunggah file lembar kerja/tugas ke folder Google Drive milik cabang/sekolah.
   - Hak akses file diset *"Siapa saja yang memiliki link dapat melihat"*.
   - Guru meng-copy link file dan memasukkannya ke input field **"Link Google Drive"** pada form Lembar Kerja Siswa.
2. **Sisi System / Database**:
   - Database hanya menyimpan teks URL (contoh: `https://drive.google.com/file/d/1A2B3C.../view`).
3. **Sisi Orang Tua**:
   - Tampil tombol: `[ 📄 Unduh / Lihat Lembar Kerja ]`.
   - Saat diklik, file langsung terbuka / terunduh via server Google Drive (tanpa menyedot bandwidth Vercel/Supabase).

---

## 🗄️ 5. Desain Skema Database (Supabase SQL)

Tabel baru: `student_worksheets`

```sql
-- Create table for Lembar Kerja Siswa
CREATE TABLE public.student_worksheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- Contoh: "Lembar Kerja - Modul 1 Montessori"
    description TEXT, -- Catatan perkembangan / evaluasi guru
    worksheet_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gdrive_link TEXT, -- Link file Google Drive (URL)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing untuk pencarian cepat berdasarkan siswa & tanggal
CREATE INDEX idx_student_worksheets_student ON public.student_worksheets(student_id);
CREATE INDEX idx_student_worksheets_date ON public.student_worksheets(worksheet_date);

-- Opsional: Tambahan kolom PIN / Kode Akses pada tabel students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS access_pin VARCHAR(10) DEFAULT '123456';
```

---

## 🔗 6. Integrasi Helper Link Google Drive

Untuk memastikan link Google Drive nyaman digunakan oleh orang tua, sistem akan menyediakan fungsi konversi otomatis dari URL pratinjau menjadi link unduhan langsung:

```typescript
// src/lib/gdriveUtils.ts

/**
 * Mengubah URL pratinjau Google Drive menjadi URL langsung / download
 */
export function getGDriveDirectLink(url: string): string {
  if (!url) return '';
  
  // Extract File ID dari URL Google Drive
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  
  return url; // Return original jika bukan format standar
}
```

---

## 💻 7. Rencana Komponen & Halaman Baru

### Sisi Admin / Guru:
* **`src/app/(dashboard)/worksheets/page.tsx`**: Halaman manajemen lembar kerja siswa per cabang.
* **`src/components/features/worksheets/WorksheetFormModal.tsx`**: Form tambah/edit lembar kerja (Input judul, tanggal, catatan guru, dan paste link Google Drive).

### Sisi Orang Tua (Public Route):
* **`src/app/portal-ortu/page.tsx`**: Halaman login PIN Orang Tua.
* **`src/app/portal-ortu/dashboard/page.tsx`**: Tampilan khusus orang tua berisi:
  - Informasi Ringkas Siswa & Level
  - Daftar Lembar Kerja & Laporan Hasil Belajar
  - Tombol langsung untuk `[ 📄 Unduh / Lihat Lembar Kerja di Google Drive ]`

---

## 🚀 8. Checklist Langkah Implementasi (Saat Siap Dikerjakan)

- [ ] **Langkah 1**: Eksekusi script SQL tabel `student_worksheets` & `access_pin` di Supabase SQL Editor.
- [ ] **Langkah 2**: Tambahkan *Server Actions* CRUD di `src/lib/actions.ts` (`getWorksheetsByStudent`, `createWorksheet`, `deleteWorksheet`).
- [ ] **Langkah 3**: Buat antarmuka input Lembar Kerja di Dashboard Admin/Guru.
- [ ] **Langkah 4**: Buat halaman Portal Orang Tua (`/portal-ortu`) dengan verifikasi PIN.
- [ ] **Langkah 5**: Integrasikan parser link Google Drive untuk kenyamanan buka/unduh file di HP orang tua.
- [ ] **Langkah 6**: Pengujian akhir pada perangkat iOS & Android untuk memastikan daya tanggap dan tampilan yang rapi.

---
*Dokumen ini dibuat otomatis sebagai panduan resmi pengembangan fitur Lembar Kerja Siswa pada PWA ShiningSun Penjadwalan.*
