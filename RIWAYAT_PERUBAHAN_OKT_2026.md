# Riwayat Perubahan — Oktober 2026 (Belum di-push)

Dokumen ini mencatat **semua perubahan kode** dari awal sesi perbaikan sampai
14 Okt 2026, lengkap dengan before → after (logika + tampilan + kinerja).
Semua perubahan masih **uncommitted** di working copy lokal.

- **File tersentuh:** 7 file, `+666 / -45` (lihat `git diff --stat`)
- **Skema database:** tidak ada perubahan (tanpa migrasi)
- **Data produksi:** tidak diubah oleh kode; perbaikan data dilakukan manual via SQL (tercatat di §6)
- **Verifikasi:** `tsc --noEmit` bersih setiap batch + uji logika via node (hasil di §5)

---

## 1. Ringkasan

| # | Perubahan | File | Sifat |
|---|-----------|------|-------|
| B0.1 | Pindah jadwal (edit) diberi rollback | `src/lib/actions.ts` (`moveStudentBooking`) | Logika: urutan dibalik |
| B0.2 | Query jadwal bulanan dipaginasi + tiebreaker `id` | `src/lib/actions.ts` (`getMonthlySchedules`) | Logika baca: anti-potong 1000 baris |
| B0.3 | Daftar kelas diurut nama | `src/lib/actions.ts` (`getClasses`) | Tampilan: filter default stabil |
| B0.4 | Baris jam 12:00 & 17:00 ditambahkan ke grid | `ScheduleClientWrapper.tsx` (Jadwal), `TodaySchedule.tsx` (dashboard) | Tampilan: 2 baris baru |
| B1.1 | Auto/manual/copy menghormati gembok (`is_locked`) | `src/lib/actions.ts` (`autoBookStudentToClass`, `bookStudentManual`) | Logika: penolakan baru |
| B1.2 | Konstruksi tanggal kebal zona waktu | `src/lib/actions.ts` (`getMonthlySchedules`, `createScheduleSlot`) | Logika: hasil identik di UTC, benar di non-UTC |
| B2.1 | Panel "Kesiapan bulan depan" + tombol Salin per siswa | `SchedulingClientWrapper.tsx`, `scheduling/page.tsx`, `getStudentsWithNextMonthSchedule` (baru) | Fitur baca + aksi pakai fungsi lama |
| B2.2 | Kotak hasil penyalinan yang menetap | `SchedulingClientWrapper.tsx` | Tampilan: state baru, alur lama utuh |
| B2.3 | Konfirmasi hapus kelas menampilkan dampak | `ClassManager.tsx`, `getClassDeletionImpact` (baru) | Tampilan + 1 query baca |
| W.1 | Validasi jam manual form worksheet | `WorksheetFormModal.tsx`, `getStudentSessionTimes` (baru) | Logika: penolakan input mustahil |
| W.2 | Petunjuk kolom jam + format 24 jam | `WorksheetFormModal.tsx` | Tampilan: teks saja |
| W.3 | Tanggal laporan dikunci total + pengaman server tanggal = tanggal slot | `WorksheetFormModal.tsx`, `assertWorksheetDateMatchesSlot` + guard di `createWorksheet`/`updateWorksheet` | Tampilan (lock) + logika (penolakan mismatch) |

Latar belakang kasus (bukan kode, untuk konteks):
- **Alesya (Balesono):** semua Rabu Oktober hilang → booking tak pernah terbentuk/terhapus; slot-nya ada sejak 30 Sep. Diperbaiki manual (input ulang 14 Okt).
- **Nathan & Enzio (Gragalan):** overdue palsu 13 Okt → worksheet tersimpan berjam `02:00` (salah isi kolom opsional, maksud jam 2 siang). Diperbaiki via SQL (`schedule_time` → `14:00` + taut slot).

---

## 2. Detail before → after

### B0.1 — Pindah jadwal diberi rollback (`moveStudentBooking`)

- **Before:** hapus booking lama dulu, baru booking tujuan. Gagal di tujuan (penuh/sudah terdaftar) → sesi hilang total tanpa jejak.
- **After:** booking tujuan dulu → sukses baru hapus lama → hapus gagal? booking baru dibatalkan (state kembali semula). Tujuan = slot yang sama → no-op.
- **Tampilan:** tidak berubah (pesan error/modal sama).
- **Kinerja:** +1 query baca kecil (resolve slot tujuan) per pindah; asli 2 tulis tetap 2 tulis.

### B0.2 — Paginasi jadwal bulanan (`getMonthlySchedules`)

- **Before:** 1 query tanpa limit → Supabase diam-diam memotong di 1000 baris (tanggal akhir bulan bisa hilang di cabang besar).
- **After:** loop `.range(1000)` + tiebreaker `id` (pola sama seperti fungsi lain di file ini). Semua baris terpaginasi penuh.
- **Tampilan:** data lebih lengkap (tidak ada yang hilang); urutan sama (tanggal, jam).
- **Kinerja:** cabang kecil = 1 query seperti dulu (overhead nol); cabang besar = N query berurutan, hanya saat >1000 baris.

### B0.3 — Urutan kelas (`getClasses`)

- **Before:** tanpa `ORDER BY` → urutan acak heap; filter default (`classes[0]`) bisa melompat kelas sendiri.
- **After:** `.order("name")` → default deterministik (alfabetis pertama).
- **Tampilan:** dropdown kelas alfabetis; filter default stabil.
- **Kinerja:** `ORDER BY` kolom kecil, dapat diabaikan.

### B0.4 — Baris jam 12:00 & 17:00 (grid Jadwal + dashboard)

- **Before:** `FIXED_TIMES` hanya 08–11, 13–16. Sesi 17:00 (bisa di-booking!) tidak pernah tampil di grid/dashboard.
- **After:** tambah `12:00–13:00` dan `17:00–18:00` di kedua file.
- **Tampilan:** 2 baris tambahan (kosong jika tak ada sesi).
- **Kinerja:** nol (render baris statis dari data yang sama).

### B1.1 — Gembok dihormati (`autoBookStudentToClass`, `bookStudentManual`)

- **Before:** hanya booking satuan (`bookStudentToSlot`) menolak slot `is_locked`; auto/manual/copy tetap memasukkan siswa ke sesi terkunci.
- **After:** auto → slot terkunci masuk `failedDates` (seperti penuh); manual → error *"Jadwal ini sudah dikunci (Locked)…"* (pesan sama dengan booking satuan). Copy ikut otomatis (memakai autoBook).
- **Tampilan:** pesan/warning yang sudah ada; tidak ada komponen baru.
- **Kinerja:** +1 kolom (`is_locked`) di select yang sudah diambil — nol query tambahan.

### B1.2 — Tanggal kebal zona waktu (`getMonthlySchedules`, `createScheduleSlot`)

- **Before:** `new Date(...).toISOString().split("T")[0]` → di server non-UTC menggeser −1 hari (rentang bulan kehilangan tanggal 31; slot berulang salah hari).
- **After:** string `YYYY-MM-DD` manual + `getDate()` lokal (pola sama seperti 3 fungsi lain di file ini).
- **Tampilan/logika di produksi (UTC): IDENTIK** — terbukti uji 48 kombinasi bulan + 8 tanggal tepi: lama ≡ baru.
- **Kinerja:** nol (komputasi string yang sama murahnya).

### B2.1 — Panel kesiapan bulan depan

- **Before:** tidak ada — siswa terlewat copy baru ketahuan saat harinya tiba (kasus Alesya).
- **After:** fungsi baru `getStudentsWithNextMonthSchedule(tahun, bulan)` (read-only, `Set` ID agar kebal urutan paginasi; rollover Des→Jan teruji) + query paralel di `scheduling/page.tsx` + panel collapsible (badge jumlah, default terbuka jika ada yang kosong) + tombol **Salin** per baris (lock sendiri, pakai `copyScheduleToNextMonth` yang lama).
- **Tampilan:** 1 panel baru di atas pemilih siswa; mengikuti bulan yang dibuka (Nov→Des, Des→Jan otomatis).
- **Kinerja:** +1 query ringan per buka halaman (2 kolom, terpaginasi); panel render dari data lokal.

### B2.2 — Hasil penyalinan menetap

- **Before:** hasil copy/auto hanya modal sesaat → `failedDates` terlewat = siswa dianggap sudah terjadwal.
- **After:** state `lastCopyResult` → kotak hijau/kuning permanen (jumlah disalin + tanggal gagal + saran salin ulang + tombol tutup). Modal lama tetap ada; alur copy/auto tidak diubah.
- **Tampilan:** 1 kotak baru; hilang saat ditutup/ganti bulan.
- **Kinerja:** nol (state lokal).

### B2.3 — Pengaman hapus kelas

- **Before:** modal hanya tanya yakin/tidak; kalimatnya bahkan keliru (*"data yang dipakai jadwal tidak dapat dihapus"* — faktanya ikut terhapus semua bulan).
- **After:** fungsi baru `getClassDeletionImpact` (3 hitungan read-only: sesi, booking, siswa unik; cakupan = `deleteClass` persis) → modal menampilkan angka dampak; tombol hapus terkunci selama menghitung; gagal hitung → peringatan eksplisit (bukan angka 0).
- **Tampilan:** isi modal berubah; fungsi hapus (`deleteClass`) tidak diubah.
- **Kinerja:** 2–3 query kecil hanya saat modal dibuka.

### W.1 — Validasi jam manual worksheet

- **Before:** kolom opsional "Jam Sesi" menerima apa pun (mis. `02:00`) → overdue palsu (kasus Nathan/Enzio).
- **After:** fungsi baru `getStudentSessionTimes` (read-only) + cek saat Simpan: jam tak cocok dengan sesi tanggal itu → ditolak dengan pesan berisi jam yang benar + cara format 24 jam. Tanpa sesi / cek gagal (offline) / alur ber-slot / mode edit → lolos seperti dulu (fail-open).
- **Tampilan:** pesan error yang sudah ada (pola `setErrorMsg` yang sama).
- **Kinerja:** +1 query kecil hanya saat kolom opsional diisi.

### W.2 — Petunjuk kolom jam

- **Before:** *"(Opsional, misal jika siswa les 2 sesi di tanggal ini)"*.
- **After:** *"(Opsional — kosongkan jika hari ini hanya 1 sesi)"* + catatan format 24 jam. Murni teks.

### W.3 — Kunci tanggal + pengaman tanggal = slot

- **Before:** tanggal laporan bisa diganti bebas → laporan "mengambang" (overdue palsu + salah menutup slot lain), tanpa jejak.
- **After (UI):** tombol kalender nonaktif di semua alur + catatan kontekstual (dari slot → "mengikuti jadwal"; umum → "buka lewat jadwal/overdue tanggal tersebut"). Isi susulan tetap bisa via tombol Isi di slot/overdue (tanggal benar sejak dibuka).
- **After (server):** helper `assertWorksheetDateMatchesSlot` di `createWorksheet` + `updateWorksheet` menolak tanggal ≠ tanggal slot (pesan bahasa guru). Baris tanpa slot / slot terhapus → lolos seperti dulu.
- **Tampilan:** tombol tanggal redup + 1 baris catatan.
- **Kinerja:** +1 query kecil hanya saat simpan/update berkonteks slot.
- **Pengorbanan sadar:** isi manual tanggal lampau *tanpa slot* tidak bisa lagi (daftarkan sesinya dulu di Penjadwalan — 1 langkah).

### Diverifikasi tanpa perubahan: draft worksheet

`manualScheduleTime` tidak disimpan/dimuat draft + guard identitas + jalur umum draft mati → tidak ada kebocoran jam antar-entri. Nol baris diubah.

---

## 3. Kinerja keseluruhan (jujur)

- **Tidak ada benchmark waktu** dijalankan (lingkungan dev lokal, bukan prod).
- Tambahan query semuanya **on-demand dan ringan**: hitung dampak (buka modal hapus), jam sesi (Simpan dengan kolom terisi), next-month (1x per buka Penjadwalan), cek tanggal-slot (simpan berkonteks slot). ** nol N+1 baru di jalur panas** (dashboard grid, daftar siswa).
- Paginasi justru *menambah* query hanya untuk cabang >1000 baris/bulan — yang sebelumnya datanya **hilang**, jadi perbandingannya bukan "lebih lambat" melainkan "lengkap vs terpotong".
- Bundle: tambahan beberapa KB JSX (panel, kotak hasil, modal) — tidak ada dependensi baru.
- `tsc --noEmit` bersih setelah setiap batch.

---

## 4. Yang TIDAK diubah

Skema DB, data lama, kuota, rumus poin/laporan, pencocokan overdue, copy/auto/hapus inti, opsi jam booking, filter INACTIVE/CG, auth/cabang, PWA/sw, WorksheetFormModal selain 3 titik di atas.

Perbaikan data operasional (manual via SQL oleh owner, bukan oleh kode):
- Booking ulang 4 Rabu-Sun Oktober Alesya (14 Okt).
- `schedule_time` 13 Okt Nathan → `14:00` + taut slot; sama untuk Enzio.

---

## 5. Checklist uji sebelum publish (disarankan di production)

1. Pindah sesi ke slot penuh → gagal, jadwal lama utuh.
2. Navigasi bulan: tanggal 1 & akhir selalu tampil; filter kelas default konsisten.
3. Grid menampilkan baris 12:00 & 17:00.
4. Booking/copy ke slot terkunci → ditolak.
5. Panel kesiapan: jumlah benar; Salin per baris bekerja; kotak hasil menetap.
6. Hapus kelas (kelas tak penting): angka dampak tampil sebelum tombol aktif.
7. Worksheet: jam mustahil ditolak; tanggal terkunci; isi susulan via overdue tanggal benar.
8. Buat slot berulang akhir bulan (mis. 29 Des) → turunan benar sebulan.

## 6. Cara publish

```powershell
git add src/lib/actions.ts "src/app/(dashboard)/schedule/ScheduleClientWrapper.tsx" "src/app/(dashboard)/scheduling/SchedulingClientWrapper.tsx" "src/app/(dashboard)/scheduling/page.tsx" src/components/features/dashboard/TodaySchedule.tsx src/components/features/master/ClassManager.tsx src/components/features/worksheets/WorksheetFormModal.tsx
git commit -m "fix: rollback pindah jadwal, paginasi, gembok, tanggal TZ-proof, panel kesiapan, validasi worksheet"
git push
```
