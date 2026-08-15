const DAYS_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAYS_SHORT = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTHS_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

/**
 * Safely parses a date input into a Date object without timezone shift issues for YYYY-MM-DD strings.
 */
function parseDateInput(dateInput: string | Date): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === "string") {
    const cleanStr = dateInput.trim();
    // Match "YYYY-MM-DD" or "YYYY-MM-DD THH:mm:ss"
    const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Formats date to Indonesian Short Format (e.g. "Sen, 3 Agu 2026")
 * ALWAYS guarantees Day, Date Month Year format across all OS/Browsers (iOS, Android, Windows, Mac).
 */
export function formatShortDate(dateInput: string | Date): string {
  const d = parseDateInput(dateInput);
  if (!d) return String(dateInput || "");

  const dayName = DAYS_SHORT[d.getDay()];
  const dateNum = d.getDate();
  const monthName = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();

  return `${dayName}, ${dateNum} ${monthName} ${year}`;
}

/**
 * Formats date to Full Indonesian Format (e.g. "Senin, 3 Agustus 2026" or "3 Agustus 2026")
 * ALWAYS guarantees Day Date Month Year format across all OS/Browsers.
 */
export function formatFullIndonesianDate(
  dateInput: string | Date,
  options: { includeDayName?: boolean } = { includeDayName: true }
): string {
  const d = parseDateInput(dateInput);
  if (!d) return String(dateInput || "");

  const dayName = DAYS_FULL[d.getDay()];
  const dateNum = d.getDate();
  const monthName = MONTHS_FULL[d.getMonth()];
  const year = d.getFullYear();

  if (options.includeDayName) {
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  }
  return `${dateNum} ${monthName} ${year}`;
}

/**
 * Formats date to Numeric Format (e.g. "03/08/2026")
 * ALWAYS guarantees DD/MM/YYYY format across all OS/Browsers.
 */
export function formatNumericDate(dateInput: string | Date): string {
  const d = parseDateInput(dateInput);
  if (!d) return String(dateInput || "");

  const dateNum = String(d.getDate()).padStart(2, "0");
  const monthNum = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${dateNum}/${monthNum}/${year}`;
}

/**
 * Returns current month & year in Indonesian (e.g. "Agustus 2026")
 */
export function getIndonesianMonthYearName(dateInput: Date = new Date()): string {
  const monthName = MONTHS_FULL[dateInput.getMonth()];
  const year = dateInput.getFullYear();
  return `${monthName} ${year}`;
}

/**
 * Returns today's date as YYYY-MM-DD string WITHOUT using any browser locale.
 * This avoids the Android Chrome bug where toLocaleDateString('sv-SE') 
 * may return M/D/YYYY instead of YYYY-MM-DD.
 */
export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Safely parses any date string (ISO, DD/MM/YYYY, "16 Agustus 2026", "16 Agt 2026", etc.)
 * into a valid YYYY-MM-DD string for PostgreSQL DATE columns.
 */
export function parseIndonesianDateToISO(inputStr?: string | null): string {
  if (!inputStr || !inputStr.trim()) return getTodayISO();
  const clean = inputStr.trim();

  // 1. If already YYYY-MM-DD format
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(parseInt(ymdMatch[2], 10)).padStart(2, "0");
    const d = String(parseInt(ymdMatch[3], 10)).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2. If DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = String(parseInt(dmyMatch[1], 10)).padStart(2, "0");
    const m = String(parseInt(dmyMatch[2], 10)).padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Text format: "16 Agustus 2026", "16 Agt 2026", etc.
  const monthMap: Record<string, string> = {
    jan: "01", januari: "01", january: "01",
    feb: "02", februari: "02", february: "02",
    mar: "03", maret: "03", march: "03",
    apr: "04", april: "04",
    mei: "05", may: "05",
    jun: "06", juni: "06", june: "06",
    jul: "07", juli: "07", july: "07",
    agu: "08", agust: "08", agustus: "08", aug: "08", august: "08",
    sep: "09", september: "09",
    okt: "10", oktober: "10", oct: "10", october: "10",
    nov: "11", november: "11",
    des: "12", desember: "12", dec: "12", december: "12"
  };

  const textMatch = clean.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (textMatch) {
    const d = String(parseInt(textMatch[1], 10)).padStart(2, "0");
    const monthStr = textMatch[2].toLowerCase();
    const y = textMatch[3];
    const m = monthMap[monthStr];
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  // Fallback: JS Date
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return getTodayISO();
}

/**
 * Calculates attendance points for a student based on their worksheet reports.
 * - +1 Point for every HADIR (attended) class session.
 * - 0 Points for IJIN, SAKIT, LIBUR (points do not change / not deducted).
 */
export function calculateStudentPoints(worksheets: any[]): number {
  if (!worksheets || !Array.isArray(worksheets) || worksheets.length === 0) return 0;
  return worksheets.filter((w) => {
    const m = (w.materi || "").toLowerCase();
    const t = (w.title || "").toLowerCase();
    const isAbsent =
      m.includes("tidak hadir") ||
      m.includes("libur") ||
      t.includes("tidak hadir") ||
      t.includes("libur") ||
      t.includes("ijin") ||
      t.includes("sakit");
    return !isAbsent;
  }).length;
}
