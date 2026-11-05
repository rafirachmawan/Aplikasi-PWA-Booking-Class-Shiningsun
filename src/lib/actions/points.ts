"use server";

import { supabase } from "../supabase";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAbsentWorksheet } from "../dateUtils";
import { memoryPointsCache, requireUser, requireUserOrParent } from "./_internal";
import { getBranchId } from "./auth-branch";
import { getAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logger";

export async function redeemStudentPoints({
  studentId,
  branchId,
  pointsDeducted,
  rewardNote,
}: {
  studentId: string;
  branchId?: string;
  pointsDeducted: number;
  rewardNote?: string;
}) {
  await requireUser();
  const supabaseServer = await createClient();

  if (!studentId || pointsDeducted <= 0) {
    throw new Error("Jumlah poin yang ditukar harus lebih dari 0.");
  }

  // Guard saldo: tukar tidak boleh melebihi sisa poin (gross - redeemed).
  const [{ data: wsData }, { data: redData }] = await Promise.all([
    supabaseServer
      .from("student_worksheets")
      .select("materi, title, kegiatan, hasil_belajar")
      .eq("student_id", studentId),
    supabaseServer
      .from("student_point_redemptions")
      .select("points_deducted")
      .eq("student_id", studentId),
  ]);
  let gross = 0;
  (wsData || []).forEach((w: any) => {
    if (!isAbsentWorksheet(w)) gross++;
  });
  let redeemed = 0;
  (redData || []).forEach((r: any) => {
    redeemed += r.points_deducted || 0;
  });
  const net = Math.max(0, gross - redeemed);
  if (pointsDeducted > net) {
    throw new Error(
      `Poin tidak cukup! Siswa hanya memiliki ${net} poin tersisa.`,
    );
  }

  const { data: redemption, error } = await supabaseServer
    .from("student_point_redemptions")
    .insert({
      student_id: studentId,
      branch_id: branchId || null,
      points_deducted: pointsDeducted,
      reward_note: rewardNote?.trim() || "Penukaran Hadiah",
    })
    .select()
    .single();

  if (error) {
    console.error("Error redeeming points:", error);
    if (
      error.message.includes(
        'relation "public.student_point_redemptions" does not exist',
      )
    ) {
      throw new Error(
        "Tabel 'student_point_redemptions' belum dibuat di Supabase. Silakan jalankan file SQL 'supabase/student_point_redemptions.sql' pada Supabase SQL Editor.",
      );
    }
    throw new Error("Gagal memotong poin: " + error.message);
  }

  memoryPointsCache.clear();
  revalidatePath("/points");
  revalidatePath("/students");
  revalidatePath("/portal-ortu/dashboard");
  logActivity("POINT", "Tukar poin", {
    student_id: studentId,
    poin_dipotong: pointsDeducted,
    hadiah: rewardNote?.trim() || "Penukaran Hadiah",
  });
  return redemption;
}

export async function addManualStudentPoints({
  studentId,
  branchId,
  pointsAdded,
  note,
}: {
  studentId: string;
  branchId?: string;
  pointsAdded: number;
  note?: string;
}) {
  await requireUser();
  const supabaseServer = await createClient();

  if (!studentId || pointsAdded <= 0) {
    throw new Error("Jumlah poin tambahan harus lebih dari 0.");
  }

  const { data: record, error } = await supabaseServer
    .from("student_point_redemptions")
    .insert({
      student_id: studentId,
      branch_id: branchId || null,
      points_deducted: -Math.abs(pointsAdded),
      reward_note: note?.trim() || "Bonus Poin Manual / Lomba",
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding manual points:", error);
    if (
      error.message.includes(
        'relation "public.student_point_redemptions" does not exist',
      )
    ) {
      throw new Error(
        "Tabel 'student_point_redemptions' belum dibuat di Supabase. Silakan jalankan file SQL 'supabase/student_point_redemptions.sql' pada Supabase SQL Editor.",
      );
    }
    throw new Error("Gagal menambah poin manual: " + error.message);
  }

  memoryPointsCache.clear();
  revalidatePath("/points");
  revalidatePath("/students");
  revalidatePath("/portal-ortu/dashboard");
  logActivity("POINT", "Tambah poin manual", {
    student_id: studentId,
    poin_ditambah: pointsAdded,
    catatan: note?.trim(),
  });
  return record;
}

export async function getPointRedemptions(studentId?: string) {
  if (studentId) {
    await requireUserOrParent(studentId);
  } else {
    await requireUser();
  }
  const supabaseServer = getAdminClient();
  const activeBranchId = await getBranchId();

  try {
    let query = supabaseServer
      .from("student_point_redemptions")
      .select(
        `
        *,
        student:students(name, nickname)
      `,
      )
      .order("created_at", { ascending: false });

    if (studentId) {
      query = query.eq("student_id", studentId);
    } else if (activeBranchId && activeBranchId !== "ALL") {
      query = query.eq("branch_id", activeBranchId);
    }

    const { data, error } = await query;
    if (error) {
      return [];
    }
    return data || [];
  } catch (e) {
    return [];
  }
}
