"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { getTodayISO } from "../dateUtils";
import { ABSENT_WORKSHEET_OR_FILTER, memoryPointsCache, isMissingColumnError } from "./_internal";
import { getBranchId } from "./auth-branch";
import { getStudentScheduleMap, bookStudentManual } from "./schedules";

const POINTS_CACHE_TTL = 2 * 60 * 1000; // 2 menit cache in-memory untuk poin siswa
export async function getStudents(options?: {
  includePointsAndSchedule?: boolean;
}) {
  const supabaseServer = await createClient();
  const branchId = await getBranchId();
  if (!branchId) return [];

  // Hemat Egress Supabase & Vercel Origin: kecualikan kolom photo_url (Base64 40-80KB/siswa)
  // yang tidak pernah dipakai di halaman daftar siswa/jadwal/lembar kerja/poin.
  const STUDENT_COLS_NO_PHOTO =
    "id, branch_id, label_id, name, nickname, gender, date_of_birth, phone, address, school, status, registration_date, registered_at, access_pin, created_at, label:labels(id, main_level, sub_level, hex_color)";
  const STUDENT_COLS_FALLBACK =
    "id, branch_id, label_id, name, nickname, gender, date_of_birth, phone, address, school, status, registration_date, created_at, label:labels(id, main_level, sub_level, hex_color)";

  let query = supabaseServer
    .from("students")
    .select(STUDENT_COLS_NO_PHOTO)
    .order("created_at", { ascending: false });

  if (branchId !== "ALL") {
    query = query.eq("branch_id", branchId);
  }

  let { data, error } = await query;

  if (error && isMissingColumnError(error)) {
    let fbQuery = supabaseServer
      .from("students")
      .select(STUDENT_COLS_FALLBACK)
      .order("created_at", { ascending: false });
    if (branchId !== "ALL") {
      fbQuery = fbQuery.eq("branch_id", branchId);
    }
    const fbRes = await fbQuery;
    data = fbRes.data as any;
    error = fbRes.error;
  }

  if (error) {
    console.error("Error fetching students:", error);
    return [];
  }

  if (options?.includePointsAndSchedule === false) {
    return data || [];
  }

  if (data && data.length > 0) {
    const studentIds = data.map((s) => s.id);
    const scheduleMapPromise = getStudentScheduleMap(studentIds);

    const cachedPoints = memoryPointsCache.get(branchId);
    if (
      cachedPoints &&
      Date.now() - cachedPoints.timestamp < POINTS_CACHE_TTL
    ) {
      const scheduleMap = await scheduleMapPromise;
      const { grossPointsMap, redeemedPointsMap } = cachedPoints;
      return data.map((s) => {
        const gross = grossPointsMap[s.id] || 0;
        const redeemed = redeemedPointsMap[s.id] || 0;
        const net = Math.max(0, gross - redeemed);
        return {
          ...s,
          schedule: scheduleMap[s.id] || null,
          gross_points: gross,
          redeemed_points: redeemed,
          points: net,
        };
      });
    }

    // Hemat Egress ~80% dengan hasil 100% identik:
    // Tarik hanya student_id (tanpa teks materi/kegiatan/hasil_belajar yang besar)
    // lalu kurangi dengan jumlah baris absen yang difilter di PostgreSQL.
    const allWsIdsPromise = (async () => {
      const PAGE = 1000;
      const allWs: any[] = [];
      for (let page = 0; ; page++) {
        const from = page * PAGE;
        const { data: wsPage, error: wsErr } = await supabaseServer
          .from("student_worksheets")
          .select("student_id")
          .in("student_id", studentIds)
          .order("student_id", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (wsErr) {
          console.warn("Notice fetching worksheets for points:", wsErr.message);
          break;
        }
        if (wsPage && wsPage.length > 0) {
          allWs.push(...wsPage);
        }
        if (!wsPage || wsPage.length < PAGE) break;
      }
      return allWs;
    })();

    const absentWsIdsPromise = (async () => {
      const PAGE = 1000;
      const absWs: any[] = [];
      for (let page = 0; ; page++) {
        const from = page * PAGE;
        const { data: absPage, error: absErr } = await supabaseServer
          .from("student_worksheets")
          .select("student_id")
          .in("student_id", studentIds)
          .or(ABSENT_WORKSHEET_OR_FILTER)
          .order("student_id", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (absErr) {
          console.warn(
            "Notice fetching absent worksheets for points:",
            absErr.message,
          );
          break;
        }
        if (absPage && absPage.length > 0) {
          absWs.push(...absPage);
        }
        if (!absPage || absPage.length < PAGE) break;
      }
      return absWs;
    })();

    // Paginasi + ORDER deterministik:
    // tanpa ini, cabang dengan >1000 redemption akan terpotong diam-diam.
    const redemptionsPromise = (async () => {
      const PAGE = 1000;
      const allRed: any[] = [];
      for (let page = 0; ; page++) {
        const from = page * PAGE;
        const { data: redPage, error: redErr } = await supabaseServer
          .from("student_point_redemptions")
          .select("student_id, points_deducted")
          .in("student_id", studentIds)
          .order("student_id", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (redErr) break;
        if (redPage && redPage.length > 0) allRed.push(...redPage);
        if (!redPage || redPage.length < PAGE) break;
      }
      return { data: allRed };
    })();

    const [scheduleMap, allWsIds, absentWsIds] = await Promise.all([
      scheduleMapPromise,
      allWsIdsPromise,
      absentWsIdsPromise,
    ]);

    // Hitung gross attendance points (Total Worksheet - Worksheet Absen)
    const grossPointsMap: Record<string, number> = {};
    (allWsIds || []).forEach((w) => {
      grossPointsMap[w.student_id] = (grossPointsMap[w.student_id] || 0) + 1;
    });
    (absentWsIds || []).forEach((w) => {
      grossPointsMap[w.student_id] = Math.max(
        0,
        (grossPointsMap[w.student_id] || 0) - 1,
      );
    });

    // Fetch redemptions to calculate redeemed points per student
    const redeemedPointsMap: Record<string, number> = {};
    try {
      const { data: redemptionsData } = await redemptionsPromise;

      (redemptionsData || []).forEach((r) => {
        redeemedPointsMap[r.student_id] =
          (redeemedPointsMap[r.student_id] || 0) + (r.points_deducted || 0);
      });
    } catch (e) {
      // Gracefully handle if table does not exist yet
    }

    memoryPointsCache.set(branchId, {
      grossPointsMap,
      redeemedPointsMap,
      timestamp: Date.now(),
    });

    return data.map((s) => {
      const gross = grossPointsMap[s.id] || 0;
      const redeemed = redeemedPointsMap[s.id] || 0;
      const net = Math.max(0, gross - redeemed);
      return {
        ...s,
        schedule: scheduleMap[s.id] || null,
        gross_points: gross,
        redeemed_points: redeemed,
        points: net,
      };
    });
  }

  return data || [];
}

export async function createStudent(formData: FormData) {
  const name = formData.get("name") as string;
  const nickname = formData.get("nickname") as string;
  const gender = formData.get("gender") as string;
  const date_of_birth = formData.get("date_of_birth") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const school = formData.get("school") as string;
  const status = formData.get("status") as string;
  const label_id = formData.get("label_id") as string;
  const registration_date =
    (formData.get("registration_date") as string) ||
    new Date().toISOString().split("T")[0];
  // Jadwal sesi CG (opsional di level server; wajib divalidasi di form).
  const cg_date = (formData.get("cg_date") as string) || "";
  const cg_class_id = (formData.get("cg_class_id") as string) || "";
  const cg_time = (formData.get("cg_time") as string) || "";

  const insertPayload: any = {
    branch_id: await getBranchId(),
    name,
    nickname,
    date_of_birth,
    phone,
    address,
    school,
    status,
    label_id: label_id ? label_id : null,
    registration_date,
    // Tandai kapan jadi REGISTERED. CG = NULL agar periode CG tidak masuk overdue.
    registered_at: status === "REGISTERED" ? registration_date : null,
  };

  if (gender) {
    insertPayload.gender = gender;
  }

  const supabaseServer = await createClient();

  // insert().select("id") agar ID siswa baru bisa dipakai untuk booking jadwal CG.
  const insertStudent = () =>
    supabaseServer.from("students").insert(insertPayload).select("id").single();

  let { data: createdStudent, error } = await insertStudent();

  // Fallback jika kolom registered_at belum ada (migrasi belum dijalankan)
  if (
    error &&
    ((error.message && error.message.toLowerCase().includes("registered_at")) ||
      (error.details && error.details.toLowerCase().includes("registered_at")) ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    delete insertPayload.registered_at;
    const retry = await insertStudent();
    createdStudent = retry.data;
    error = retry.error;
  }

  // Fallback jika kolom gender belum ada di database Supabase
  if (
    error &&
    ((error.message && error.message.toLowerCase().includes("gender")) ||
      (error.details && error.details.toLowerCase().includes("gender")) ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    delete insertPayload.gender;
    const retry = await insertStudent();
    createdStudent = retry.data;
    error = retry.error;
    if (
      error &&
      ((error.message &&
        error.message.toLowerCase().includes("registered_at")) ||
        (error.details &&
          error.details.toLowerCase().includes("registered_at")))
    ) {
      delete insertPayload.registered_at;
      const retry2 = await insertStudent();
      createdStudent = retry2.data;
      error = retry2.error;
    }
  }

  if (error) {
    console.error("Error creating student:", error);
    throw new Error(error.message);
  }

  const newStudentId = (createdStudent as any)?.id as string | undefined;

  // Booking jadwal CG: memakai ulang bookStudentManual (slot dibuat otomatis
  // bila belum ada). Jika gagal, hapus siswa yang baru dibuat agar tidak ada
  // pendaftaran setengah jadi / duplikat saat admin mencoba ulang.
  if (status === "CG" && newStudentId && cg_class_id && cg_date && cg_time) {
    try {
      await bookStudentManual(newStudentId, cg_class_id, cg_date, cg_time);
    } catch (bookingError: any) {
      await supabaseServer.from("students").delete().eq("id", newStudentId);
      throw new Error(
        `Jadwal CG gagal dibuat: ${bookingError?.message || "silakan pilih jadwal lain."} Pendaftaran dibatalkan, data siswa tidak tersimpan.`,
      );
    }
  }

  return newStudentId || true;
}

// =========================================
// SCHEDULE ACTIONS
// =========================================

export async function deleteStudent(id: string) {
  const supabaseServer = await createClient();
  const { error } = await supabaseServer.from("students").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return true;
}

export async function updateStudentStatus(id: string, status: string) {
  const supabaseServer = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Ambil nilai registered_at saat ini agar tidak menimpa tanggal promosi sebelumnya.
  // Read-only, tidak menambah data.
  let currentRegisteredAt: string | null = null;
  try {
    const { data: cur } = await supabaseServer
      .from("students")
      .select("registered_at")
      .eq("id", id)
      .maybeSingle();
    if (cur && typeof (cur as any).registered_at === "string") {
      currentRegisteredAt = (cur as any).registered_at.split("T")[0];
    }
  } catch {
    // Kolom belum ada → abaikan, lanjut dengan update status saja.
  }

  const payload: any = { status };
  if (status === "REGISTERED") {
    if (!currentRegisteredAt) payload.registered_at = today;
  } else if (status === "CG") {
    payload.registered_at = null;
  }

  let { error } = await supabaseServer
    .from("students")
    .update(payload)
    .eq("id", id);

  // Fallback jika kolom registered_at belum ada (migrasi belum dijalankan)
  if (
    error &&
    ((error.message && error.message.toLowerCase().includes("registered_at")) ||
      (error.details && error.details.toLowerCase().includes("registered_at")) ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    const retry = await supabaseServer
      .from("students")
      .update({ status })
      .eq("id", id);
    error = retry.error;
  }

  if (error) throw new Error(error.message);
  return true;
}

export async function updateStudentLabel(id: string, labelId: string | null) {
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("students")
    .update({ label_id: labelId || null })
    .eq("id", id);

  if (error) throw new Error("Gagal meng-update level siswa: " + error.message);
  return true;
}

export async function updateStudent(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const nickname = formData.get("nickname") as string;
  const gender = formData.get("gender") as string;
  const date_of_birth = formData.get("date_of_birth") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const school = formData.get("school") as string;
  const status = formData.get("status") as string;
  const label_id = formData.get("label_id") as string;
  const registration_date = formData.get("registration_date") as string;

  const updatePayload: any = {
    name,
    nickname,
    date_of_birth,
    phone,
    address,
    school,
    status,
    label_id: label_id ? label_id : null,
  };

  if (gender) {
    updatePayload.gender = gender;
  }

  if (registration_date) {
    updatePayload.registration_date = registration_date;
  }

  const supabaseServer = await createClient();

  // Tandai promosi CG -> REGISTERED agar periode CG tidak masuk overdue.
  // Read-only untuk cek status lama, tidak menambah data baru.
  if (status === "REGISTERED" || status === "CG") {
    try {
      const { data: cur } = await supabaseServer
        .from("students")
        .select("status, registered_at")
        .eq("id", id)
        .maybeSingle();
      const oldStatus = (cur as any)?.status as string | undefined;
      const oldRegisteredAt =
        typeof (cur as any)?.registered_at === "string"
          ? ((cur as any).registered_at as string).split("T")[0]
          : null;
      if (status === "REGISTERED" && oldStatus !== "REGISTERED") {
        if (!oldRegisteredAt) {
          updatePayload.registered_at = new Date()
            .toISOString()
            .split("T")[0];
        }
      } else if (status === "CG" && oldStatus !== "CG") {
        updatePayload.registered_at = null;
      }
    } catch {
      // Kolom belum ada → abaikan, lanjut update seperti biasa.
    }
  }

  let { error } = await supabaseServer
    .from("students")
    .update(updatePayload)
    .eq("id", id);

  // Fallback jika kolom registered_at belum ada di database Supabase
  if (
    error &&
    ((error.message && error.message.toLowerCase().includes("registered_at")) ||
      (error.details && error.details.toLowerCase().includes("registered_at")) ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    delete updatePayload.registered_at;
    const retry = await supabaseServer
      .from("students")
      .update(updatePayload)
      .eq("id", id);
    error = retry.error;
  }

  // Fallback jika kolom gender belum ada di database Supabase
  if (
    error &&
    ((error.message && error.message.toLowerCase().includes("gender")) ||
      (error.details && error.details.toLowerCase().includes("gender")) ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    delete updatePayload.gender;
    const retry = await supabaseServer
      .from("students")
      .update(updatePayload)
      .eq("id", id);
    error = retry.error;
  }

  if (error) throw new Error(error.message);
  return true;
}

export async function getStudentsByStatusWithSchedules(
  status: "REGISTERED" | "CG",
) {
  const branchId = await getBranchId();
  if (!branchId) return [];

  const supabaseServer = await createClient();
  // 1. Fetch students by status
  let studentQuery = supabaseServer
    .from("students")
    .select(
      "id, name, nickname, gender, status, label_id, label:labels(id, main_level, sub_level, hex_color)",
    )
    .eq("status", status)
    .order("name", { ascending: true });
  if (branchId !== "ALL") studentQuery = studentQuery.eq("branch_id", branchId);
  const { data: students, error: sErr } = await studentQuery;
  if (sErr || !students) return [];

  // 2. Get current month date range
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // 3. Fetch schedule bookings for these students in current month
  const studentIds = students.map((s) => s.id);
  if (studentIds.length === 0) return [];

  let schedQuery = supabaseServer
    .from("schedule_student")
    .select(
      `
      student_id,
      slot:schedule_slots!inner(
        date, time,
        class:classes(name)
      )
    `,
    )
    .in("student_id", studentIds)
    .gte("slot.date", startDate)
    .lte("slot.date", endDate);

  const { data: bookings } = await schedQuery;

  // 4. Group bookings by student_id
  const bookingMap: Record<string, any[]> = {};
  if (bookings) {
    for (const b of bookings) {
      if (!b.slot) continue;
      if (!bookingMap[b.student_id]) bookingMap[b.student_id] = [];
      bookingMap[b.student_id].push(b.slot);
    }
  }

  // 5. Merge and sort by Label (main_level, sub_level), then Name
  const getLabelStr = (s: any) => {
    const lbl = Array.isArray(s.label) ? s.label[0] : s.label;
    if (!lbl) return "ZZZ";
    return `${lbl.main_level || ""} ${lbl.sub_level || ""}`.trim();
  };

  return students
    .map((s) => ({
      ...s,
      label: Array.isArray(s.label) ? s.label[0] : s.label,
      schedules: (bookingMap[s.id] || []).sort((a: any, b: any) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      }),
    }))
    .sort((a, b) => {
      const labelA = getLabelStr(a);
      const labelB = getLabelStr(b);

      if (labelA !== labelB) {
        return labelA.localeCompare(labelB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      const nameA = a.nickname || a.name || "";
      const nameB = b.nickname || b.name || "";
      return nameA.localeCompare(nameB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

export async function updateStudentAccessPin(
  studentId: string,
  newPin: string,
) {
  if (!newPin || newPin.trim().length < 4) {
    throw new Error("PIN Akses minimal 4 karakter.");
  }

  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("students")
    .update({ access_pin: newPin.trim() })
    .eq("id", studentId);

  if (error) {
    console.error("Error updating access pin:", error);
    throw new Error("Gagal mengubah PIN Akses: " + error.message);
  }

  revalidatePath("/students");
  revalidatePath("/portal-ortu/dashboard");
  revalidatePath("/worksheets");
  return true;
}

export async function updateStudentPhotoUrl(
  studentId: string,
  photoUrl: string,
) {
  try {
    const supabaseServer = await createClient();
    const { error } = await supabaseServer
      .from("students")
      .update({ photo_url: photoUrl })
      .eq("id", studentId);

    if (error) {
      console.error("Error updating photo_url:", error);
      return { success: false, error: error.message };
    }
    revalidatePath("/portal-ortu/dashboard");
    return { success: true };
  } catch (e: any) {
    console.error("Error updating photo_url:", e);
    return {
      success: false,
      error: e.message || "Gagal memperbarui foto profil",
    };
  }
}

// =========================================
// PAGINATED STUDENTS (ON-DEMAND PER PAGE - 10 SISWA/HALAMAN)
// =========================================
export async function getPaginatedStudents(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  labelId?: string;
  gender?: string;
  statusTab?: string;
}) {
  const pageSize = Math.max(1, options?.pageSize || 10);
  const emptyResult = {
    students: [] as any[],
    totalFiltered: 0,
    totalPages: 1,
    page: 1,
    pageSize,
    counts: { all: 0, reguler: 0, cg: 0, inactive: 0 },
  };

  const branchId = await getBranchId();
  if (!branchId) return emptyResult;

  const supabaseServer = await createClient();

  // 1. Ambil indeks ringan siswa cabang aktif untuk filter, counter status, & urutan sortir
  const INDEX_COLS =
    "id, name, nickname, gender, status, label_id, label:labels(id, main_level, sub_level, hex_color)";
  const INDEX_COLS_FALLBACK =
    "id, name, nickname, status, label_id, label:labels(id, main_level, sub_level, hex_color)";

  let indexQuery = supabaseServer
    .from("students")
    .select(INDEX_COLS)
    .order("created_at", { ascending: false });

  if (branchId !== "ALL") {
    indexQuery = indexQuery.eq("branch_id", branchId);
  }

  let { data: indexRows, error: indexErr } = await indexQuery;

  if (
    indexErr &&
    ((indexErr.message && indexErr.message.toLowerCase().includes("gender")) ||
      (indexErr.details && indexErr.details.toLowerCase().includes("gender")) ||
      indexErr.code === "PGRST204" ||
      indexErr.code === "42703")
  ) {
    let fallbackIndexQ = supabaseServer
      .from("students")
      .select(INDEX_COLS_FALLBACK)
      .order("created_at", { ascending: false });
    if (branchId !== "ALL") {
      fallbackIndexQ = fallbackIndexQ.eq("branch_id", branchId);
    }
    const retryIndex = await fallbackIndexQ;
    indexRows = retryIndex.data as any;
    indexErr = retryIndex.error;
  }

  if (indexErr || !indexRows) {
    console.error("Error fetching student index for pagination:", indexErr);
    return emptyResult;
  }

  const searchLower = (options?.search || "").trim().toLowerCase();
  const selectedLabelId = options?.labelId || "";
  const selectedGender = options?.gender || "";
  const activeTab = options?.statusTab || "all";

  const matchesGenderFilter = (s: any) => {
    if (selectedGender === "") return true;
    if (selectedGender === "unset") return !s.gender || s.gender === "";
    return s.gender === selectedGender;
  };

  // Filter berdasarkan search, level, dan gender untuk menghitung counter tiap tab status secara identik
  const baseFiltered = (indexRows as any[]).filter((s) => {
    const matchesSearch =
      !searchLower ||
      (s.name && s.name.toLowerCase().includes(searchLower)) ||
      (s.nickname && s.nickname.toLowerCase().includes(searchLower));
    const matchesLabel =
      selectedLabelId === "" || s.label_id === selectedLabelId;
    const matchesGender = matchesGenderFilter(s);
    return matchesSearch && matchesLabel && matchesGender;
  });

  let regulerCount = 0;
  let cgCount = 0;
  let inactiveCount = 0;
  for (const s of baseFiltered) {
    if (s.status === "REGISTERED") regulerCount++;
    else if (s.status === "CG") cgCount++;
    else if (s.status === "INACTIVE") inactiveCount++;
  }
  const counts = {
    all: baseFiltered.length,
    reguler: regulerCount,
    cg: cgCount,
    inactive: inactiveCount,
  };

  // Filter berdasarkan statusTab & urutkan dengan aturan sortir yang 100% identik
  const tabFiltered = baseFiltered
    .filter((s) => {
      if (activeTab === "all") return true;
      if (activeTab === "reguler") return s.status === "REGISTERED";
      if (activeTab === "cg") return s.status === "CG";
      if (activeTab === "inactive") return s.status === "INACTIVE";
      return true;
    })
    .sort((a, b) => {
      const labelA = Array.isArray(a.label) ? a.label[0] : a.label;
      const labelB = Array.isArray(b.label) ? b.label[0] : b.label;
      if (labelA && !labelB) return -1;
      if (!labelA && labelB) return 1;
      if (!labelA && !labelB) {
        return (a.name || "").localeCompare(b.name || "");
      }
      const mainCompare = (labelA.main_level || "").localeCompare(
        labelB.main_level || "",
      );
      if (mainCompare !== 0) return mainCompare;
      const subCompare = (labelA.sub_level || "").localeCompare(
        labelB.sub_level || "",
      );
      if (subCompare !== 0) return subCompare;
      return (a.name || "").localeCompare(b.name || "");
    });

  const totalFiltered = tabFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, options?.page || 1), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageIndexItems = tabFiltered.slice(startIdx, startIdx + pageSize);

  if (pageIndexItems.length === 0) {
    return {
      students: [],
      totalFiltered,
      totalPages,
      page: safePage,
      pageSize,
      counts,
    };
  }

  // 2. Fetch detail lengkap & hitung poin HANYA untuk 10 siswa di halaman aktif ini
  const pageStudentIds = pageIndexItems.map((s) => s.id);

  const STUDENT_COLS_NO_PHOTO =
    "id, branch_id, name, nickname, gender, date_of_birth, registration_date, registered_at, status, label_id, phone, address, school, created_at, label:labels(id, main_level, sub_level, hex_color)";
  const STUDENT_COLS_FALLBACK =
    "id, branch_id, name, nickname, date_of_birth, registration_date, status, label_id, phone, address, school, created_at, label:labels(id, main_level, sub_level, hex_color)";

  let { data: pageDetails, error: detailErr } = await supabaseServer
    .from("students")
    .select(STUDENT_COLS_NO_PHOTO)
    .in("id", pageStudentIds);

  if (detailErr) {
    const retryDetail = await supabaseServer
      .from("students")
      .select(STUDENT_COLS_FALLBACK)
      .in("id", pageStudentIds);
    pageDetails = retryDetail.data as any;
  }

  const detailById = new Map<string, any>();
  for (const d of pageDetails || []) {
    detailById.set((d as any).id, d);
  }

  // Hitung poin kehadiran hanya untuk 10 siswa di halaman ini
  const grossPointsMap: Record<string, number> = {};
  const redeemedPointsMap: Record<string, number> = {};

  const cachedPoints = memoryPointsCache.get(branchId);
  if (
    cachedPoints &&
    Date.now() - cachedPoints.timestamp < POINTS_CACHE_TTL
  ) {
    for (const sid of pageStudentIds) {
      grossPointsMap[sid] = cachedPoints.grossPointsMap[sid] || 0;
      redeemedPointsMap[sid] = cachedPoints.redeemedPointsMap[sid] || 0;
    }
  } else {
    const [allWsRes, absentWsRes, redemptionsRes] = await Promise.all([
      supabaseServer
        .from("student_worksheets")
        .select("student_id")
        .in("student_id", pageStudentIds),
      supabaseServer
        .from("student_worksheets")
        .select("student_id")
        .in("student_id", pageStudentIds)
        .or(ABSENT_WORKSHEET_OR_FILTER),
      supabaseServer
        .from("student_point_redemptions")
        .select("student_id, points_deducted")
        .in("student_id", pageStudentIds),
    ]);

    for (const w of allWsRes.data || []) {
      grossPointsMap[w.student_id] = (grossPointsMap[w.student_id] || 0) + 1;
    }
    for (const w of absentWsRes.data || []) {
      grossPointsMap[w.student_id] = Math.max(
        0,
        (grossPointsMap[w.student_id] || 0) - 1,
      );
    }
    for (const r of redemptionsRes.data || []) {
      redeemedPointsMap[r.student_id] =
        (redeemedPointsMap[r.student_id] || 0) + (r.points_deducted || 0);
    }
  }

  // Jadwal CG: ambil booking untuk siswa berstatus CG di halaman ini saja,
  // lalu pilih jadwal terdekat (upcoming; jika tidak ada, yang paling akhir).
  const cgStudentIds = (pageIndexItems as any[])
    .filter((s) => s.status === "CG")
    .map((s) => s.id as string);
  const cgScheduleMap: Record<
    string,
    { date: string; time: string; class_name: string }
  > = {};

  if (cgStudentIds.length > 0) {
    try {
      const { data: cgBookings } = await supabaseServer
        .from("schedule_student")
        .select(
          "student_id, slot:schedule_slots!inner(date, time, class:classes(name))",
        )
        .in("student_id", cgStudentIds);

      const todayISO = getTodayISO();
      const candidates: Record<
        string,
        Array<{ date: string; time: string; class_name: string }>
      > = {};

      for (const row of (cgBookings || []) as any[]) {
        const slot = row?.slot;
        if (!slot) continue;
        const cls = Array.isArray(slot.class) ? slot.class[0] : slot.class;
        const entry = {
          date: String(slot.date || "").slice(0, 10),
          time: String(slot.time || "").slice(0, 5),
          class_name: cls?.name || "-",
        };
        if (!candidates[row.student_id]) candidates[row.student_id] = [];
        candidates[row.student_id].push(entry);
      }

      for (const [studentId, list] of Object.entries(candidates)) {
        list.sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
        );
        const upcoming = list.find((e) => e.date >= todayISO);
        cgScheduleMap[studentId] = upcoming || list[list.length - 1];
      }
    } catch (cgErr) {
      // Data jadwal tidak boleh memblokir tampilan daftar siswa.
      console.warn("Notice fetching CG schedule map:", cgErr);
    }
  }

  const students = pageIndexItems.map((idxItem) => {
    const full = detailById.get(idxItem.id) || idxItem;
    const gross = grossPointsMap[idxItem.id] || 0;
    const redeemed = redeemedPointsMap[idxItem.id] || 0;
    const net = Math.max(0, gross - redeemed);
    return {
      ...full,
      gross_points: gross,
      redeemed_points: redeemed,
      points: net,
      cg_schedule: cgScheduleMap[idxItem.id] || null,
    };
  });

  return {
    students,
    totalFiltered,
    totalPages,
    page: safePage,
    pageSize,
    counts,
  };
}
