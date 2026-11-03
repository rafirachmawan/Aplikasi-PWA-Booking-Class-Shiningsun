"use server";

import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "../dateUtils";
import { getBranchId } from "./auth-branch";

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
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const firstDayOfMonth = `${currentYear}-${currentMonth}-01`;

    // Query active bookings for these students in the current month onwards (sebulan penuh)
    const PAGE = 1000;
    let bookings: any[] = [];
    for (let page = 0; ; page++) {
      const from = page * PAGE;
      const { data: pageBookings } = await supabaseServer
        .from("schedule_student")
        .select(
          `
          student_id,
          slot:schedule_slots!inner(
            date, time
          )
        `,
        )
        .in("student_id", studentIds)
        .gte("slot.date", firstDayOfMonth)
        .range(from, from + PAGE - 1);

      if (pageBookings && pageBookings.length > 0) {
        bookings.push(...pageBookings);
      }
      if (!pageBookings || pageBookings.length < PAGE) break;
    }

    // Fallback: jika belum ada slot di bulan berjalan/mendatang (misal awal bulan baru belum di-generate), ambil slot bulan sebelumnya
    const foundStudentIds = new Set((bookings || []).map((b) => b.student_id));
    const missingStudentIds = studentIds.filter(
      (id) => !foundStudentIds.has(id),
    );

    if (missingStudentIds.length > 0) {
      const prevMonth = new Date(currentYear, now.getMonth() - 1, 1);
      const firstDayOfPrevMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
      for (let page = 0; ; page++) {
        const from = page * PAGE;
        const { data: monthBookings } = await supabaseServer
          .from("schedule_student")
          .select(
            `
            student_id,
            slot:schedule_slots!inner(
              date, time
            )
          `,
          )
          .in("student_id", missingStudentIds)
          .gte("slot.date", firstDayOfPrevMonth)
          .range(from, from + PAGE - 1);

        if (monthBookings && monthBookings.length > 0) {
          bookings.push(...monthBookings);
        }
        if (!monthBookings || monthBookings.length < PAGE) break;
      }
    }

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

        // Build day+time format for richer display (e.g. "Senin 10:00, Rabu 14:00")
        const dayTimeEntries = sortedDays.map((day) => {
          const t = map.get(day);
          return t ? `${day} ${t}` : day;
        });
        scheduleMap[`${sId}__detail`] = dayTimeEntries.join(", ");
      }
    }

    return scheduleMap;
  } catch (err) {
    console.warn("Notice fetching schedule map:", err);
    return {};
  }
}

export async function autoBookStudentToClass(
  studentId: string,
  classId: string,
  startDateStr: string,
  time: string,
) {
  const supabaseServer = await createClient();
  let branchId = await getBranchId();

  // Pick branchId safely: if branchId is "ALL" or empty, fetch student's or class's branch_id
  if (!branchId || branchId === "ALL") {
    const { data: st } = await supabaseServer
      .from("students")
      .select("branch_id")
      .eq("id", studentId)
      .maybeSingle();
    if (st?.branch_id) {
      branchId = st.branch_id;
    } else {
      const { data: cl } = await supabaseServer
        .from("classes")
        .select("branch_id")
        .eq("id", classId)
        .maybeSingle();
      if (cl?.branch_id) branchId = cl.branch_id;
    }
  }
  const finalBranchId = branchId === "ALL" ? null : branchId;

  // 1. Hitung range sampai akhir bulan dari startDate (parse lokal tanpa offset UTC)
  const parts = startDateStr.split("-").map(Number);
  const startDate = new Date(parts[0], parts[1] - 1, parts[2] || 1);
  const endDate = new Date(parts[0], parts[1], 0); // Hari terakhir bulan tersebut

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
  // Normalisasi HH:MM:SS dari DB -> HH:MM agar tidak terbentuk "08:00:00:00" yang invalid untuk tipe time Postgres
  const normalizedTime = time.substring(0, 5);
  const timeVariants = Array.from(
    new Set([normalizedTime, `${normalizedTime}:00`]),
  );

  // 2. Batch-fetch seluruh slot yang sudah ada untuk daftar tanggal tersebut dalam 1 query
  // (menggantikan loop N+1 query per tanggal tanpa mengubah logika validasi kuota/lock/duplikat)
  const { data: existingSlots, error: fetchError } = await supabaseServer
    .from("schedule_slots")
    .select(
      "id, date, class_id, is_locked, max_quota:classes!inner(max_quota), bookings:schedule_student(student_id, student:students(status))",
    )
    .in("date", datesToBook)
    .eq("class_id", classId)
    .in("time", timeVariants);

  if (fetchError)
    throw new Error("Gagal mengambil jadwal: " + fetchError.message);

  const slotsByDate = new Map<string, any>();
  for (const s of existingSlots || []) {
    if (!slotsByDate.has(s.date)) {
      slotsByDate.set(s.date, s);
    }
  }

  // Buat slot baru secara batch untuk tanggal yang belum punya slot
  const missingDates = datesToBook.filter((d) => !slotsByDate.has(d));
  const createdSlotIdByDate = new Map<string, string>();

  if (missingDates.length > 0) {
    const { data: insertedSlots, error: batchInsertErr } = await supabaseServer
      .from("schedule_slots")
      .insert(
        missingDates.map((d) => ({
          branch_id: finalBranchId,
          class_id: classId,
          date: d,
          time: normalizedTime,
          is_locked: false,
        })),
      )
      .select("id, date");

    if (!batchInsertErr && insertedSlots) {
      for (const ns of insertedSlots) {
        createdSlotIdByDate.set(ns.date, ns.id);
      }
    } else {
      // Fallback per-tanggal jika batch insert gagal (misal balapan klik bersamaan)
      for (const d of missingDates) {
        const { data: newSlot, error: insertError } = await supabaseServer
          .from("schedule_slots")
          .insert({
            branch_id: finalBranchId,
            class_id: classId,
            date: d,
            time: normalizedTime,
            is_locked: false,
          })
          .select("id, date")
          .single();

        if (insertError)
          throw new Error(
            "Gagal membuat sesi jadwal baru: " + insertError.message,
          );
        createdSlotIdByDate.set(d, newSlot.id);
      }
    }
  }

  const toBookItems: Array<{ dateStr: string; slotId: string }> = [];

  for (const dateStr of datesToBook) {
    const existingSlot = slotsByDate.get(dateStr);
    let slotId = existingSlot
      ? existingSlot.id
      : createdSlotIdByDate.get(dateStr) || null;
    let isFull = false;
    let isLocked = false;
    let alreadyBooked = false;

    if (existingSlot) {
      // Cek kuota (abaikan siswa nonaktif agar sesuai tampilan UI)
      const slot = existingSlot;
      let maxQ = 4;
      if (slot.max_quota) {
        if (Array.isArray(slot.max_quota) && slot.max_quota.length > 0) {
          maxQ = (slot.max_quota[0] as any).max_quota || 4;
        } else if (typeof slot.max_quota === "object") {
          maxQ = (slot.max_quota as any).max_quota || 4;
        }
      }

      const activeBookings = (slot.bookings || []).filter(
        (b: any) => b?.student?.status !== "INACTIVE",
      );

      if (activeBookings.length >= maxQ) {
        isFull = true;
      }
      // Sesi terkunci tidak menerima booking baru (konsisten dengan booking satuan).
      if ((slot as any).is_locked) {
        isLocked = true;
      }
      if (activeBookings.some((b: any) => b.student_id === studentId)) {
        alreadyBooked = true;
      }
    }

    if (slotId && !isFull && !isLocked && !alreadyBooked) {
      toBookItems.push({ dateStr, slotId });
    } else {
      failedDates.push(dateStr);
    }
  }

  if (toBookItems.length > 0) {
    const { error: batchBookErr } = await supabaseServer
      .from("schedule_student")
      .insert(
        toBookItems.map((item) => ({
          student_id: studentId,
          schedule_slot_id: item.slotId,
        })),
      );

    if (!batchBookErr) {
      bookedCount += toBookItems.length;
    } else {
      // Fallback per-tanggal jika ada constraint pada salah satu tanggal agar tanggal lain tetap tersimpan
      for (const item of toBookItems) {
        const { error: bookErr } = await supabaseServer
          .from("schedule_student")
          .insert({ student_id: studentId, schedule_slot_id: item.slotId });

        if (!bookErr) {
          bookedCount++;
        } else {
          console.error(
            "Auto-booking insert error on date:",
            item.dateStr,
            bookErr.message,
          );
          failedDates.push(item.dateStr);
        }
      }
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
  const supabaseServer = await createClient();
  let branchId = await getBranchId();

  if (!branchId || branchId === "ALL") {
    const { data: st } = await supabaseServer
      .from("students")
      .select("branch_id")
      .eq("id", studentId)
      .maybeSingle();
    if (st?.branch_id) {
      branchId = st.branch_id;
    } else {
      const { data: cl } = await supabaseServer
        .from("classes")
        .select("branch_id")
        .eq("id", classId)
        .maybeSingle();
      if (cl?.branch_id) branchId = cl.branch_id;
    }
  }
  const finalBranchId = branchId === "ALL" ? null : branchId;

  // Normalisasi HH:MM:SS dari DB -> HH:MM agar tidak terbentuk "08:00:00:00" yang invalid untuk tipe time Postgres
  const normalizedManualTime = time.substring(0, 5);
  const timeVariants = Array.from(
    new Set([normalizedManualTime, `${normalizedManualTime}:00`]),
  );

  // Cari slot
  let { data: slots, error: fetchError } = await supabaseServer
    .from("schedule_slots")
    .select(
      "id, class_id, is_locked, max_quota:classes!inner(max_quota), bookings:schedule_student(student_id, student:students(status))",
    )
    .eq("date", dateStr)
    .eq("class_id", classId)
    .in("time", timeVariants);

  if (fetchError)
    throw new Error("Gagal mengambil jadwal: " + fetchError.message);

  let slotId = slots && slots.length > 0 ? slots[0].id : null;

  if (!slotId) {
    // Buat slot baru
    const { data: newSlot, error: insertError } = await supabaseServer
      .from("schedule_slots")
      .insert({
        branch_id: finalBranchId,
        class_id: classId,
        date: dateStr,
        time: normalizedManualTime,
        is_locked: false,
      })
      .select()
      .single();

    if (insertError)
      throw new Error("Gagal membuat sesi jadwal baru: " + insertError.message);
    slotId = newSlot.id;
  } else {
    // Cek kuota (abaikan siswa nonaktif agar sesuai tampilan UI)
    const slot = slots![0];

    // Sesi terkunci tidak menerima booking baru (konsisten dengan booking satuan).
    if ((slot as any).is_locked) {
      throw new Error(
        "Jadwal ini sudah dikunci (Locked). Tidak bisa menambah siswa.",
      );
    }
    let maxQ = 4;
    if (slot.max_quota) {
      if (Array.isArray(slot.max_quota) && slot.max_quota.length > 0) {
        maxQ = (slot.max_quota[0] as any).max_quota || 4;
      } else if (typeof slot.max_quota === "object") {
        maxQ = (slot.max_quota as any).max_quota || 4;
      }
    }

    const activeBookings = (slot.bookings || []).filter(
      (b: any) => b?.student?.status !== "INACTIVE",
    );

    if (activeBookings.length >= maxQ) {
      throw new Error("Sesi pada tanggal dan jam tersebut sudah penuh.");
    }
    if (activeBookings.some((b: any) => b.student_id === studentId)) {
      throw new Error("Siswa sudah terdaftar di sesi tersebut.");
    }
  }

  // Booking
  const { error: bookErr } = await supabaseServer
    .from("schedule_student")
    .insert({ student_id: studentId, schedule_slot_id: slotId });

  if (bookErr) throw new Error("Gagal mem-booking siswa: " + bookErr.message);
  return true;
}

export async function removeStudentBooking(
  scheduleSlotId: string,
  studentId: string,
) {
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
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
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
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
  const branchId = await getBranchId();
  if (!branchId) return { totalBooked: 0, failedDates: [] };

  const supabaseServer = await createClient();
  const monthStr = String(currentMonth).padStart(2, "0");
  const startDate = `${currentYear}-${monthStr}-01`;
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();
  const endDate = `${currentYear}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  // Ambil jadwal bulan ini khusus untuk 1 murid tersebut langsung di SQL
  // (tanpa menarik ribuan jadwal seluruh murid se-cabang via getMonthlySchedules)
  let query = supabaseServer
    .from("schedule_student")
    .select(
      "student_id, student:students!inner(status), slot:schedule_slots!inner(date, time, class_id, branch_id)",
    )
    .eq("student_id", studentId)
    .neq("student.status", "INACTIVE")
    .gte("slot.date", startDate)
    .lte("slot.date", endDate);

  if (branchId !== "ALL") {
    query = query.eq("slot.branch_id", branchId);
  }

  const { data: bookingRows, error } = await query;
  if (error || !bookingRows || bookingRows.length === 0) {
    return { totalBooked: 0, failedDates: [] };
  }

  const studentSchedules = bookingRows
    .map((row: any) => (Array.isArray(row.slot) ? row.slot[0] : row.slot))
    .filter((slot: any) => slot && slot.date && slot.time && slot.class_id)
    .sort((a: any, b: any) => {
      const cmpDate = String(a.date).localeCompare(String(b.date));
      if (cmpDate !== 0) return cmpDate;
      return String(a.time).localeCompare(String(b.time));
    });

  if (studentSchedules.length === 0) return { totalBooked: 0, failedDates: [] };

  const patterns = new Set<string>();
  const uniquePatterns: any[] = [];

  studentSchedules.forEach((slot) => {
    const d = new Date(slot.date);
    const dayOfWeek = d.getDay();
    // Normalisasi jam DB (HH:MM:SS) -> HH:MM agar konsisten & tidak invalid saat diteruskan ke autoBook
    const normalizedSlotTime = String(slot.time).substring(0, 5);
    const key = `${dayOfWeek}-${normalizedSlotTime}-${slot.class_id}`;
    if (!patterns.has(key)) {
      patterns.add(key);
      uniquePatterns.push({
        dayOfWeek,
        time: normalizedSlotTime,
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

// Batch2 (read-only): daftar ID siswa yang SUDAH punya minimal 1 booking di
// bulan depan. Dipakai panel "kesiapan bulan depan" agar siswa yang terlewat
// copy ketahuan sebelum bulannya berjalan. Tanpa penyimpanan tambahan —
// dihitung live tiap render halaman.
export async function getStudentsWithNextMonthSchedule(
  year: number,
  month: number,
): Promise<string[]> {
  try {
    const branchId = await getBranchId();
    if (!branchId) return [];

    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const mm = String(nextMonth).padStart(2, "0");
    const startDate = `${nextYear}-${mm}-01`;
    const lastDay = new Date(nextYear, nextMonth, 0).getDate();
    const endDate = `${nextYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

    const supabaseServer = await createClient();
    // Set (bukan count) agar paginasi tetap benar meski urutan antar-halaman
    // tidak stabil: yang penting hanya "ada / tidak ada".
    const scheduled = new Set<string>();
    const PAGE = 1000;
    for (let page = 0; ; page++) {
      const from = page * PAGE;
      let q = supabaseServer
        .from("schedule_student")
        .select("student_id, slot:schedule_slots!inner(date, branch_id)")
        .gte("slot.date", startDate)
        .lte("slot.date", endDate)
        .range(from, from + PAGE - 1);
      if (branchId !== "ALL") {
        q = q.eq("slot.branch_id", branchId);
      }
      const { data, error } = await q;
      if (error) {
        console.warn(
          "Notice fetching next-month schedules:",
          error.message || error,
        );
        break;
      }
      if (data && data.length > 0) {
        for (const row of data) {
          const sid = (row as any).student_id;
          if (sid) scheduled.add(String(sid));
        }
      }
      if (!data || data.length < PAGE) break;
    }
    return Array.from(scheduled);
  } catch (err) {
    console.warn("Exception fetching next-month schedules:", err);
    return [];
  }
}

export async function moveStudentBooking(
  studentId: string,
  oldSlotId: string,
  newClassId: string,
  newDateStr: string,
  newTime: string,
) {
  const supabaseServer = await createClient();
  // Normalisasi jam seperti bookStudentManual agar lookup slot tujuan cocok.
  const normalizedNewTime = newTime.substring(0, 5);
  const timeVariants = Array.from(
    new Set([normalizedNewTime, `${normalizedNewTime}:00`]),
  );
  const resolveTargetSlotId = async (): Promise<string | null> => {
    const { data: targetSlots } = await supabaseServer
      .from("schedule_slots")
      .select("id")
      .eq("date", newDateStr)
      .eq("class_id", newClassId)
      .in("time", timeVariants);
    return targetSlots && targetSlots.length > 0 ? targetSlots[0].id : null;
  };

  // Pindah ke slot yang sama = tidak ada yang berubah.
  const targetSlotId = await resolveTargetSlotId();
  if (targetSlotId && targetSlotId === oldSlotId) {
    return true;
  }

  // Booking BARU dulu: jika gagal (penuh/sudah terdaftar), booking lama tetap utuh.
  try {
    await bookStudentManual(studentId, newClassId, newDateStr, newTime);
  } catch (err: any) {
    throw new Error(err.message);
  }

  // Booking baru sukses → hapus yang lama. Jika hapus gagal, batalkan booking
  // baru agar tidak terjadi booking ganda (state kembali seperti semula).
  try {
    await removeStudentBooking(oldSlotId, studentId);
  } catch (err: any) {
    const newSlotId = await resolveTargetSlotId();
    if (newSlotId) {
      await supabaseServer
        .from("schedule_student")
        .delete()
        .eq("schedule_slot_id", newSlotId)
        .eq("student_id", studentId);
    }
    throw new Error(err.message);
  }
  return true;
}

export async function getMonthlySchedules(year: number, month: number) {
  const branchId = await getBranchId();
  if (!branchId) return [];

  const supabaseServer = await createClient();

  // Hitung tanggal awal dan akhir bulan sebagai string manual (tanpa
  // Date/toISOString) agar kebal zona waktu server. Pola sama seperti
  // fungsi lain di file ini.
  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`; // Hari terakhir bulan tersebut

  // Paginasi eksplisit: tanpa .range(), Supabase diam-diam memotong di 1000
  // baris sehingga tanggal akhir bulan bisa hilang dari tampilan.
  // Query dibangun ulang tiap halaman (pola sama seperti fungsi lain di file ini).
  const PAGE = 1000;
  const allData: any[] = [];
  for (let page = 0; ; page++) {
    const from = page * PAGE;
    let pageQuery = supabaseServer
      .from("schedule_slots")
      .select(
        `
      *,
      class:classes(name, max_quota),
      bookings:schedule_student(
        student_id,
        student:students(id, name, nickname, status, label_id, label:labels(id, main_level, sub_level, hex_color))
      )
    `,
      )
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      // Tiebreaker unik agar paginasi .range() stabil (tanpa ini baris bisa
      // double di satu halaman dan hilang di halaman lain).
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (branchId !== "ALL") {
      pageQuery = pageQuery.eq("branch_id", branchId);
    }

    const { data: pageData, error: pageError } = await pageQuery;

    if (pageError) {
      console.error("Error fetching schedules:", pageError);
      return [];
    }
    if (pageData && pageData.length > 0) {
      allData.push(...pageData);
    }
    if (!pageData || pageData.length < PAGE) break;
  }

  // Siswa nonaktif tidak dihitung: jadwalnya hilang dari dashboard & kuota jadwal kelas
  return (allData || []).map((slot: any) => ({
    ...slot,
    bookings: (slot.bookings || []).filter(
      (b: any) => b?.student?.status !== "INACTIVE",
    ),
  }));
}

export async function createScheduleSlot(formData: FormData) {
  const class_id = formData.get("class_id") as string;
  const dateStr = formData.get("date") as string; // YYYY-MM-DD
  const time = formData.get("time") as string; // HH:MM
  const isRecurring = formData.get("is_recurring") === "true"; // Repeat 1 month

  const datesToInsert = [dateStr];

  if (isRecurring) {
    // Sisa tanggal berhari sama di bulan yang sama, dihitung murni dari
    // string YYYY-MM-DD (tanpa Date/toISOString) agar kebal zona waktu server.
    const dateParts = dateStr.split("-").map(Number);
    const baseYear = dateParts[0];
    const baseMonth = dateParts[1];
    const baseDay = dateParts[2];
    const daysInMonth = new Date(baseYear, baseMonth, 0).getDate();

    // Mulai dari 1 minggu ke depan
    for (let i = 1; i <= 4; i++) {
      const d = baseDay + i * 7;
      // Jika masih di bulan yang sama, masukkan ke array
      if (!Number.isFinite(d) || d > daysInMonth) {
        break;
      }
      datesToInsert.push(
        `${baseYear}-${String(baseMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
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

  const supabaseServer = await createClient();
  const { error } = await supabaseServer.from("schedule_slots").insert(payload);

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
  const supabaseServer = await createClient();
  // Pessimistic Quota Check
  // 1. Dapatkan slot saat ini beserta kuota maksimal kelas
  const { data: slotData, error: slotError } = await supabaseServer
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
  const { count, error: countError } = await supabaseServer
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
  const { error: insertError } = await supabaseServer
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
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
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

export async function cancelBooking(scheduleSlotId: string, studentId: string) {
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("schedule_student")
    .delete()
    .match({ schedule_slot_id: scheduleSlotId, student_id: studentId });

  if (error) throw new Error(error.message);
  return true;
}

export async function getSchedulesByDate(dateStr: string) {
  const branchId = await getBranchId();

  // Jika belum pilih cabang, return kosong
  if (!branchId) return [];

  const supabaseServer = await createClient();
  let query = supabaseServer
    .from("schedule_slots")
    .select(
      `
      *,
      class:classes(name, max_quota),
      bookings:schedule_student(
        student_id,
        student:students(id, name, nickname, status, label_id, label:labels(id, main_level, sub_level, hex_color))
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

  // Siswa nonaktif tidak dihitung: jadwalnya hilang dari dashboard & kuota jadwal kelas
  return (data || []).map((slot: any) => ({
    ...slot,
    bookings: (slot.bookings || []).filter(
      (b: any) => b?.student?.status !== "INACTIVE",
    ),
  }));
}

export async function getTodaySchedules() {
  const today = getTodayISO();
  return getSchedulesByDate(today);
}
