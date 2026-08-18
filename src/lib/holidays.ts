// ============================================
// Kalender Tanggal Merah Indonesia (Libur Nasional & Cuti Bersama)
// Sumber: SKB 3 Menteri / penetapan resmi pemerintah (2025 & 2026).
// 2027 hanya hari besar tanggal tetap (belum ada penetapan resmi).
// Gunakan fungsi getHolidayName(isoDate) untuk cek apakah suatu tanggal
// merupakan tanggal merah.
// ============================================

const HOLIDAYS: Record<string, string> = {
  // ---------- 2025: Libur Nasional ----------
  "2025-01-01": "Tahun Baru Masehi",
  "2025-01-27": "Isra Mi'raj Nabi Muhammad SAW",
  "2025-01-29": "Tahun Baru Imlek 2576",
  "2025-03-29": "Hari Suci Nyepi",
  "2025-03-31": "Hari Raya Idul Fitri 1446 H",
  "2025-04-01": "Hari Raya Idul Fitri 1446 H",
  "2025-04-18": "Wafat Isa Almasih",
  "2025-05-01": "Hari Buruh Internasional",
  "2025-05-12": "Hari Raya Waisak",
  "2025-05-29": "Kenaikan Isa Almasih",
  "2025-06-01": "Hari Lahir Pancasila",
  "2025-06-06": "Hari Raya Idul Adha 1446 H",
  "2025-06-27": "Tahun Baru Islam 1447 H",
  "2025-08-17": "Hari Kemerdekaan RI",
  "2025-09-05": "Maulid Nabi Muhammad SAW",
  "2025-12-25": "Hari Raya Natal",
  // ---------- 2025: Cuti Bersama ----------
  "2025-01-28": "Cuti Bersama Tahun Baru Imlek",
  "2025-03-28": "Cuti Bersama Hari Suci Nyepi",
  "2025-04-02": "Cuti Bersama Idul Fitri",
  "2025-04-03": "Cuti Bersama Idul Fitri",
  "2025-04-04": "Cuti Bersama Idul Fitri",
  "2025-04-07": "Cuti Bersama Idul Fitri",
  "2025-05-13": "Cuti Bersama Hari Raya Waisak",
  "2025-05-30": "Cuti Bersama Kenaikan Isa Almasih",
  "2025-06-09": "Cuti Bersama Idul Adha",
  "2025-12-26": "Cuti Bersama Hari Raya Natal",

  // ---------- 2026: Libur Nasional ----------
  "2026-01-01": "Tahun Baru Masehi",
  "2026-01-16": "Isra Mi'raj Nabi Muhammad SAW",
  "2026-02-17": "Tahun Baru Imlek 2577",
  "2026-03-19": "Hari Suci Nyepi",
  "2026-03-21": "Hari Raya Idul Fitri 1447 H",
  "2026-03-22": "Hari Raya Idul Fitri 1447 H",
  "2026-04-03": "Wafat Isa Almasih",
  "2026-04-05": "Paskah",
  "2026-05-01": "Hari Buruh Internasional",
  "2026-05-14": "Kenaikan Isa Almasih",
  "2026-05-27": "Hari Raya Idul Adha 1447 H",
  "2026-05-31": "Hari Raya Waisak",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-06-16": "Tahun Baru Islam 1448 H",
  "2026-08-17": "Hari Kemerdekaan RI",
  "2026-08-25": "Maulid Nabi Muhammad SAW",
  "2026-12-25": "Hari Raya Natal",
  // ---------- 2026: Cuti Bersama ----------
  "2026-02-16": "Cuti Bersama Tahun Baru Imlek",
  "2026-03-18": "Cuti Bersama Hari Suci Nyepi",
  "2026-03-20": "Cuti Bersama Idul Fitri",
  "2026-03-23": "Cuti Bersama Idul Fitri",
  "2026-03-24": "Cuti Bersama Idul Fitri",
  "2026-05-15": "Cuti Bersama Kenaikan Isa Almasih",
  "2026-05-28": "Cuti Bersama Idul Adha",
  "2026-12-24": "Cuti Bersama Hari Raya Natal",

  // ---------- 2027: Hari besar tanggal tetap ----------
  "2027-01-01": "Tahun Baru Masehi",
  "2027-05-01": "Hari Buruh Internasional",
  "2027-06-01": "Hari Lahir Pancasila",
  "2027-08-17": "Hari Kemerdekaan RI",
  "2027-12-25": "Hari Raya Natal",
};

/**
 * Mengembalikan nama hari libur nasional / cuti bersama untuk tanggal
 * berformat ISO (YYYY-MM-DD), atau null jika bukan tanggal merah.
 */
export function getHolidayName(isoDate: string): string | null {
  if (!isoDate) return null;
  const dateOnly = String(isoDate).split("T")[0];
  return HOLIDAYS[dateOnly] || null;
}
