// =========================================================
// Activity Logger (Audit Trail untuk Coolify Runtime Logs)
// =========================================================
// Helper pasif: hanya mencetak ke console (stdout/stderr)
// agar dapat dipantau langsung di Coolify Runtime Logs.
// Dijamin aman & tidak akan pernah mengganggu jalannya aplikasi.

export type LogCategory =
  | "AUTH-ADMIN"
  | "PORTAL-ORTU"
  | "WORKSHEET"
  | "STUDENT"
  | "SCHEDULE"
  | "POINT";

export function logActivity(
  category: LogCategory,
  action: string,
  details?: Record<string, unknown>,
) {
  try {
    const time = new Date().toLocaleTimeString("id-ID", {
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
    const meta = details
      ? " | " +
        Object.entries(details)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join(", ")
      : "";
    console.log(`[${time}] [${category}] ${action}${meta}`);
  } catch {
    // Logger pasif: abaikan jika terjadi error formatting
  }
}

