# Fix: Logika Pengecekan Jadwal Coba Gratis (CG) Terlewat

## Problem

Dashboard menampilkan status "Belum Terlewat" untuk siswa CG yang seharusnya sudah "Sudah Terlewat".

**Contoh:**

- Siswa CG dengan jadwal Senin, 14 September 2026 ✅
- Hari ini: Kamis, 17 September 2026 📅
- Status salah: "Belum Terlewat" ❌
- Status benar: "Sudah Terlewat" ✅

## Root Cause

Logika pengecekan hanya membandingkan **bulan dan tahun**, tanpa mengecek **tanggal/hari** dalam bulan tersebut.

```typescript
// ❌ LOGIKA LAMA (SALAH)
return (
  schedDate.getFullYear() > currentYear ||
  (schedDate.getFullYear() === currentYear &&
    schedDate.getMonth() >= currentMonth) // Hanya cek bulan!
);
```

**Masalahnya:**

- Jadwal: 14 September 2026 → `getMonth()` = 8 (September)
- Sekarang: 17 September 2026 → `currentMonth` = 8 (September)
- Hasil: `8 >= 8` = true → dianggap belum terlewat ❌

Padahal: **14 September < 17 September** harusnya sudah terlewat!

## Solution

Mengubah logika untuk membandingkan **full date lengkap** menggunakan timestamp:

```typescript
// ✅ LOGIKA BARU (BENAR)
return schedDate.getTime() >= today.getTime();
```

**Keunggulan:**

- Membandingkan timestamp penuh (year + month + day)
- Akurat menentukan apakah jadwal sudah lewat atau belum
- Menangani edge case tanggal sama dengan hari ini

## Files Modified

### 1. `src/lib/actions.ts` - Backend Calculation

**Line 296-305:** Perhitungan di server side untuk dashboard stats

**Perubahan:**

- Line 252: `const todayISO = getTodayISO();` (renaming)
- Line 253: `const today = new Date(todayISO);` (make Date object)
- Line 264: Removed unused `currentYear` and `currentMonth` variables
- Line 297-301: Updated comparison logic to use timestamp comparison

### 2. `src/components/features/dashboard/DashboardStatsPanel.tsx` - Frontend Display

**Line 215-229:** Component-level calculation for student cards

**Perubahan:**

- Line 210-213: Setup `today`, `todayDate`, `currentYear`, `currentMonth` from `getTodayISO()`
- Line 215-229: Updated `isStudentUpcoming` function to compare full dates
- Replaced complex year/month check with simple timestamp comparison

## Testing Scenarios

### ✅ Test Case 1: Schedule Yesterday

- Jadwal: 16 September 2026
- Hari ini: 17 September 2026
- Result: "Sudah Terlewat" ✅

### ✅ Test Case 2: Schedule Today

- Jadwal: 17 September 2026
- Hari ini: 17 September 2026
- Result: "Belum Terlewat" ✅ (masih punya waktu hari ini)

### ✅ Test Case 3: Schedule Tomorrow

- Jadwal: 18 September 2026
- Hari ini: 17 September 2026
- Result: "Belum Terlewat" ✅

### ✅ Test Case 4: Past Month Schedule

- Jadwal: 31 Agustus 2026
- Hari ini: 17 September 2026
- Result: "Sudah Terlewat" ✅

### ✅ Test Case 5: No Schedule in Current Month

- Tidak ada jadwal di September 2026
- Result: "Sudah Terlewat" ✅ (tidak ada jadwal aktif)

## Impact

- **Dashboard Stats**: Count "belum terlewat" dan "sudah terlewat" menjadi akurat
- **Student Cards**: Status badge di kartu setiap siswa sesuai
- **Filter Dropdown**: Filter "Semua/ Belum/Sudah" menampilkan data yang benar

## Backwards Compatible

✅ Tidak mengubah logic bisnis lainnya
✅ Tidak mengubah struktur database
✅ Hanya fix bug di comparison logic
✅ Aman untuk deploy ke production
