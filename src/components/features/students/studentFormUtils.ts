// Helper murni (tanpa state/JSX) untuk StudentRegistrationForm.
// Dipindahkan apa adanya dari StudentRegistrationForm.tsx — logika tidak diubah.

// Opsi jam sesi CG — sama dengan daftar jam di halaman Jadwal.
export const SESSION_TIME_GROUPS: Array<{ label: string; times: string[] }> = [
  { label: "Pagi", times: ["08:00", "09:00", "10:00", "11:00"] },
  { label: "Sore", times: ["13:00", "14:00", "15:00", "16:00", "17:00"] },
];

/**
 * Ambil jam dari teks bebas WhatsApp.
 * Contoh: "kelas pagi jam 10 pagi" -> 10:00, "jam 4 sore" -> 16:00, "16:00" -> 16:00.
 */
export function parseSessionTime(value: string): string | null {
  const lower = value.toLowerCase();
  const explicit = lower.match(/(\d{1,2})\s*[:.]\s*(\d{2})/);

  let hour: number | null = null;
  let minute = 0;

  if (explicit) {
    hour = parseInt(explicit[1], 10);
    minute = parseInt(explicit[2], 10);
  } else {
    const withPeriod = lower.match(/(\d{1,2})\s*(pagi|siang|sore|malam)/);
    const withJam = lower.match(/jam\s*(\d{1,2})/);
    if (withPeriod) hour = parseInt(withPeriod[1], 10);
    else if (withJam) hour = parseInt(withJam[1], 10);
  }

  if (hour === null || isNaN(hour)) return null;

  const period = lower.match(/(pagi|siang|sore|malam)/)?.[1];
  if (period === "sore" || period === "malam") {
    if (hour < 12) hour += 12;
  } else if (period === "siang" && hour < 11) {
    hour += 12;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseIndonesianDate(dateStr: string) {
  if (!dateStr) return "";
  const cleaned = dateStr.trim();
  if (!cleaned) return "";

  // 1. Direct YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // 2. Numeric DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const numMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (numMatch) {
    const day = numMatch[1].padStart(2, "0");
    const month = numMatch[2].padStart(2, "0");
    const year = numMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 2b. Numeric date dengan prefix hari, mis. "Senin, 02/11/2026"
  const embeddedNumMatch = cleaned.match(
    /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/,
  );
  if (embeddedNumMatch) {
    const day = embeddedNumMatch[1].padStart(2, "0");
    const month = embeddedNumMatch[2].padStart(2, "0");
    const year = embeddedNumMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Textual dates e.g. "Senin, 15 Januari 2024" or "15 Jan 2024"
  const months: Record<string, string> = {
    januari: "01",
    jan: "01",
    februari: "02",
    feb: "02",
    maret: "03",
    mar: "03",
    april: "04",
    apr: "04",
    mei: "05",
    juni: "06",
    jun: "06",
    juli: "07",
    jul: "07",
    agustus: "08",
    agu: "08",
    agus: "08",
    september: "09",
    sep: "09",
    sept: "09",
    oktober: "10",
    okt: "10",
    november: "11",
    nov: "11",
    desember: "12",
    des: "12",
  };

  const parts = cleaned
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/[\/\-\.]/g, " ")
    .split(/\s+/);

  let day = "",
    month = "",
    year = "";

  for (const part of parts) {
    if (
      !isNaN(parseInt(part)) &&
      part.length <= 2 &&
      parseInt(part) >= 1 &&
      parseInt(part) <= 31
    ) {
      if (!day) day = part.padStart(2, "0");
    } else if (!isNaN(parseInt(part)) && part.length === 4) {
      year = part;
    } else if (months[part]) {
      month = months[part];
    }
  }

  if (day && month && year) {
    return `${year}-${month}-${day}`;
  }
  return "";
}
