// Internal helpers shared between action modules.
// Intentionally NOT a "use server" file so these helpers are never exposed as Server Actions.

export const ABSENT_WORKSHEET_OR_FILTER = [
  "materi",
  "title",
  "kegiatan",
  "hasil_belajar",
]
  .flatMap((col) =>
    ["tidak hadir", "libur", "ijin", "izin", "sakit"].map(
      (kw) => `${col}.ilike.%${kw}%`,
    ),
  )
  .join(",");

export const memoryPointsCache = new Map<
  string,
  {
    grossPointsMap: Record<string, number>;
    redeemedPointsMap: Record<string, number>;
    timestamp: number;
  }
>();

export function normalizeScheduleTime(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Terima "08:00", "08:00:00", ISO datetime — ambil HH:MM saja.
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = String(parseInt(m[1], 10)).padStart(2, "0");
  return `${hh}:${m[2]}`;
}

export function isMissingColumnError(err: any): boolean {
  const msg = String(err?.message || "");
  return (
    err?.code === "PGRST204" ||
    err?.code === "42703" ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the")
  );
}
