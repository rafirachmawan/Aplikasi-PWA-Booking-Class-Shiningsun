"use server";

import { supabase } from "./supabase";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTodayISO } from "./dateUtils";

export async function syncUserIdentity() {
  try {
    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();
    if (!user || !user.email) return;

    // Cek apakah user id ini sudah terdaftar di public.users
    const { data: existingUser } = await supabaseServer
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingUser) {
      // Hapus data lama yang mungkin memiliki email sama tapi ID salah (akibat salah SQL/buat ulang auth)
      await supabaseServer.from("users").delete().eq("email", user.email);

      let role = "BRANCH_ADMIN";
      let branchId = null;

      if (user.email.includes("superadmin") || user.email.includes("pusat")) {
        role = "SUPERADMIN";
      } else {
        // Deteksi cabang dari nama email (misal: ngunut@... -> Ngunut)
        const prefix = user.email.split("@")[0];
        const { data: branches } = await supabaseServer
          .from("branches")
          .select("id, name");

        if (branches) {
          const matched = branches.find((b) =>
            b.name.toLowerCase().includes(prefix.toLowerCase()),
          );
          if (matched) branchId = matched.id;
        }
      }

      // Insert otomatis identitas baru yang nyambung dengan ID Auth asli
      const { error: insertError } = await supabaseServer.from("users").insert({
        id: user.id,
        email: user.email,
        name:
          role === "SUPERADMIN"
            ? "Superadmin Utama"
            : `Admin ${user.email.split("@")[0]}`,
        role: role,
        branch_id: branchId,
        password: "auth_managed",
      });

      if (insertError) {
        console.error("Auto-sync failed:", insertError.message);
      }
    }
  } catch (err) {
    console.error("syncUserIdentity exception:", err);
  }
}

export async function getCurrentUserRole() {
  try {
    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();
    if (!user) return null;

    let { data: profile } = await supabaseServer
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile && user.email) {
      const { data: profileByEmail } = await supabaseServer
        .from("users")
        .select("role")
        .eq("email", user.email)
        .single();
      profile = profileByEmail;
    }

    return (
      profile?.role ||
      (user.email?.includes("superadmin") ? "SUPERADMIN" : "BRANCH_ADMIN")
    );
  } catch (err) {
    return "BRANCH_ADMIN";
  }
}

export async function setSuperadminBranch(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set("superadmin_branch_id", branchId, { path: "/" });
}

export async function clearSuperadminBranch() {
  const cookieStore = await cookies();
  cookieStore.delete("superadmin_branch_id");
}

export async function getBranchId() {
  try {
    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return "11111111-1111-1111-1111-111111111111";
    }

    let { data: profile } = await supabaseServer
      .from("users")
      .select("branch_id, role, email")
      .eq("id", user.id)
      .single();

    if (!profile && user.email) {
      const { data: profileByEmail } = await supabaseServer
        .from("users")
        .select("branch_id, role, email")
        .eq("email", user.email)
        .single();
      profile = profileByEmail;
    }

    const userRole =
      profile?.role ||
      (user.email?.includes("superadmin") ? "SUPERADMIN" : "BRANCH_ADMIN");

    if (userRole === "SUPERADMIN") {
      const cookieStore = await cookies();
      const selectedBranch = cookieStore.get("superadmin_branch_id")?.value;
      if (selectedBranch) {
        return selectedBranch;
      }
      return ""; // Default kosong agar superadmin harus pilih cabang dulu
    }

    if (profile?.branch_id) {
      return profile.branch_id;
    }

    if (user.email) {
      const prefix = user.email.split("@")[0];
      const { data: branches } = await supabaseServer
        .from("branches")
        .select("id, name");
      if (branches) {
        const matched = branches.find((b) =>
          b.name.toLowerCase().includes(prefix.toLowerCase()),
        );
        if (matched) return matched.id;
      }
    }

    return "ALL";
  } catch (err) {
    return "ALL";
  }
}

export async function getActiveBranchName() {
  const branchId = await getBranchId();
  if (!branchId || branchId === "ALL") return null;

  const supabaseServer = await createClient();
  const { data } = await supabaseServer
    .from("branches")
    .select("name")
    .eq("id", branchId)
    .single();

  return data?.name || null;
}

export async function getBranches() {
  const supabaseServer = await createClient();
  const { data, error } = await supabaseServer
    .from("branches")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
  return data;
}

export async function getDashboardStats() {
  try {
    const supabaseServer = await createClient();
    const branchId = await getBranchId();

    // Jika belum pilih cabang, return 0
    if (!branchId)
      return { reguler: 0, cg: 0, cgUpcoming: 0, cgPassed: 0, classes: 0 };

    // 1. Hitung Siswa Aktif (Reguler)
    let regulerQuery = supabaseServer
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "REGISTERED");
    if (branchId !== "ALL")
      regulerQuery = regulerQuery.eq("branch_id", branchId);
    const { count: regulerCount } = await regulerQuery;

    // 2. Hitung Siswa Coba Gratis (CG)
    let cgQuery = supabaseServer
      .from("students")
      .select("id")
      .eq("status", "CG");
    if (branchId !== "ALL") cgQuery = cgQuery.eq("branch_id", branchId);
    const { data: cgStudents } = await cgQuery;

    const cgCount = cgStudents?.length || 0;
    let cgUpcoming = 0;
    let cgPassed = 0;

    if (cgStudents && cgStudents.length > 0) {
      const today = getTodayISO();
      const studentIds = cgStudents.map((s) => s.id);

      const now = new Date();
      const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const { data: bookings } = await supabaseServer
        .from("schedule_student")
        .select(
          `
          student_id,
          slot:schedule_slots!inner(date)
        `,
        )
        .in("student_id", studentIds)
        .gte("slot.date", startDate)
        .lte("slot.date", endDate);

      const bookingMap: Record<string, string[]> = {};
      if (bookings) {
        for (const b of bookings) {
          if (!b.slot) continue;
          if (!bookingMap[b.student_id]) bookingMap[b.student_id] = [];
          // @ts-ignore
          bookingMap[b.student_id].push(b.slot.date);
        }
      }

      for (const s of cgStudents) {
        const dates = bookingMap[s.id] || [];
        if (dates.length === 0 || dates.some((d) => d >= today)) {
          cgUpcoming++;
        } else {
          cgPassed++;
        }
      }
    }

    // 3. Hitung Kelas
    let classQuery = supabaseServer
      .from("classes")
      .select("*", { count: "exact", head: true });
    if (branchId !== "ALL") classQuery = classQuery.eq("branch_id", branchId);
    const { count: classCount } = await classQuery;

    return {
      reguler: regulerCount || 0,
      cg: cgCount,
      cgUpcoming,
      cgPassed,
      classes: classCount || 0,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { reguler: 0, cg: 0, cgUpcoming: 0, cgPassed: 0, classes: 0 };
  }
}

export async function getClasses() {
  const supabaseServer = await createClient();
  const branchId = await getBranchId();
  if (!branchId) return [];

  let query = supabaseServer.from("classes").select("*, branch:branches(name)");

  if (branchId !== "ALL") {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching classes:", error);
    return [];
  }
  return data;
}

export async function getLabels() {
  const supabaseServer = await createClient();
  const { data, error } = await supabaseServer
    .from("labels")
    .select("*")
    .order("main_level")
    .order("sub_level");

  if (error) {
    console.error("Error fetching labels:", error);
    return [];
  }
  return data;
}

const DAYS_INDONESIAN = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const DAY_ORDER = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

export async function getStudentScheduleMap(
  studentIds: string[],
): Promise<Record<string, string>> {
  if (!studentIds || studentIds.length === 0) return {};
  try {
    const supabaseServer = await createClient();

    // Query bookings for these students
    const { data: bookings } = await supabaseServer
      .from("schedule_student")
      .select(
        `
        student_id,
        slot:schedule_slots!inner(
          date, time
        )
      `,
      )
      .in("student_id", studentIds);

    const scheduleMap: Record<string, string> = {};

    if (bookings && bookings.length > 0) {
      const studentSlotsMap: Record<string, Map<string, string>> = {};

      for (const b of bookings) {
        const slot = Array.isArray(b.slot) ? b.slot[0] : b.slot;
        if (!slot || !(slot as any).date) continue;
        const sId = b.student_id;
        if (!studentSlotsMap[sId]) {
          studentSlotsMap[sId] = new Map();
        }

        const slotDate = (slot as any).date as string;
        const slotTime = (slot as any).time as string;

        const parts = slotDate.split("-");
        if (parts.length === 3) {
          const d = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10),
          );
          const dayName = DAYS_INDONESIAN[d.getDay()];
          const timeStr = slotTime ? slotTime.substring(0, 5) : "";
          if (!studentSlotsMap[sId].has(dayName)) {
            studentSlotsMap[sId].set(dayName, timeStr);
          }
        }
      }

      for (const [sId, map] of Object.entries(studentSlotsMap)) {
        const sortedDays = Array.from(map.keys()).sort(
          (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
        );
        if (sortedDays.length === 0) continue;

        // Clean day summary: "Senin, Rabu, Jumat" or "Senin & Rabu"
        let daysText = "";
        if (sortedDays.length === 1) {
          daysText = sortedDays[0];
        } else if (sortedDays.length === 2) {
          daysText = `${sortedDays[0]} & ${sortedDays[1]}`;
        } else {
          daysText = sortedDays.join(", ");
        }

        scheduleMap[sId] = daysText;
      }
    }

    return scheduleMap;
  } catch (err) {
    console.warn("Notice fetching schedule map:", err);
    return {};
  }
}

export async function getStudents() {
  const supabaseServer = await createClient();
  const branchId = await getBranchId();
  if (!branchId) return [];

  let query = supabaseServer
    .from("students")
    .select("*, label:labels(main_level, sub_level, hex_color)")
    .order("created_at", { ascending: false });

  if (branchId !== "ALL") {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching students:", error);
    return [];
  }

  if (data && data.length > 0) {
    const studentIds = data.map((s) => s.id);
    const scheduleMap = await getStudentScheduleMap(studentIds);

    // Fetch worksheets to calculate gross attendance points for each student
    const { data: worksheetsData } = await supabaseServer
      .from("student_worksheets")
      .select("student_id, materi, title")
      .in("student_id", studentIds);

    const grossPointsMap: Record<string, number> = {};
    (worksheetsData || []).forEach((w) => {
      const m = (w.materi || "").toLowerCase();
      const t = (w.title || "").toLowerCase();
      const isAbsent =
        m.includes("tidak hadir") ||
        m.includes("libur") ||
        t.includes("tidak hadir") ||
        t.includes("libur") ||
        t.includes("ijin") ||
        t.includes("sakit");
      if (!isAbsent) {
        grossPointsMap[w.student_id] = (grossPointsMap[w.student_id] || 0) + 1;
      }
    });

    // Fetch redemptions to calculate redeemed points per student
    const redeemedPointsMap: Record<string, number> = {};
    try {
      const { data: redemptionsData } = await supabaseServer
        .from("student_point_redemptions")
        .select("student_id, points_deducted")
        .in("student_id", studentIds);

      (redemptionsData || []).forEach((r) => {
        redeemedPointsMap[r.student_id] =
          (redeemedPointsMap[r.student_id] || 0) + (r.points_deducted || 0);
      });
    } catch (e) {
      // Gracefully handle if table does not exist yet
    }

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
  };

  if (gender) {
    insertPayload.gender = gender;
  }

  let { error } = await supabase.from("students").insert(insertPayload);

  // Fallback jika kolom gender belum ada di database Supabase
  if (
    error &&
    ((error.message && error.message.toLowerCase().includes("gender")) ||
      (error.details && error.details.toLowerCase().includes("gender")) ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    delete insertPayload.gender;
    const retry = await supabase.from("students").insert(insertPayload);
    error = retry.error;
  }

  if (error) {
    console.error("Error creating student:", error);
    throw new Error(error.message);
  }

  return true;
}

// =========================================
// SCHEDULE ACTIONS
// =========================================

export async function autoBookStudentToClass(
  studentId: string,
  classId: string,
  startDateStr: string,
  time: string,
) {
  const branchId = await getBranchId();

  // 1. Hitung range sampai akhir bulan dari startDate
  const startDate = new Date(startDateStr);
  const endDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth() + 1,
    0,
  ); // Hari terakhir bulan tersebut

  const dayOfWeek = startDate.getDay();
  const datesToBook: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (currentDate.getDay() === dayOfWeek) {
      // YYYY-MM-DD
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
      datesToBook.push(dateStr);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (datesToBook.length === 0)
    throw new Error(
      "Tidak ada hari tersebut dalam rentang 1 bulan dari tanggal mulai.",
    );

  let bookedCount = 0;
  const failedDates: string[] = [];

  // 2. Loop setiap tanggal, cari slot, jika tidak ada buat baru
  for (const dateStr of datesToBook) {
    // Cari slot
    let { data: slots, error: fetchError } = await supabase
      .from("schedule_slots")
      .select(
        "id, class_id, max_quota:classes!inner(max_quota), bookings:schedule_student(student_id)",
      )
      .eq("date", dateStr)
      .eq("time", time)
      .eq("class_id", classId);

    if (fetchError)
      throw new Error("Gagal mengambil jadwal: " + fetchError.message);

    let slotId = slots && slots.length > 0 ? slots[0].id : null;
    let isFull = false;
    let alreadyBooked = false;

    if (!slotId) {
      // Buat slot baru
      const { data: newSlot, error: insertError } = await supabase
        .from("schedule_slots")
        .insert({
          branch_id: branchId,
          class_id: classId,
          date: dateStr,
          time: time,
          is_locked: false,
        })
        .select()
        .single();

      if (insertError)
        throw new Error(
          "Gagal membuat sesi jadwal baru: " + insertError.message,
        );
      slotId = newSlot.id;
    } else {
      // Cek kuota
      const slot = slots![0];
      const maxQ = (slot.max_quota as any).max_quota || 4;
      if (slot.bookings && slot.bookings.length >= maxQ) {
        isFull = true;
      }
      if (slot.bookings?.some((b: any) => b.student_id === studentId)) {
        alreadyBooked = true;
      }
    }

    if (!isFull && !alreadyBooked) {
      // Booking
      const { error: bookErr } = await supabase
        .from("schedule_student")
        .insert({ student_id: studentId, schedule_slot_id: slotId });

      if (!bookErr) bookedCount++;
      else failedDates.push(dateStr);
    } else {
      failedDates.push(dateStr);
    }
  }

  return { bookedCount, failedDates };
}

export async function bookStudentManual(
  studentId: string,
  classId: string,
  dateStr: string,
  time: string,
) {
  const branchId = await getBranchId();

  // Cari slot
  let { data: slots, error: fetchError } = await supabase
    .from("schedule_slots")
    .select(
      "id, class_id, max_quota:classes!inner(max_quota), bookings:schedule_student(student_id)",
    )
    .eq("date", dateStr)
    .eq("time", time)
    .eq("class_id", classId);

  if (fetchError)
    throw new Error("Gagal mengambil jadwal: " + fetchError.message);

  let slotId = slots && slots.length > 0 ? slots[0].id : null;

  if (!slotId) {
    // Buat slot baru
    const { data: newSlot, error: insertError } = await supabase
      .from("schedule_slots")
      .insert({
        branch_id: branchId,
        class_id: classId,
        date: dateStr,
        time: time,
        is_locked: false,
      })
      .select()
      .single();

    if (insertError)
      throw new Error("Gagal membuat sesi jadwal baru: " + insertError.message);
    slotId = newSlot.id;
  } else {
    // Cek kuota
    const slot = slots![0];
    const maxQ = (slot.max_quota as any).max_quota || 4;
    if (slot.bookings && slot.bookings.length >= maxQ) {
      throw new Error("Sesi pada tanggal dan jam tersebut sudah penuh.");
    }
    if (slot.bookings?.some((b: any) => b.student_id === studentId)) {
      throw new Error("Siswa sudah terdaftar di sesi tersebut.");
    }
  }

  // Booking
  const { error: bookErr } = await supabase
    .from("schedule_student")
    .insert({ student_id: studentId, schedule_slot_id: slotId });

  if (bookErr) throw new Error("Gagal mem-booking siswa: " + bookErr.message);
  return true;
}

export async function removeStudentBooking(
  scheduleSlotId: string,
  studentId: string,
) {
  const { error } = await supabase
    .from("schedule_student")
    .delete()
    .eq("schedule_slot_id", scheduleSlotId)
    .eq("student_id", studentId);

  if (error) throw new Error("Gagal menghapus jadwal: " + error.message);
  return true;
}

export async function bulkRemoveStudentBookings(
  studentId: string,
  scheduleSlotIds: string[],
) {
  if (scheduleSlotIds.length === 0) return true;
  const { error } = await supabase
    .from("schedule_student")
    .delete()
    .eq("student_id", studentId)
    .in("schedule_slot_id", scheduleSlotIds);

  if (error) throw new Error("Gagal menghapus jadwal massal: " + error.message);
  return true;
}

export async function copyScheduleToNextMonth(
  studentId: string,
  currentYear: number,
  currentMonth: number,
) {
  const schedules = await getMonthlySchedules(currentYear, currentMonth);
  const studentSchedules = schedules.filter((s) =>
    s.bookings?.some((b: any) => b.student_id === studentId),
  );

  if (studentSchedules.length === 0) return { totalBooked: 0, failedDates: [] };

  const patterns = new Set<string>();
  const uniquePatterns: any[] = [];

  studentSchedules.forEach((slot) => {
    const d = new Date(slot.date);
    const dayOfWeek = d.getDay();
    const key = `${dayOfWeek}-${slot.time}-${slot.class_id}`;
    if (!patterns.has(key)) {
      patterns.add(key);
      uniquePatterns.push({
        dayOfWeek,
        time: slot.time,
        classId: slot.class_id,
      });
    }
  });

  let nextYear = currentYear;
  let nextMonth = currentMonth + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  let totalBooked = 0;
  const failedDates: string[] = [];

  for (const pattern of uniquePatterns) {
    let firstDate = new Date(nextYear, nextMonth - 1, 1);
    while (firstDate.getDay() !== pattern.dayOfWeek) {
      firstDate.setDate(firstDate.getDate() + 1);
    }

    const y = firstDate.getFullYear();
    const m = String(firstDate.getMonth() + 1).padStart(2, "0");
    const d = String(firstDate.getDate()).padStart(2, "0");
    const startDateStr = `${y}-${m}-${d}`;

    const res = await autoBookStudentToClass(
      studentId,
      pattern.classId,
      startDateStr,
      pattern.time,
    );
    totalBooked += res.bookedCount;
    if (res.failedDates.length > 0) {
      failedDates.push(...res.failedDates);
    }
  }

  return { totalBooked, failedDates };
}

export async function moveStudentBooking(
  studentId: string,
  oldSlotId: string,
  newClassId: string,
  newDateStr: string,
  newTime: string,
) {
  await removeStudentBooking(oldSlotId, studentId);
  try {
    await bookStudentManual(studentId, newClassId, newDateStr, newTime);
  } catch (err: any) {
    // If it fails to book the new one, we should ideally rollback, but simple approach is to throw error
    throw new Error(err.message);
  }
  return true;
}

export async function getMonthlySchedules(year: number, month: number) {
  const branchId = await getBranchId();
  if (!branchId) return [];

  // Hitung tanggal awal dan akhir bulan
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Hari terakhir bulan tersebut

  let query = supabase
    .from("schedule_slots")
    .select(
      `
      *,
      class:classes(name, max_quota),
      bookings:schedule_student(
        student_id,
        student:students(name, nickname, status, label:labels(hex_color))
      )
    `,
    )
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (branchId !== "ALL") {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }
  return data;
}

export async function createScheduleSlot(formData: FormData) {
  const class_id = formData.get("class_id") as string;
  const dateStr = formData.get("date") as string; // YYYY-MM-DD
  const time = formData.get("time") as string; // HH:MM
  const isRecurring = formData.get("is_recurring") === "true"; // Repeat 1 month

  const datesToInsert = [dateStr];

  if (isRecurring) {
    // Cari sisa hari yang sama di bulan yang sama
    const baseDate = new Date(dateStr);
    const month = baseDate.getMonth();
    const year = baseDate.getFullYear();
    const dayOfWeek = baseDate.getDay(); // 0 (Sun) - 6 (Sat)

    // Mulai dari 1 minggu ke depan
    for (let i = 1; i <= 4; i++) {
      const nextDate = new Date(year, month, baseDate.getDate() + i * 7);
      // Jika masih di bulan yang sama, masukkan ke array
      if (nextDate.getMonth() === month) {
        datesToInsert.push(nextDate.toISOString().split("T")[0]);
      } else {
        break;
      }
    }
  }

  const branchId = await getBranchId();
  const payload = datesToInsert.map((d) => ({
    branch_id: branchId,
    class_id,
    date: d,
    time,
    is_locked: false,
  }));

  const { error } = await supabase.from("schedule_slots").insert(payload);

  if (error) {
    console.error("Error creating schedule:", error);
    throw new Error(error.message);
  }

  return true;
}

export async function bookStudentToSlot(
  studentId: string,
  scheduleSlotId: string,
) {
  // Pessimistic Quota Check
  // 1. Dapatkan slot saat ini beserta kuota maksimal kelas
  const { data: slotData, error: slotError } = await supabase
    .from("schedule_slots")
    .select("is_locked, class:classes(max_quota)")
    .eq("id", scheduleSlotId)
    .single();

  if (slotError || !slotData) {
    throw new Error("Gagal mengambil data jadwal.");
  }

  if (slotData.is_locked) {
    throw new Error(
      "Jadwal ini sudah dikunci (Locked). Tidak bisa menambah siswa.",
    );
  }

  const maxQuota = (slotData.class as any)?.max_quota || 4;

  // 2. Hitung jumlah siswa yang sudah booking
  const { count, error: countError } = await supabase
    .from("schedule_student")
    .select("*", { count: "exact", head: true })
    .eq("schedule_slot_id", scheduleSlotId);

  if (countError) {
    throw new Error("Gagal mengecek kuota.");
  }

  if (count !== null && count >= maxQuota) {
    throw new Error(`Kelas penuh! Maksimal kuota adalah ${maxQuota} siswa.`);
  }

  // 3. Insert jika masih aman
  const { error: insertError } = await supabase
    .from("schedule_student")
    .insert({
      schedule_slot_id: scheduleSlotId,
      student_id: studentId,
    });

  if (insertError) {
    // Tangani kemungkinan duplikasi (unique constraint di DB)
    if (insertError.code === "23505") {
      throw new Error("Siswa ini sudah terdaftar di sesi jadwal ini.");
    }
    throw new Error(insertError.message);
  }

  return true;
}

export async function toggleSlotLock(
  scheduleSlotId: string,
  currentStatus: boolean,
) {
  const { error } = await supabase
    .from("schedule_slots")
    .update({ is_locked: !currentStatus })
    .eq("id", scheduleSlotId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

// =========================================
// MASTER DATA ACTIONS
// =========================================

export async function createClass(formData: FormData) {
  const name = formData.get("name") as string;
  const max_quota = parseInt(formData.get("max_quota") as string, 10) || 4;
  const branchId = await getBranchId();

  if (branchId === "ALL") {
    throw new Error(
      "Tidak dapat membuat kelas di mode 'Semua Cabang'. Silakan pilih cabang spesifik terlebih dahulu.",
    );
  }

  const { error } = await supabase.from("classes").insert({
    branch_id: branchId,
    name,
    // @ts-ignore: max_quota doesn't exist in generated types yet but is in the DB schema
    max_quota,
  });

  if (error) {
    console.error("Error creating class:", error);
    throw new Error(error.message);
  }
  return true;
}

export async function createLabel(formData: FormData) {
  const main_level = formData.get("main_level") as string;
  const sub_level = formData.get("sub_level") as string;
  const hex_color = formData.get("hex_color") as string;

  // Labels are global — no branch_id needed
  const { error } = await supabase.from("labels").insert({
    branch_id: null,
    is_system_default: false,
    main_level,
    sub_level,
    hex_color,
  });

  if (error) {
    console.error("Error creating label:", error);
    throw new Error(error.message);
  }
  return true;
}

// =========================================
// DELETE & UPDATE ACTIONS (FULL CRUD)
// =========================================

export async function deleteStudent(id: string) {
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return true;
}

export async function updateStudentStatus(id: string, status: string) {
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  return true;
}

export async function updateStudentLabel(id: string, labelId: string | null) {
  const { error } = await supabase
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

  let { error } = await supabase
    .from("students")
    .update(updatePayload)
    .eq("id", id);

  // Fallback jika kolom gender belum ada di database Supabase
  if (
    error &&
    ((error.message && error.message.toLowerCase().includes("gender")) ||
      (error.details && error.details.toLowerCase().includes("gender")) ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    delete updatePayload.gender;
    const retry = await supabase
      .from("students")
      .update(updatePayload)
      .eq("id", id);
    error = retry.error;
  }

  if (error) throw new Error(error.message);
  return true;
}

export async function cancelBooking(scheduleSlotId: string, studentId: string) {
  const { error } = await supabase
    .from("schedule_student")
    .delete()
    .match({ schedule_slot_id: scheduleSlotId, student_id: studentId });

  if (error) throw new Error(error.message);
  return true;
}

export async function deleteClass(id: string) {
  const supabaseServer = await createClient();

  // 1. Dapatkan semua jadwal yang terkait dengan kelas ini
  const { data: slots } = await supabaseServer
    .from("schedule_slots")
    .select("id")
    .eq("class_id", id);

  if (slots && slots.length > 0) {
    const slotIds = slots.map((s) => s.id);

    // 2. Hapus semua data booking siswa di jadwal tersebut
    await supabaseServer
      .from("schedule_student")
      .delete()
      .in("schedule_slot_id", slotIds);

    // 3. Hapus jadwal (slots) itu sendiri
    await supabaseServer.from("schedule_slots").delete().eq("class_id", id);
  }

  // 4. Hapus kelas
  const { error } = await supabaseServer.from("classes").delete().eq("id", id);

  if (error) throw new Error("Gagal menghapus kelas. " + error.message);
  return true;
}

export async function deleteLabel(id: string) {
  const { error } = await supabase.from("labels").delete().eq("id", id);

  if (error)
    throw new Error(
      "Gagal menghapus label. Pastikan tidak ada siswa yang menggunakan label ini.",
    );
  return true;
}

export async function getSchedulesByDate(dateStr: string) {
  const branchId = await getBranchId();

  // Jika belum pilih cabang, return kosong
  if (!branchId) return [];

  let query = supabase
    .from("schedule_slots")
    .select(
      `
      *,
      class:classes(name, max_quota),
      bookings:schedule_student(
        student_id,
        student:students(name, nickname, status, label:labels(hex_color))
      )
    `,
    )
    .eq("date", dateStr)
    .order("time", { ascending: true });

  if (branchId !== "ALL") {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching schedules by date:", error);
    return [];
  }
  return data || [];
}

export async function getTodaySchedules() {
  const today = getTodayISO();
  return getSchedulesByDate(today);
}

export async function getStudentsByStatusWithSchedules(
  status: "REGISTERED" | "CG",
) {
  const branchId = await getBranchId();
  if (!branchId) return [];

  // 1. Fetch students by status
  let studentQuery = supabase
    .from("students")
    .select(
      "id, name, nickname, gender, status, label:labels(main_level, sub_level, hex_color)",
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

  let schedQuery = supabase
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

export async function getClassesWithSchedules() {
  const branchId = await getBranchId();
  if (!branchId) return [];

  // 1. Fetch classes
  let classQuery = supabase
    .from("classes")
    .select("*, branch:branches(name)")
    .order("name", { ascending: true });
  if (branchId !== "ALL") classQuery = classQuery.eq("branch_id", branchId);
  const { data: classes, error: cErr } = await classQuery;
  if (cErr || !classes) return [];

  // 2. Get current month date range
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const classIds = classes.map((c) => c.id);
  if (classIds.length === 0) return [];

  // 3. Fetch schedule slots with student bookings
  let slotQuery = supabase
    .from("schedule_slots")
    .select(
      `
      id, class_id, date, time, is_locked,
      bookings:schedule_student(
        student_id,
        student:students(name, nickname, status, label:labels(hex_color))
      )
    `,
    )
    .in("class_id", classIds)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  const { data: slots } = await slotQuery;

  // 4. Group slots by class_id
  const slotMap: Record<string, any[]> = {};
  if (slots) {
    for (const s of slots) {
      if (!slotMap[s.class_id]) slotMap[s.class_id] = [];
      slotMap[s.class_id].push(s);
    }
  }

  // 5. Merge
  return classes.map((c) => ({
    ...c,
    schedules: slotMap[c.id] || [],
  }));
}

export async function resetAllDatabaseData() {
  const role = await getCurrentUserRole();
  if (role !== "SUPERADMIN") {
    throw new Error(
      "Hanya Superadmin yang memiliki izin untuk meriset semua data.",
    );
  }

  const supabaseServer = await createClient();

  // 1. Delete all from schedule_student
  const { error: err1 } = await supabaseServer
    .from("schedule_student")
    .delete()
    .neq("student_id", "00000000-0000-0000-0000-000000000000");

  if (err1) throw new Error("Gagal menghapus data booking: " + err1.message);

  // 2. Delete all from schedule_slots
  const { error: err2 } = await supabaseServer
    .from("schedule_slots")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (err2)
    throw new Error("Gagal menghapus data slot jadwal: " + err2.message);

  // 3. Delete all from students
  const { error: err3 } = await supabaseServer
    .from("students")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (err3) throw new Error("Gagal menghapus data siswa: " + err3.message);

  // 4. Delete all from classes
  const { error: err4 } = await supabaseServer
    .from("classes")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (err4) throw new Error("Gagal menghapus data kelas: " + err4.message);

  // Labels are global and NOT deleted during reset

  return { success: true };
}

export async function getRecentActivities() {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabaseServer
    .from("users")
    .select("role, branch_id")
    .eq("id", user.id)
    .single();

  if (!profile) return [];

  // Single unified query with branch_id always in select to keep types consistent
  const isBranchAdmin = profile.role !== "SUPERADMIN" && !!profile.branch_id;

  const selectQuery = supabaseServer
    .from("schedule_student")
    .select(
      `
      created_at,
      student:students(name, status),
      slot:schedule_slots!inner(
        date,
        time,
        branch_id,
        class:classes(name),
        branch:branches(name)
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const finalQuery = isBranchAdmin
    ? selectQuery.eq("slot.branch_id", profile.branch_id)
    : selectQuery;

  const { data, error } = await finalQuery;
  if (error) {
    console.error("Error fetching activities:", error);
    return [];
  }

  return data || [];
}

// =========================================
// ACCOUNT MANAGEMENT ACTIONS (SUPERADMIN)
// =========================================

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env.local. Ambil key service_role dari Dashboard Supabase -> Project Settings -> API.",
    );
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey);
}

export async function getAllUsers() {
  const role = await getCurrentUserRole();
  if (role !== "SUPERADMIN") throw new Error("Akses ditolak");

  const { data, error } = await supabase
    .from("users")
    .select("*, branch:branches(name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const role = await getCurrentUserRole();
  if (role !== "SUPERADMIN") throw new Error("Akses ditolak");

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password baru minimal 6 karakter.");
  }

  const serviceClient = getServiceSupabase();

  // Update password di Supabase Auth
  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    userId,
    {
      password: newPassword,
    },
  );

  if (authError)
    throw new Error("Gagal mengganti password di server: " + authError.message);
  return true;
}

// =========================================
// LEMBAR KERJA SISWA & PORTAL ORANG TUA ACTIONS
// =========================================

export async function getWorksheetsByBranch() {
  try {
    const branchId = await getBranchId();
    if (!branchId) return [];

    const supabaseServer = await createClient();
    let query = supabaseServer
      .from("student_worksheets")
      .select(
        `
        *,
        student:students(id, name, nickname, gender, date_of_birth, status, access_pin, label:labels(main_level, sub_level, hex_color))
      `,

      )
      .order("worksheet_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (branchId !== "ALL") {
      query = query.eq("branch_id", branchId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn(
        "Notice fetching worksheets (Pastikan SQL Migration sudah dijalankan):",
        error.message || error,
      );
      return [];
    }

    if (data && data.length > 0) {
      const studentIds = Array.from(
        new Set(data.map((w) => w.student_id).filter(Boolean)),
      );
      const scheduleMap = await getStudentScheduleMap(studentIds);
      return data.map((w) => {
        if (w.student) {
          return {
            ...w,
            student: {
              ...w.student,
              schedule: scheduleMap[w.student_id] || null,
            },
          };
        }
        return w;
      });
    }

    return data || [];
  } catch (err: any) {
    console.warn("Exception fetching worksheets:", err?.message || err);
    return [];
  }
}

export async function getWorksheetsByStudent(studentId: string) {
  try {
    const supabaseServer = await createClient();
    const { data, error } = await supabaseServer
      .from("student_worksheets")
      .select("*")
      .eq("student_id", studentId)
      .order("worksheet_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn(
        "Notice fetching student worksheets:",
        error.message || error,
      );
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn("Exception fetching student worksheets:", err?.message || err);
    return [];
  }
}

export async function createWorksheet(formData: FormData) {
  const student_id = formData.get("student_id") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const worksheet_date =
    (formData.get("worksheet_date") as string) || getTodayISO();
  const gdrive_link = (formData.get("gdrive_link") as string) || "";
  const materi = (formData.get("materi") as string) || "";
  const kegiatan = (formData.get("kegiatan") as string) || "";
  const hasil_belajar = (formData.get("hasil_belajar") as string) || "";
  const catatan_guru = (formData.get("catatan_guru") as string) || "";
  const rekomendasi_rumah = (formData.get("rekomendasi_rumah") as string) || "";
  const ttd_guru = (formData.get("ttd_guru") as string) || "";
  const bulan_ke = formData.get("bulan_ke")
    ? parseInt(formData.get("bulan_ke") as string, 10)
    : null;

  if (!student_id || !title) {
    throw new Error("Siswa dan Judul Laporan Perkembangan wajib diisi.");
  }

  const branchId = await getBranchId();
  const supabaseServer = await createClient();

  const { error } = await supabaseServer.from("student_worksheets").insert({
    student_id,
    branch_id: branchId === "ALL" ? null : branchId,
    title,
    description,
    worksheet_date,
    gdrive_link,
    materi,
    kegiatan,
    hasil_belajar,
    catatan_guru,
    rekomendasi_rumah,
    ttd_guru,
    bulan_ke,
  });

  if (error) {
    if (
      error.code === "42P01" ||
      error.message.includes(
        'relation "public.student_worksheets" does not exist',
      )
    ) {
      throw new Error(
        "Tabel 'student_worksheets' belum dibuat di Supabase. Silakan jalankan SQL di Supabase SQL Editor.",
      );
    }
    if (
      error.message.includes("schema cache") ||
      error.message.includes("Could not find the")
    ) {
      throw new Error(
        "Kolom baru belum ditambahkan di database Supabase! Silakan eksekusi query migrasi di file 'supabase/student_worksheets.sql' pada Supabase SQL Editor.",
      );
    }
    throw new Error(error.message);
  }

  return true;
}

export async function updateWorksheet(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const worksheet_date = formData.get("worksheet_date") as string;
  const gdrive_link = (formData.get("gdrive_link") as string) || "";
  const materi = (formData.get("materi") as string) || "";
  const kegiatan = (formData.get("kegiatan") as string) || "";
  const hasil_belajar = (formData.get("hasil_belajar") as string) || "";
  const catatan_guru = (formData.get("catatan_guru") as string) || "";
  const rekomendasi_rumah = (formData.get("rekomendasi_rumah") as string) || "";
  const ttd_guru = (formData.get("ttd_guru") as string) || "";
  const bulan_ke = formData.get("bulan_ke")
    ? parseInt(formData.get("bulan_ke") as string, 10)
    : null;

  if (!title) {
    throw new Error("Judul Laporan Perkembangan wajib diisi.");
  }

  const supabaseServer = await createClient();
  const updatePayload: any = {
    title,
    description,
    gdrive_link,
    materi,
    kegiatan,
    hasil_belajar,
    catatan_guru,
    rekomendasi_rumah,
    ttd_guru,
    bulan_ke,
    updated_at: new Date().toISOString(),
  };

  if (worksheet_date) {
    updatePayload.worksheet_date = worksheet_date;
  }

  const { error } = await supabaseServer
    .from("student_worksheets")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    if (
      error.message.includes("schema cache") ||
      error.message.includes("Could not find the")
    ) {
      throw new Error(
        "Kolom baru belum ditambahkan di database Supabase! Silakan eksekusi query migrasi di file 'supabase/student_worksheets.sql' pada Supabase SQL Editor.",
      );
    }
    throw new Error(error.message);
  }

  return true;
}

export async function deleteWorksheet(id: string) {
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("student_worksheets")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting worksheet:", error);
    throw new Error("Gagal menghapus laporan perkembangan: " + error.message);
  }

  return true;
}

export async function deleteWorksheetMonth(
  studentId: string,
  bulanKe: number | null,
) {
  const supabaseServer = await createClient();
  let query = supabaseServer
    .from("student_worksheets")
    .delete()
    .eq("student_id", studentId);

  if (bulanKe !== null && bulanKe !== undefined) {
    query = query.eq("bulan_ke", bulanKe);
  } else {
    query = query.is("bulan_ke", null);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting worksheet month:", error);
    throw new Error("Gagal menghapus laporan perkembangan: " + error.message);
  }

  return true;
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

  return true;
}

export async function verifyParentAccess(
  studentNameOrSearch: string,
  pin: string,
) {
  if (!studentNameOrSearch || !pin) {
    throw new Error("Nama Siswa dan PIN Akses wajib diisi.");
  }

  const cleanSearch = studentNameOrSearch.trim().toLowerCase();
  const cleanPin = pin.trim();

  const supabaseServer = await createClient();

  // Search student by name or nickname
  const { data: students, error } = await supabaseServer.from("students")
    .select(`
      id, name, nickname, gender, date_of_birth, status, registration_date, access_pin,
      branch:branches(name),
      label:labels(main_level, sub_level, hex_color)
    `);

  if (error || !students || students.length === 0) {
    throw new Error(
      "Data siswa tidak ditemukan. Mohon periksa kembali nama yang dimasukkan.",
    );
  }

  // Priority-based matching: exact match first, then partial match as fallback
  // This prevents "Rafi" from matching "Syafira" instead of the actual student named "Rafi"
  
  // Helper: check if a student's PIN matches
  const pinMatches = (s: any) => (s.access_pin || "123456") === cleanPin;

  // 1. Exact nickname match (case-insensitive) — highest priority
  let matchedStudent = students.find((s) =>
    s.nickname && s.nickname.toLowerCase() === cleanSearch && pinMatches(s)
  );

  // 2. Exact full name match (case-insensitive)
  if (!matchedStudent) {
    matchedStudent = students.find((s) =>
      s.name.toLowerCase() === cleanSearch && pinMatches(s)
    );
  }

  // 3. Name starts with search term (more specific than includes)
  if (!matchedStudent) {
    matchedStudent = students.find((s) => {
      const nameStartsWith = s.name.toLowerCase().startsWith(cleanSearch);
      const nicknameStartsWith = s.nickname && s.nickname.toLowerCase().startsWith(cleanSearch);
      return (nameStartsWith || nicknameStartsWith) && pinMatches(s);
    });
  }

  // 4. Partial match (contains) as last resort
  if (!matchedStudent) {
    matchedStudent = students.find((s) => {
      const nameMatch =
        s.name.toLowerCase().includes(cleanSearch) ||
        (s.nickname && s.nickname.toLowerCase().includes(cleanSearch)) ||
        s.id === cleanSearch;
      return nameMatch && pinMatches(s);
    });
  }

  if (!matchedStudent) {
    throw new Error("Nama siswa atau PIN Akses salah. Silakan coba lagi.");
  }

  if (matchedStudent.status === "INACTIVE") {
    throw new Error(
      "Akun siswa ini sedang Nonaktif. Silakan hubungi pihak admin sekolah."
    );
  }

  // Set session cookie for Parent Portal (valid for 7 days)
  const cookieStore = await cookies();
  cookieStore.set("parent_student_id", matchedStudent.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  });

  // Exclude access_pin from returned student object
  const { access_pin, ...safeStudent } = matchedStudent;
  return safeStudent;
}

export async function getParentSessionStudent() {
  const cookieStore = await cookies();
  const studentId = cookieStore.get("parent_student_id")?.value;
  if (!studentId) return null;

  const supabaseServer = await createClient();
  const { data: student, error } = await supabaseServer
    .from("students")
    .select(
      `
      id, name, nickname, gender, date_of_birth, status, registration_date,
      branch:branches(name),
      label:labels(main_level, sub_level, hex_color)
    `,
    )
    .eq("id", studentId)
    .single();

  if (error || !student) return null;

  if (student.status === "INACTIVE") {
    cookieStore.delete("parent_student_id");
    return null;
  }

  const scheduleMap = await getStudentScheduleMap([student.id]);
  return {
    ...student,
    schedule: scheduleMap[student.id] || null,
  };
}

export async function clearParentSession() {
  const cookieStore = await cookies();
  cookieStore.delete("parent_student_id");
  return true;
}

export async function getStudentUpcomingSchedule(studentId: string) {
  const supabaseServer = await createClient();
  const today = getTodayISO();

  const { data: bookings, error } = await supabaseServer
    .from("schedule_student")
    .select(
      `
      slot:schedule_slots!inner(
        id, date, time, is_locked,
        class:classes(name, max_quota)
      )
    `,
    )
    .eq("student_id", studentId)
    .gte("slot.date", today)
    .order("slot(date)", { ascending: true })
    .order("slot(time)", { ascending: true });

  if (error) {
    console.error("Error fetching upcoming student schedule:", error);
    return [];
  }

  return (
    (bookings || [])
      .map((b) => b.slot)
      .filter(Boolean)
      // Sort properly by date & time
      .sort((a: any, b: any) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      })
  );
}

export async function getStudentScheduleHistory(studentId: string) {
  const supabaseServer = await createClient();
  const today = getTodayISO();

  const { data: bookings, error } = await supabaseServer
    .from("schedule_student")
    .select(
      `
      slot:schedule_slots!inner(
        id, date, time, is_locked,
        class:classes(name)
      )
    `,
    )
    .eq("student_id", studentId)
    .lt("slot.date", today)
    .order("slot(date)", { ascending: false })
    .order("slot(time)", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error fetching student schedule history:", error);
    return [];
  }

  return (bookings || [])
    .map((b) => b.slot)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
}

export async function updateParentFeedback(
  studentId: string,
  bulanKe: number | null,
  catatanOrtu: string | null,
) {
  const supabaseServer = await createClient();
  const valueToStore =
    typeof catatanOrtu === "string" && catatanOrtu.trim().length > 0
      ? catatanOrtu.trim()
      : null;

  let query = supabaseServer
    .from("student_worksheets")
    .update({
      catatan_ortu: valueToStore,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", studentId);

  if (bulanKe !== null && !isNaN(bulanKe)) {
    query = query.eq("bulan_ke", bulanKe);
  } else {
    query = query.is("bulan_ke", null);
  }

  const { error } = await query;
  if (error) {
    console.error("Error updating parent feedback:", error);
    if (
      error.message.includes("schema cache") ||
      error.message.includes("Could not find the 'catatan_ortu'")
    ) {
      throw new Error(
        "Kolom 'catatan_ortu' belum ditambahkan di Supabase! Silakan jalankan SQL migrasi di file 'supabase/student_worksheets.sql' pada Supabase SQL Editor.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/worksheets");
  revalidatePath("/portal-ortu/dashboard");
  return true;
}

export async function updateSingleWorksheetParentFeedback(
  worksheetId: string,
  catatanOrtu: string | null,
) {
  const supabaseServer = await createClient();
  const valueToStore =
    typeof catatanOrtu === "string" && catatanOrtu.trim().length > 0
      ? catatanOrtu.trim()
      : null;

  const { error } = await supabaseServer
    .from("student_worksheets")
    .update({
      catatan_ortu: valueToStore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", worksheetId);

  if (error) {
    console.error("Error updating single worksheet parent feedback:", error);
    if (
      error.message.includes("schema cache") ||
      error.message.includes("Could not find the 'catatan_ortu'")
    ) {
      throw new Error(
        "Kolom 'catatan_ortu' belum ditambahkan di Supabase! Silakan jalankan SQL migrasi di file 'supabase/student_worksheets.sql' pada Supabase SQL Editor.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/worksheets");
  revalidatePath("/portal-ortu/dashboard");
  return true;
}

// =========================================
// TEACHERS (GURU / MISS) ACTIONS
// =========================================

export async function getTeachers() {
  try {
    const supabaseServer = await createClient();
    const branchId = await getBranchId();
    if (!branchId) return [];

    let query = supabaseServer
      .from("teachers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (branchId !== "ALL") {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Notice fetching teachers:", error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn("Exception fetching teachers:", err?.message || err);
    return [];
  }
}

export async function createTeacher(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Nama Guru wajib diisi.");
  }

  const branchId = await getBranchId();
  const supabaseServer = await createClient();

  const { error } = await supabaseServer.from("teachers").insert({
    branch_id: branchId === "ALL" ? null : branchId,
    name: name.trim(),
    is_active: true,
  });

  if (error) {
    console.error("Error creating teacher:", error);
    throw new Error("Gagal menambah guru: " + error.message);
  }

  revalidatePath("/teachers");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

export async function updateTeacher(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Nama Guru wajib diisi.");
  }

  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("teachers")
    .update({ name: name.trim() })
    .eq("id", id);

  if (error) {
    console.error("Error updating teacher:", error);
    throw new Error("Gagal memperbarui guru: " + error.message);
  }

  revalidatePath("/teachers");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

export async function deleteTeacher(id: string) {
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("teachers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting teacher:", error);
    throw new Error("Gagal menghapus guru: " + error.message);
  }

  revalidatePath("/teachers");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

// =========================================
// ASSESSMENT TEMPLATES ACTIONS
// =========================================

export async function getAssessmentTemplates() {
  try {
    const supabaseServer = await createClient();
    const branchId = await getBranchId();
    if (!branchId) return [];

    let query = supabaseServer
      .from("assessment_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (branchId !== "ALL") {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Notice fetching assessment templates:", error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn("Exception fetching assessment templates:", err?.message || err);
    return [];
  }
}

export async function createAssessmentTemplate(formData: FormData) {
  const category = (formData.get("category") as string) || "kegiatan";
  const title = formData.get("title") as string;
  const materi = (formData.get("materi") as string) || "";
  const kegiatan = (formData.get("kegiatan") as string) || "";
  const hasil_belajar = (formData.get("hasil_belajar") as string) || "";

  if (!title || !title.trim()) {
    throw new Error("Judul / Isi Template wajib diisi.");
  }

  const branchId = await getBranchId();
  const supabaseServer = await createClient();

  const { error } = await supabaseServer.from("assessment_templates").insert({
    branch_id: branchId === "ALL" ? null : branchId,
    category: category,
    title: title.trim(),
    materi: materi.trim(),
    kegiatan: kegiatan.trim(),
    hasil_belajar: hasil_belajar.trim(),
    is_active: true,
  });

  if (error) {
    console.error("Error creating assessment template:", error);
    throw new Error("Gagal membuat template: " + error.message);
  }

  revalidatePath("/templates");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

export async function updateAssessmentTemplate(id: string, formData: FormData) {
  const category = (formData.get("category") as string) || "kegiatan";
  const title = formData.get("title") as string;
  const materi = (formData.get("materi") as string) || "";
  const kegiatan = (formData.get("kegiatan") as string) || "";
  const hasil_belajar = (formData.get("hasil_belajar") as string) || "";

  if (!title || !title.trim()) {
    throw new Error("Judul / Isi Template wajib diisi.");
  }

  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("assessment_templates")
    .update({
      category: category,
      title: title.trim(),
      materi: materi.trim(),
      kegiatan: kegiatan.trim(),
      hasil_belajar: hasil_belajar.trim(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating assessment template:", error);
    throw new Error("Gagal memperbarui template: " + error.message);
  }

  revalidatePath("/templates");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

export async function deleteAssessmentTemplate(id: string) {
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("assessment_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting assessment template:", error);
    throw new Error("Gagal menghapus template: " + error.message);
  }

  revalidatePath("/templates");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

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
  const supabaseServer = await createClient();

  if (!studentId || pointsDeducted <= 0) {
    throw new Error("Jumlah poin yang ditukar harus lebih dari 0.");
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
    if (error.message.includes('relation "public.student_point_redemptions" does not exist')) {
      throw new Error(
        "Tabel 'student_point_redemptions' belum dibuat di Supabase. Silakan jalankan file SQL 'supabase/student_point_redemptions.sql' pada Supabase SQL Editor."
      );
    }
    throw new Error("Gagal memotong poin: " + error.message);
  }

  revalidatePath("/points");
  revalidatePath("/students");
  revalidatePath("/portal-ortu/dashboard");
  return redemption;
}

export async function getPointRedemptions(studentId?: string) {
  const supabaseServer = await createClient();
  const activeBranchId = await getBranchId();

  try {
    let query = supabaseServer
      .from("student_point_redemptions")
      .select(`
        *,
        student:students(name, nickname)
      `)
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



