# Status Pelaksanaan — Batch2 Hemat Origin + Fitur Anti-Double Laporan

Tanggal: 02/10/2026 | Branch: `hemat-origin-batch2`
Dokumen ini hanya status. Tidak ada kode yang diubah.

---

## A. Batch2 Hemat Origin (`RENCANA_BATCH2_HEMAT_ORIGIN.md`)

### Sudah ✅

| Langkah | Bukti di kode | Status deploy |
|---------|---------------|---------------|
| §1 — Hapus `force-dynamic` (14 file) | Baris `export const dynamic` sudah jadi komentar `// Batch2 hemat...` di 14 page | Belum deploy |
| §1b — `revalidate` | `birthday-templates/page.tsx:6` → `revalidate = 60`; `master/page.tsx:7` → `revalidate = 60` | Belum deploy |
| §2 sebagian — cache birthday | `src/app/api/birthday/route.ts:93,196` → `Cache-Control: private, max-age=60` | Belum deploy |
| §5 sebagian — kompresi foto client | `compressImage()` di `WorksheetFormModal.tsx` (commit `Kompress Logic`) | Sudah ter-commit |
| §6 — middleware → proxy | `src/proxy.ts` sudah ada | Belum deploy |

### Belum ❌

| Langkah | Kondisi sekarang |
|---------|------------------|
| §2 sisa — filter bulan di SQL, `.limit(200)`, debounce + AbortController | Belum ada di `api/birthday` |
| §3 — pisah GET vs PATCH `student-feedback` | Masih write-on-GET (`route.ts:186`) |
| §4 — optimistic update pengganti `router.refresh()` | Masih pola `router.refresh()` |
| §5 inti — upload langsung (tanpa lewat Vercel) | Masih `Buffer.concat` di `api/upload-gdrive` |
| §7 — hapus `cache: no-store` global Supabase | Masih ada (`src/lib/supabase.ts:24`) |
| §8 — WebP + `next/image` + fix Serwist | Belum dikerjakan |
| §9 — verifikasi akhir + deploy 1x + pantau 24 jam | Belum (menunggu eksekusi) |

---

## B. Fitur Anti-Double Laporan Perkembangan (di luar Batch2)

### Sudah (kode) ✅ — belum di-commit, belum deploy

| Item | File |
|------|------|
| Cegah double server (siswa + tanggal + jam/slot) | `src/lib/actions.ts` (`createWorksheet`, `updateWorksheet`) |
| Status Terisi/Kosong per jam + overdue per jam | `src/lib/studentScheduleReport.ts`, `getOverdueWorksheets` di `actions.ts` |
| Banner "sudah terisi" + kunci double-click + kirim konteks jadwal | `src/components/features/worksheets/WorksheetFormModal.tsx` |
| Teruskan slot/jam ke form | `TodaySchedule.tsx`, `ChangeLabelModal.tsx`, `DashboardStatsPanel.tsx` |
| Toast hijau sukses | `WorksheetFormModal.tsx`, `WorksheetClientWrapper.tsx`, `DashboardStatsPanel.tsx`, `ChangeLabelModal.tsx` |
| Migrasi DB (kolom nullable, aman untuk data lama) | `supabase/student_worksheets_schedule_link.sql` (baru, belum dijalankan di Supabase) |

Verifikasi: `tsc --noEmit` bersih, `npm run build` hijau, tidak ada lint error baru.

### Belum ❌
- Commit (usulan: Commit 1 backend+SQL, Commit 2 frontend)
- Push + deploy 1x ke prod hidup (`aplikasi-booking-class-shiningsun`), jam sepi
- Jalankan file SQL 1x di Supabase SQL Editor
- Tes localhost: isi 1x → toast; isi lagi → "sudah terisi"; beda jam via dashboard → lolos
- Catat baseline `Fast Origin Transfer` sebelum deploy + pantau 24 jam

---

## C. Peringatan Vercel (sisa 0,89 / 10 GB — kritis)
- Limit Hobby = rolling 30 hari (bukan reset tanggal 1).
- Jangan deploy berulang; tes di localhost tidak memakai limit.
- Deploy hanya ke project prod yang hidup, jangan ke project yang paused.
