# Diagnosa Bug Identitas Siswa (A Masuk ke B) — Siap Eksekusi

Tanggal: 2026-10-06
Keluhan awal: isi Laporan Perkembangan siswa A dari dashboard masuk ke siswa B. Terjadi kadang-kadang, tidak semua.
Jalur keluhan: **Dashboard > Jadwal Hari Ini**.

> File ini hanya rencana. Tidak ada perubahan kode saat file ini dibuat.
> Prinsip eksekusi: tanpa mengubah logika lain, tanpa migrasi DB, tanpa update/delete data lama.

## Konteks: bug utama (sudah diperbaiki)

Rantai bug utama ada di jalur Jadwal Hari Ini:

1. `src/components/features/dashboard/TodaySchedule.tsx:279-286` — klik siswa set `editingStudent` + `editingSlot`.
2. `src/components/features/dashboard/TodaySchedule.tsx:321-337` — render `ChangeLabelModal` (sebelum fix tanpa `key`).
3. `src/components/features/students/ChangeLabelModal.tsx:337-355` — render `WorksheetFormModal` (sebelum fix tanpa `lockedStudentId`, scope draft `new-all`).
4. `src/components/features/worksheets/WorksheetFormModal.tsx:730-736` — restore `if (d.studentId) setStudentId(d.studentId)` menimpa tanpa validasi.
5. `src/components/features/worksheets/WorksheetFormModal.tsx:1607-1610` — submit `studentId || initialData...` sehingga state basi menang.

Perbaikan yang sudah diterapkan (jangan diulang):

- `ChangeLabelModal.tsx`: tambah `key` per siswa+slot+tanggal + `lockedStudentId={student.id}`.
- `TodaySchedule.tsx`: tambah `key` per siswa+slot di `ChangeLabelModal`.
- `WorksheetFormModal.tsx`: guard restore `studentId` + prioritas `lockedStudentId → initialData → single → state` di submit dan cek duplikat.

Verifikasi bug utama:

- [ ] Buka siswa A → ketik 1 huruf → tutup → buka siswa B → header tetap nama B.
- [ ] Cek `localStorage`: kunci `ws-draft-v1:new-<id>` per siswa, tidak lagi `new-all` bersama.
- [ ] Simpan B → cek 1 baris terbaru di `student_worksheets` punya `student_id = B`.

---

## 1. Laporan Terlewat — siswa benar, konten antar tanggal bisa terbawa

Risiko: sedang-rendah. Bukan nyasar antar siswa.

Bukti:

- `src/components/features/dashboard/DashboardStatsPanel.tsx:1162-1214` — modal tanpa `key`.
- `src/components/features/worksheets/WorksheetFormModal.tsx:708` — scope draft `new-<id-siswa>` dipakai bersama semua tanggal siswa itu.
- `src/components/features/dashboard/DashboardStatsPanel.tsx:253-282` — ganti A→B cepat tanpa abort, `overdueWorksheets` bisa tertukar (pengaruh `bulan_ke`).

Gejala yang mungkin terlihat:

- Siswa yang sama punya 2 tanggal terlewat → ketikan tanggal-1 muncul di form tanggal-2.
- Tanggal/jam di header benar, tetapi isi materi/kegiatan adalah sisa tanggal lain.

Rencana eksekusi:

- [ ] Tambah `key` unik di modal overdue:
  `key={overdueStudent.id + (missedDate || "") + (missedTime || "")}`
  di `DashboardStatsPanel.tsx:1163`.
- [ ] Sertakan tanggal ke scope draft agar per siswa per tanggal (hanya ubah `getDraftKey`, tanpa ubah aturan restore/simpan lain).
- [ ] Opsional: guard fetch basi di `handleOpenWorksheetForm` (token/abort sederhana).
- [ ] Verifikasi: buka 2 tanggal milik 1 siswa bergantian → isi tidak saling terbawa; simpan tanggal-2 → baris baru punya tanggal-2.

Batasan: tanpa menambah query/server action, tanpa mengubah aturan duplikat dan toast.

## 2. Halaman Laporan Perkembangan — tidak nyasar, hanya UX membingungkan

Risiko: rendah.

Bukti:

- `src/app/(dashboard)/worksheets/WorksheetClientWrapper.tsx:906-914` — modal tanpa `key`, `lockedStudentId` kosong kecuali dari URL `?student_id=`.
- Mode tambah: draft `new-all` + dropdown multi-siswa.
- Mode edit: `isEditing` menonaktifkan draft, `updateWorksheet(initialData.id)` tidak mengganti `student_id` — aman.

Gejala yang mungkin terlihat:

- Buka form tambah baru bisa pre-select siswa dari draft lama. Tampilan dan simpanan konsisten (lihat A, simpan A), jadi bukan A→B, tetapi membingungkan bila maksudnya B.

Rencana eksekusi:

- [ ] Tambah `key` saat `editingWorksheet` berubah (mis. `key={editingWorksheet?.id || "new"}`), tanpa ubah props lain.
- [ ] Verifikasi: tambah baru → pilih B → simpan → `student_id = B`; edit baris A → simpan → tetap `id` baris A.

Batasan: tanpa mengubah filter, tabel, PDF, PIN, dan refresh.

## 3. ChangeLabelModal dari Jadwal Keseluruhan & Penjadwalan — dalam aman, luar kurang bersih

Risiko: rendah untuk korupsi (bagian dalam sudah terkunci), sedang untuk perilaku duplikat.

Bukti:

- `src/components/features/schedule/ScheduleManagerDrawer.tsx:467-473` — tanpa `key`, tanpa `scheduleSlotId/Date/Time`.
- `src/app/(dashboard)/scheduling/SchedulingClientWrapper.tsx:2244-2252` — tanpa `key`, tanpa konteks jadwal.
- Bagian dalam `ChangeLabelModal` kini sudah punya `key` + `lockedStudentId`, jadi simpan antar siswa aman dari semua pemanggil.
- Tanpa konteks jam, cek duplikat jatuh ke aturan per-tanggal (lebih ketat: jam beda di hari sama ikut diblokir).
- `modalError` tidak di-reset saat `student` ganti.

Rencana eksekusi:

- [ ] Tambah `key` di kedua pemanggil (per `editingStudent.id`).
- [ ] Teruskan konteks jadwal seperti `TodaySchedule` (`scheduleSlotId/scheduleTime/scheduleDate/scheduleClassName`) bila tersedia di data slot.
- [ ] Reset `modalError` saat `student` berubah di `ChangeLabelModal`.
- [ ] Verifikasi: isi dari tiap halaman → tersimpan ke siswa yang diklik; 2 sesi beda jam di hari sama tidak saling blokir bila konteks jam tersedia.

Batasan: tanpa mengubah booking/kuota, navigasi bulan, dan toast.

## 4. Form Pendaftaran Siswa — pola useState(initialData) yang sama

Risiko: rendah (hanya bila edit A lalu langsung edit B tanpa tutup).

Bukti:

- `src/components/features/students/StudentRegistrationForm.tsx:108-121` — init dari `initialData` tanpa sync.
- `src/app/(dashboard)/students/StudentClientWrapper.tsx:1054-1067` — tanpa `key`.

Gejala yang mungkin terlihat:

- Edit A lalu langsung edit B → form masih menampilkan data A.

Rencana eksekusi:

- [ ] Tambah `key={editingStudent?.id || "new"}` di `StudentClientWrapper.tsx:1055`.
- [ ] Verifikasi: edit A → tutup → edit B → form menampilkan B.

Batasan: tanpa mengubah validasi, label, WA autofill, dan refresh.

## 5. Penjadwalan manual/edit — bukan laporan, pola studentId global

Risiko: rendah-sedang, jarang terjadi.

Bukti:

- `src/app/(dashboard)/scheduling/SchedulingClientWrapper.tsx:40,183-203` — `studentId` dropdown dipakai juga oleh `handleEditBooking` (`moveStudentBooking(studentId, ...)`).

Gejala yang mungkin terlihat:

- Dropdown diganti saat modal edit terbuka → pindahan jatuh ke siswa yang salah.

Rencana eksekusi:

- [ ] Kunci `studentId` saat modal edit dibuka (snapshot ke variabel lokal/modal, jangan baca dropdown global saat submit).
- [ ] Verifikasi: pilih A → edit jadwal → ganti dropdown ke B → submit tetap memindahkan A.

Batasan: tanpa mengubah aturan kuota, copy bulan, dan bulk delete.

---

## Urutan eksekusi yang disarankan

1. No.1 + No.3 (masing-masing ±1 baris `key` + teruskan konteks yang sudah ada).
2. No.4 (satu baris `key`).
3. No.2 dan No.5 bila sempat / bila ada keluhan lanjutan.

## Verifikasi umum tiap eksekusi

- [ ] `npx tsc --noEmit` lolos.
- [ ] `git diff --stat` hanya menyentuh file yang direncanakan.
- [ ] Uji manual 2 siswa bergantian + cek `student_worksheets` / tabel terkait.
- [ ] Tidak ada migrasi DB, tidak ada update/delete massal.
