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
 * Formats date to Indonesian Short Format (e.g. "Sen, 3 Agu")
 * ALWAYS guarantees Day, Date Month format across all OS/Browsers (iOS, Android, Windows, Mac).
 */
export function formatShortDate(dateInput: string | Date): string {
  const d = parseDateInput(dateInput);
  if (!d) return String(dateInput || "");

  const dayName = DAYS_SHORT[d.getDay()];
  const dateNum = d.getDate();
  const monthName = MONTHS_SHORT[d.getMonth()];

  return `${dayName}, ${dateNum} ${monthName}`;
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
