// Internal helpers shared between action modules.
// Intentionally NOT a "use server" file so these helpers are never exposed as Server Actions.

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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

// =========================================================
// Guard sesi (dipakai action yang memakai service role).
// Tidak mengubah data/logika — hanya menentukan siapa yang
// boleh memanggil action tersebut.
// =========================================================

/** Wajib login admin. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/** Boleh admin login ATAU portal ortu untuk satu siswa yang sama. */
export async function requireUserOrParent(studentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { kind: "admin" as const, user };

  const cookieStore = await cookies();
  const parentStudentId = cookieStore.get("parent_student_id")?.value;
  if (parentStudentId && parentStudentId === studentId) {
    return { kind: "parent" as const, user: null };
  }
  throw new Error("UNAUTHORIZED");
}

/** Boleh admin login ATAU portal ortu bila siswa sesi ada di daftar ids. */
export async function requireUserOrParentOfAny(studentIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { kind: "admin" as const, user };

  const cookieStore = await cookies();
  const parentStudentId = cookieStore.get("parent_student_id")?.value;
  if (parentStudentId && studentIds.includes(parentStudentId)) {
    return { kind: "parent" as const, user: null };
  }
  throw new Error("UNAUTHORIZED");
}
