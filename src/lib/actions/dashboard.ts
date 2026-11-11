"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getTodayISO, parseIndonesianDateToISO } from "../dateUtils";
import { normalizeScheduleTime, isMissingColumnError, requireUser } from "./_internal";
import { getBranchId } from "./auth-branch";

export async function getDashboardStats() {
  await requireUser();
  try {
    const supabaseServer = await createClient();
    const branchId = await getBranchId();

    // Jika belum pilih cabang, return 0
    if (!branchId)
      return { reguler: 0, cg: 0, cgUpcoming: 0, cgPassed: 0, classes: 0 };

    // 1+2+3. Tiga hitungan independen jalan paralel (hasil sama, hanya tidak antre).
    // Query bookings di bawah tetap menunggu daftar CG karena butuh studentIds.
    let regulerQuery = supabaseServer
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "REGISTERED");
    if (branchId !== "ALL")
      regulerQuery = regulerQuery.eq("branch_id", branchId);

    // 2. Hitung Siswa Coba Gratis (CG)
    let cgQuery = supabaseServer
      .from("students")
      .select("id")
      .eq("status", "CG");
    if (branchId !== "ALL") cgQuery = cgQuery.eq("branch_id", branchId);

    // 3. Hitung Kelas (independen dari 1+2, ikut diparalelkan)
    let classQuery = supabaseServer
      .from("classes")
      .select("*", { count: "exact", head: true });
    if (branchId !== "ALL") classQuery = classQuery.eq("branch_id", branchId);

    const [{ count: regulerCount }, { data: cgStudents }, { count: classCount }] =
      await Promise.all([regulerQuery, cgQuery, classQuery]);

    const cgCount = cgStudents?.length || 0;
    let cgUpcoming = 0;
    let cgPassed = 0;

    if (cgStudents && cgStudents.length > 0) {
      const todayISO = getTodayISO();
      const today = new Date(todayISO);
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

        // If no schedules in current month, mark as passed
        if (dates.length === 0) {
          cgPassed++;
          continue;
        }

        // Check if any schedule is on or after today (compare full date)
        const hasFutureOrTodaySchedule = dates.some((d) => {
          const schedDate = new Date(d);
          // Compare full date including year, month, AND day
          return schedDate.getTime() >= today.getTime();
        });

        if (hasFutureOrTodaySchedule) {
          cgUpcoming++;
        } else {
          cgPassed++;
        }
      }
    }

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

/**
 * Get overdue worksheets for students
 * Shows students who have schedules but haven't filled their worksheets
 */
export async function getOverdueWorksheets(branchId = "ALL") {
  await requireUser();
  try {
    const supabaseServer = await createClient();
    const todayISO = getTodayISO();

    // Batasi pengecekan overdue maksimal 60 hari ke belakang agar query tidak membengkak seiring waktu
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const startDate = sixtyDaysAgo > "2026-09-23" ? sixtyDaysAgo : "2026-09-23";

    // 1. Get all active students for this branch - ONLY REGISTERED (NOT CG or INACTIVE)
    // registered_at menandai kapan siswa menjadi REGISTERED agar periode CG tidak masuk overdue.
    // Fallback: jika kolom belum ada (migrasi belum dijalankan), pakai query lama tanpa filter tanggal.
    let students: any[] | null = null;
    let studentError: any = null;
    let hasRegisteredAtColumn = true;
    {
      let q = supabaseServer
        .from("students")
        .select(
          `
        id, name, nickname, gender, status, label_id, registered_at, registration_date, created_at,
        label:labels(id, main_level, sub_level, hex_color)
      `,
        )
        .eq("status", "REGISTERED"); // Only registered students, not CG or INACTIVE

      if (branchId !== "ALL") {
        q = q.eq("branch_id", branchId);
      }

      const res = await q;
      students = res.data;
      studentError = res.error;
      if (
        studentError &&
        ((studentError.message &&
          studentError.message.toLowerCase().includes("registered_at")) ||
          (studentError.details &&
            studentError.details.toLowerCase().includes("registered_at")) ||
          studentError.code === "PGRST204" ||
          studentError.code === "42703")
      ) {
        hasRegisteredAtColumn = false;
        let fallbackQ = supabaseServer
          .from("students")
          .select(
            `
        id, name, nickname, gender, status, label_id, registration_date, created_at,
        label:labels(id, main_level, sub_level, hex_color)
      `,
          )
          .eq("status", "REGISTERED");
        if (branchId !== "ALL") {
          fallbackQ = fallbackQ.eq("branch_id", branchId);
        }
        const fallbackRes = await fallbackQ;
        students = fallbackRes.data;
        studentError = fallbackRes.error;
      }
    }

    if (studentError) {
      console.error("❌ Error fetching students:", studentError);
      return [];
    }

    const studentList = students || [];
    if (studentList.length === 0) return [];

    // Tanggal efektif per siswa: booking sebelum tanggal ini adalah era CG → abaikan.
    // Untuk siswa yang dikonversi dari CG: sesi pada / sebelum registered_at adalah era CG (abaikan sDate <= regAt).
    // Untuk siswa yang langsung REGULER: abaikan hanya sebelum tanggal mulai (sDate < effectiveStart).
    const effectiveStartByStudent = new Map<string, string>();
    const wasCgByStudent = new Map<string, boolean>();
    if (hasRegisteredAtColumn) {
      for (const s of studentList) {
        const regAt =
          typeof s.registered_at === "string"
            ? s.registered_at.split("T")[0]
            : null;
        const createdDate =
          typeof s.created_at === "string"
            ? s.created_at.split("T")[0]
            : "";
        const regDate =
          typeof s.registration_date === "string"
            ? s.registration_date.split("T")[0]
            : "";

        const wasCg =
          !!regAt && (createdDate < regAt || (regDate !== "" && regDate < regAt));

        wasCgByStudent.set(s.id, wasCg);
        effectiveStartByStudent.set(
          s.id,
          regAt && regAt > startDate ? regAt : startDate,
        );
      }
    } else {
      for (const s of studentList) {
        effectiveStartByStudent.set(s.id, startDate);
        wasCgByStudent.set(s.id, false);
      }
    }

    // 2. Fetch ALL bookings for these students from September 1, 2026 until today
    // CRITICAL: Only fetch schedules for currently active students (filter by student_id)
    const studentIds = studentList.map((s) => s.id);

    const PAGE = 1000;
    const allBookings: any[] = [];
    for (let page = 0; ; page++) {
      const from = page * PAGE;
      const { data: pageBookings, error: bookingsError } = await supabaseServer
        .from("schedule_student")
        .select(
          `
          student_id,
          slot:schedule_slots!inner(id, date, time, class_id)
        `,
        )
        .in("student_id", studentIds)
        .gte("slot.date", startDate)
        .lte("slot.date", todayISO)
        .range(from, from + PAGE - 1);

      if (bookingsError) {
        console.error("❌ Error fetching bookings:", bookingsError);
        return [];
      }
      if (pageBookings && pageBookings.length > 0) {
        allBookings.push(...pageBookings);
      }
      if (!pageBookings || pageBookings.length < PAGE) break;
    }

    // Group bookings by student_id
    const bookingsByStudent = new Map<string, any[]>();
    allBookings?.forEach((booking: any) => {
      if (!bookingsByStudent.has(booking.student_id)) {
        bookingsByStudent.set(booking.student_id, []);
      }
      bookingsByStudent.get(booking.student_id)!.push(booking);
    });

    // Get class details for mapping (didedup agar .in() kecil, hasil sama)
    const classIds = Array.from(
      new Set(
        (allBookings || [])
          ?.map((b: any) => b.slot?.class_id)
          .filter(Boolean),
      ),
    );
    const classNamesMap = new Map<string, string>();

    if (classIds.length > 0) {
      const { data: classes } = await supabaseServer
        .from("classes")
        .select("id, name")
        .in("id", classIds);

      if (classes) {
        classes.forEach((cls: any) => {
          classNamesMap.set(cls.id, cls.name);
        });
      }
    }

    // 3. Fetch worksheets from startDate until today (filter date agar tidak terpotong limit 1000 Supabase)
    // Coba sertakan kolom jadwal baru; fallback ke kolom lama jika migrasi belum jalan.
    const allWorksheets: any[] = [];
    let overdueWsSelect = `
          student_id,
          worksheet_date,
          schedule_slot_id,
          schedule_time,
          materi,
          title
        `;
    for (let page = 0; ; page++) {
      const from = page * PAGE;
      const { data: pageWorksheets, error: wsError } = await supabaseServer
        .from("student_worksheets")
        .select(overdueWsSelect)
        .in("student_id", studentIds)
        .gte("worksheet_date", startDate)
        .lte("worksheet_date", todayISO)
        .range(from, from + PAGE - 1);

      if (wsError) {
        if (isMissingColumnError(wsError) && overdueWsSelect.includes("schedule_")) {
          overdueWsSelect = `
          student_id,
          worksheet_date,
          materi,
          title
        `;
          continue;
        }
        console.warn("Notice fetching overdue worksheets:", wsError.message);
        break;
      }
      if (pageWorksheets && pageWorksheets.length > 0) {
        allWorksheets.push(...pageWorksheets);
      }
      if (!pageWorksheets || pageWorksheets.length < PAGE) break;
    }

    // Helper function: Check if worksheet has "Tidak Hadir" status
    const hasAbsentStatus = (ws: any): boolean => {
      const m = (ws.materi || "").toLowerCase();
      const t = (ws.title || "").toLowerCase();

      return (
        m.includes("tidak hadir") ||
        m.includes("libur") ||
        t.includes("tidak hadir") ||
        t.includes("libur") ||
        t.includes("ijin") ||
        t.includes("sakit")
      );
    };

    // Group worksheets by student_id AND date (+jam jika ada) dengan info status.
    // Baris lama tanpa jam (schedule_time NULL) tetap menutupi semua jam pada
    // tanggal itu agar perilaku overdue lama tidak berubah untuk data lama.
    const worksheetsByStudentAndDate = new Map<
      string,
      Array<{ date: string; time: string; isAbsent: boolean }>
    >();
    allWorksheets?.forEach((ws: any) => {
      const dateStr =
        typeof ws.worksheet_date === "string"
          ? ws.worksheet_date.split("T")[0]
          : new Date(ws.worksheet_date).toISOString().split("T")[0];

      if (!worksheetsByStudentAndDate.has(ws.student_id)) {
        worksheetsByStudentAndDate.set(ws.student_id, []);
      }

      const isAbsent = hasAbsentStatus(ws);
      worksheetsByStudentAndDate
        .get(ws.student_id)!
        .push({
          date: dateStr,
          time: normalizeScheduleTime(ws.schedule_time) || "",
          isAbsent,
        });
    });

    // 4. Find overdue students (marked as OVERDUE if schedule + 1 hour passed AND no worksheet)
    const overdueList: Array<
      any & {
        missedDate: string;
        missedTime: string;
        className: string | null;
        missedSlotId: string | null;
      }
    > = [];
    const seenOverdueEntries = new Set<string>();

    for (const student of studentList) {
      const studentBookings = bookingsByStudent.get(student.id) || [];
      const studentWorksheetsWithStatus =
        worksheetsByStudentAndDate.get(student.id) || [];

      if (studentBookings.length === 0) continue;

      // Check each booking
      for (const booking of studentBookings) {
        const slot = Array.isArray(booking.slot)
          ? booking.slot[0]
          : booking.slot;
        const schedDate = String(
          typeof slot.date === "string" ? slot.date.split("T")[0] : slot.date,
        );
        const schedTime = String(slot.time || "");

        // CRITICAL FIX: Skip schedules on today because we can't check +1 hour properly from server
        if (schedDate === todayISO) {
          continue;
        }

        // Periode CG tidak masuk overdue:
        // 1. Siswa yang konversi dari CG: abaikan sesi pada / sebelum tanggal promosi (sDate <= effectiveStart)
        // 2. Siswa yang langsung REGULER: abaikan hanya sebelum tanggal mulai (sDate < effectiveStart)
        const wasCg = wasCgByStudent.get(student.id) || false;
        const effectiveStart =
          effectiveStartByStudent.get(student.id) || startDate;
        if (wasCg) {
          if (schedDate <= effectiveStart) {
            continue;
          }
        } else {
          if (schedDate < effectiveStart) {
            continue;
          }
        }

        // For past dates (before today), all counts as overdue since the day has passed
        // This is safe because we're querying only up to yesterday

        // Check jika ada worksheet pada tanggal & jam yang SAMA.
        // Baris lama tanpa jam menutupi semua jam tanggal itu (perilaku lama).
        const schedTimeNorm = normalizeScheduleTime(schedTime) || "";
        const hasWorksheetOnSameSchedule = studentWorksheetsWithStatus.some(
          (ws) =>
            ws.date === schedDate &&
            (!ws.time || !schedTimeNorm || ws.time === schedTimeNorm),
        );

        // If worksheet exists (regardless of status), DON'T mark as overdue
        if (hasWorksheetOnSameSchedule) {
          continue; // SKIP: Already have worksheet, even if it's "Tidak Hadir/Ijin/Sakit/Libur"
        }

        // Create unique key to avoid duplicates (per slot/jam agar 2 jadwal
        // sehari tidak saling menutupi; data lama tanpa jam tetap 1 entri per tanggal)
        // missedSlotId ikut di kunci agar 2 slot beda di jam yang sama tetap
        // muncul sebagai 2 entri terpisah (mengikuti jadwal siswa).
        const slotObjForKey = Array.isArray(booking.slot)
          ? booking.slot[0]
          : booking.slot;
        const schedSlotIdForKey =
          slotObjForKey?.id != null ? String(slotObjForKey.id) : "";
        const entryKey = `${student.id}_${schedDate}_${schedTimeNorm}_${schedSlotIdForKey}`;

        // Skip if already added
        if (seenOverdueEntries.has(entryKey)) {
          continue;
        }

        seenOverdueEntries.add(entryKey);

        // Get class name from map
        const className = classNamesMap.get(slot.class_id) || null;

        overdueList.push({
          ...student,
          missedDate: schedDate,
          missedTime: schedTime,
          className,
          // Konteks slot jadwal (nullable agar data lama & flow lama tetap jalan).
          // Dibawa sampai form agar simpan mengikuti jadwal (jam 9 vs jam 4 sore
          // = slot berbeda) dan cegah double per slot.
          missedSlotId: schedSlotIdForKey ? schedSlotIdForKey : null,
        });
      }
    }

    // Sort by missed date (most recent first)
    overdueList.sort(
      (a, b) =>
        new Date(b.missedDate).getTime() - new Date(a.missedDate).getTime(),
    );

    return overdueList;
  } catch (error) {
    console.error("Error fetching overdue worksheets:", error);
    return [];
  }
}

// catatan_ortu disimpan sebagai JSON array [{ date, text, created_at? }] (atau teks biasa
// untuk data lama). Ambil catatan paling akhir beserta waktu asli saat orang tua mengirimnya
// agar edit laporan oleh guru tidak mengubah waktu feedback di notifikasi.
function toWibDateISO(isoStr?: string | null): string | null {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wib.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractLatestParentNoteInfo(
  raw: unknown,
  rowUpdatedAt?: string | null,
  worksheetDate?: string | null,
): { message: string; feedbackAt: string } {
  const fallbackTime = (rowUpdatedAt || worksheetDate || new Date().toISOString()) as string;
  if (typeof raw !== "string") return { message: "", feedbackAt: fallbackTime };
  const trimmed = raw.trim();
  if (!trimmed) return { message: "", feedbackAt: fallbackTime };

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const validItems = parsed.filter(
          (item) => typeof item?.text === "string" && item.text.trim() !== "",
        );
        if (validItems.length === 0) {
          return { message: "", feedbackAt: fallbackTime };
        }
        const lastItem = validItems[validItems.length - 1];
        const message = lastItem.text.trim();

        // 1. Jika ada created_at eksplisit dari saat ortu klik simpan, gunakan langsung
        if (typeof lastItem.created_at === "string" && lastItem.created_at.trim()) {
          return { message, feedbackAt: lastItem.created_at.trim() };
        }

        // 2. Untuk data lama yang hanya menyimpan label tanggal (misal "Sel, 3 Nov 2026"):
        // Jika updated_at jatuh di tanggal yang sama dengan tanggal feedback, gunakan updated_at
        // agar jam/menit hari itu tetap akurat. Jika berbeda hari (karena laporan diedit guru
        // di hari lain), gunakan tanggal asli feedback dari catatan_ortu.
        if (typeof lastItem.date === "string" && lastItem.date.trim()) {
          const noteDateISO = parseIndonesianDateToISO(lastItem.date.trim());
          const updatedDateISO = toWibDateISO(rowUpdatedAt);
          if (updatedDateISO && updatedDateISO === noteDateISO && rowUpdatedAt) {
            return { message, feedbackAt: rowUpdatedAt };
          }
          return { message, feedbackAt: `${noteDateISO}T12:00:00+07:00` };
        }

        return { message, feedbackAt: fallbackTime };
      }
    } catch {
      // bukan JSON valid, pakai teks apa adanya
    }
  }
  return { message: trimmed, feedbackAt: fallbackTime };
}

export async function getRecentActivities(options?: {
  birthdayOffset?: number;
  progressOffset?: number;
  limit?: number;
}) {
  await requireUser();
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return {
      items: [],
      hasMore: false,
      nextBirthdayOffset: 0,
      nextProgressOffset: 0,
    };
  }

  const { data: profile } = await supabaseServer
    .from("users")
    .select("role, branch_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      items: [],
      hasMore: false,
      nextBirthdayOffset: 0,
      nextProgressOffset: 0,
    };
  }

  const birthdayOffset = Math.max(0, options?.birthdayOffset ?? 0);
  const progressOffset = Math.max(0, options?.progressOffset ?? 0);
  const pageSize = Math.max(1, Math.min(options?.limit ?? 10, 50));

  const isBranchAdmin = profile.role !== "SUPERADMIN" && !!profile.branch_id;
  const adminClient = getAdminClient();
  const studentSelect = "student:students!inner(id, name, branch_id, branch:branches(name))";

  // Ambil pageSize + 1 baris dari masing-masing tabel sesuai offset saat ini
  // agar sekali buka ringan dan tidak menarik semua data sekaligus
  let birthdayQuery = adminClient
    .from("student_feedback")
    .select(`id, student_id, message, submitted_at, ${studentSelect}`)
    .order("submitted_at", { ascending: false })
    .range(birthdayOffset, birthdayOffset + pageSize);
  if (isBranchAdmin) {
    birthdayQuery = birthdayQuery.eq("student.branch_id", profile.branch_id);
  }

  // Feedback laporan perkembangan dari orang tua (student_worksheets.catatan_ortu)
  // Ambil window secukupnya lalu urutkan berdasarkan waktu asli feedback ortu
  // (bukan waktu edit guru) sebelum dipotong sesuai progressOffset.
  const progressWindowLimit = Math.min(Math.max(40, progressOffset + pageSize + 20), 200);
  let progressQuery = adminClient
    .from("student_worksheets")
    .select(
      `id, student_id, catatan_ortu, bulan_ke, worksheet_date, updated_at, ${studentSelect}`,
    )
    .not("catatan_ortu", "is", null)
    .neq("catatan_ortu", "")
    .order("updated_at", { ascending: false })
    .limit(progressWindowLimit);
  if (isBranchAdmin) {
    progressQuery = progressQuery.eq("student.branch_id", profile.branch_id);
  }

  const [birthdayRes, progressRes] = await Promise.all([
    birthdayQuery,
    progressQuery,
  ]);

  if (birthdayRes.error) {
    console.error("Error fetching birthday feedback:", birthdayRes.error);
  }
  if (progressRes.error) {
    console.error("Error fetching progress feedback:", progressRes.error);
  }

  const pickOne = <T,>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

  const birthdayRaw = birthdayRes.data || [];
  const progressRaw = progressRes.data || [];

  const birthdayItems = birthdayRaw.map((row: any, idx: number) => {
    const student = pickOne<any>(row.student);
    return {
      id: `birthday-${row.id}`,
      type: "BIRTHDAY_FEEDBACK" as const,
      created_at: row.submitted_at as string,
      message: row.message as string,
      student_id: ((row.student_id || student?.id) as string) || "",
      student_name: (student?.name as string) || "?",
      branch_name: (pickOne<any>(student?.branch)?.name as string) || null,
      bulan_ke: null as number | null,
      worksheet_id: null as string | null,
      _nextOffset: birthdayOffset + idx + 1,
    };
  });

  const allSortedProgressItems = progressRaw
    .map((row: any) => {
      const student = pickOne<any>(row.student);
      const { message, feedbackAt } = extractLatestParentNoteInfo(
        row.catatan_ortu,
        row.updated_at,
        row.worksheet_date,
      );
      return {
        id: `progress-${row.id}`,
        type: "PROGRESS_FEEDBACK" as const,
        created_at: feedbackAt,
        message,
        student_id: ((row.student_id || student?.id) as string) || "",
        student_name: (student?.name as string) || "?",
        branch_name: (pickOne<any>(student?.branch)?.name as string) || null,
        bulan_ke: (row.bulan_ke as number | null) ?? null,
        worksheet_id: (row.id as string) || null,
      };
    })
    .filter((item) => item.message !== "")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const progressSlice = allSortedProgressItems.slice(
    progressOffset,
    progressOffset + pageSize + 1,
  );
  const progressItems = progressSlice.map((item, idx) => ({
    ...item,
    _nextOffset: progressOffset + idx + 1,
  }));

  const merged = [...birthdayItems, ...progressItems].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const sliced = merged.slice(0, pageSize);

  let nextBirthdayOffset = birthdayOffset;
  let nextProgressOffset = progressOffset;
  for (const item of sliced) {
    if (item.type === "BIRTHDAY_FEEDBACK") {
      nextBirthdayOffset = Math.max(nextBirthdayOffset, item._nextOffset);
    } else {
      nextProgressOffset = Math.max(nextProgressOffset, item._nextOffset);
    }
  }

  const hasMore =
    merged.length > pageSize ||
    birthdayRaw.length > pageSize ||
    allSortedProgressItems.length > progressOffset + pageSize;

  return {
    items: sliced.map(({ _nextOffset, ...rest }) => rest),
    hasMore,
    nextBirthdayOffset,
    nextProgressOffset,
  };
}

