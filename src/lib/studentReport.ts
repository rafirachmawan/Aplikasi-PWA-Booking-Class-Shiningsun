"use server";

import { createClient } from "@/lib/supabase/server";
import type { StudentReportRow } from "@/lib/studentReportTypes";

async function getRequestRole(): Promise<string | null> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseServer
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role) return profile.role as string;
  if (user.email?.includes("superadmin")) return "SUPERADMIN";
  return "BRANCH_ADMIN";
}

/**
 * Laporan khusus Superadmin: semua siswa REGISTERED lintas cabang
 * tanpa filter tanggal daftar (tanggal berapa pun ikut tampil).
 * File baru — tidak mengubah fungsi/logika di src/lib/actions.ts.
 */
export async function getRegisteredStudentsReport(): Promise<{
  data: StudentReportRow[];
  error?: string;
}> {
  const role = await getRequestRole();
  if (role !== "SUPERADMIN") {
    return { data: [], error: "FORBIDDEN" };
  }

  const supabaseServer = await createClient();

  const { data, error } = await supabaseServer
    .from("students")
    .select(
      "id, branch_id, name, nickname, gender, date_of_birth, phone, school, status, registration_date, registered_at, created_at, branch:branches(id, name), label:labels(id, main_level, sub_level)",
    )
    .eq("status", "REGISTERED")
    .order("registration_date", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("getRegisteredStudentsReport error:", error.message);
    return { data: [], error: error.message };
  }

  type RawRow = {
    id: string;
    branch_id: string;
    name: string;
    nickname?: string | null;
    gender?: string | null;
    date_of_birth: string;
    phone?: string | null;
    school?: string | null;
    status: string;
    registration_date: string;
    registered_at?: string | null;
    created_at: string;
    branch?: { name?: string | null } | null;
    label?: { main_level?: string | null; sub_level?: string | null } | null;
  };

  const rows: StudentReportRow[] = ((data || []) as RawRow[]).map((s) => {
    const label = s.label
      ? [s.label.main_level, s.label.sub_level].filter(Boolean).join(" - ")
      : "-";
    return {
      id: s.id,
      branch_id: s.branch_id,
      branch_name: s.branch?.name || "-",
      name: s.name,
      nickname: s.nickname || null,
      gender: s.gender || null,
      date_of_birth: s.date_of_birth,
      phone: s.phone || null,
      school: s.school || null,
      status: s.status,
      registration_date: s.registration_date,
      registered_at: s.registered_at || null,
      label_name: label,
      created_at: s.created_at,
    };
  });

  return { data: rows };
}
