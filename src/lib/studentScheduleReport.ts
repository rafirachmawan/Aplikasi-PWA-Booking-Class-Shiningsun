"use server";

import { createClient } from "@/lib/supabase/server";
import {
  REPORT_DEFAULT_FROM_DATE,
  type StudentScheduleWorksheetRow,
} from "@/lib/studentReportTypes";
import { getTodayISO } from "@/lib/dateUtils";

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
 * Laporan per jadwal per siswa khusus Superadmin.
 * Satu baris = satu slot jadwal satu siswa, digabung dengan isian
 * student_worksheets lewat student_id + worksheet_date (tanggal yang sama).
 * Jadwal tanpa laporan tetap ditampilkan dengan status "Kosong".
 * File baru — tidak mengubah fungsi/logika yang sudah ada.
 */
export async function getStudentScheduleWorksheetReport(
  fromDate: string = REPORT_DEFAULT_FROM_DATE,
): Promise<{ data: StudentScheduleWorksheetRow[]; error?: string }> {
  const role = await getRequestRole();
  if (role !== "SUPERADMIN") {
    return { data: [], error: "FORBIDDEN" };
  }

  const supabaseServer = await createClient();
  const todayISO = getTodayISO();

  type StudentRaw = {
    id: string;
    name: string;
    nickname?: string | null;
    branch?: { name?: string | null } | null;
    label?: { main_level?: string | null; sub_level?: string | null } | null;
  };

  const { data: students, error: studentsError } = await supabaseServer
    .from("students")
    .select(
      "id, name, nickname, branch:branches(id, name), label:labels(id, main_level, sub_level)",
    )
    .eq("status", "REGISTERED");

  if (studentsError) {
    console.error("scheduleWorksheetReport students error:", studentsError.message);
    return { data: [], error: studentsError.message };
  }

  const studentList = ((students || []) as StudentRaw[]).filter(Boolean);
  if (studentList.length === 0) return { data: [] };

  const studentIds = studentList.map((s) => s.id);
  const studentMap = new Map<string, StudentRaw>();
  studentList.forEach((s) => studentMap.set(s.id, s));

  type BookingRaw = {
    student_id: string;
    schedule_slot_id?: string | null;
    slot?: { date?: string | null; time?: string | null; class_id?: string | null } | null;
  };

  function normTime(v: unknown): string {
    const m = String(v || "").match(/(\d{1,2}):(\d{2})/);
    if (!m) return "";
    return `${String(parseInt(m[1], 10)).padStart(2, "0")}:${m[2]}`;
  }

  // Ambil SEMUA baris jadwal per halaman: Supabase membatasi 1000 baris
  // per query, tanpa paginasi data terpotong diam-diam (kasus Zea: 26 jadwal
  // hanya terbaca 7). Chunk ID menjaga URL tetap pendek, range mengambil
  // semua halaman per chunk.
  const bookingList: BookingRaw[] = [];
  const ID_CHUNK = 100;
  const PAGE = 1000;
  try {
    for (let c = 0; c < studentIds.length; c += ID_CHUNK) {
      const ids = studentIds.slice(c, c + ID_CHUNK);
      for (let page = 0; ; page++) {
        const from = page * PAGE;
        const { data: pageData, error: pageError } = await supabaseServer
          .from("schedule_student")
          .select(
            "student_id, schedule_slot_id, slot:schedule_slots!inner(date, time, class_id)",
          )
          .in("student_id", ids)
          .gte("slot.date", fromDate)
          .lte("slot.date", todayISO)
          .order("student_id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (pageError) throw new Error(pageError.message);
        const rows = ((pageData || []) as unknown as BookingRaw[]).filter(
          (b) => b.slot?.date && studentMap.has(b.student_id),
        );
        bookingList.push(...rows);
        if (!pageData || pageData.length < PAGE) break;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mengambil jadwal";
    console.error("scheduleWorksheetReport bookings error:", msg);
    return { data: [], error: msg };
  }
  if (bookingList.length === 0) return { data: [] };

  const classIds = Array.from(
    new Set(
      bookingList.map((b) => b.slot?.class_id).filter((v): v is string => !!v),
    ),
  );
  const classNamesMap = new Map<string, string>();
  if (classIds.length > 0) {
    const { data: classes } = await supabaseServer
      .from("classes")
      .select("id, name")
      .in("id", classIds);
    (classes || []).forEach((cls: { id: string; name: string }) => {
      classNamesMap.set(cls.id, cls.name);
    });
  }

  type WorksheetRaw = {
    student_id: string;
    worksheet_date: string;
    schedule_slot_id?: string | null;
    schedule_time?: string | null;
    materi?: string | null;
    kegiatan?: string | null;
    hasil_belajar?: string | null;
    catatan_guru?: string | null;
    rekomendasi_rumah?: string | null;
  };

  // Kelompokkan SEMUA isian per siswa+tanggal (tidak ada yang dibuang).
  // Sama seperti jadwal: diambil per halaman agar tidak terpotong 1000 baris.
  // Kunci tambahan per slot & per jam agar 2 jadwal beda jam di hari yang sama
  // tidak saling mengklaim isian yang sama. Toleran jika migrasi kolom jadwal
  // belum dijalankan (fallback ke select lama).
  const worksheetGroups = new Map<string, WorksheetRaw[]>();
  const worksheetBySlot = new Map<string, WorksheetRaw[]>();
  const worksheetByDateTime = new Map<string, WorksheetRaw[]>();
  try {
    let useScheduleCols = true;
    for (let c = 0; c < studentIds.length; c += ID_CHUNK) {
      const ids = studentIds.slice(c, c + ID_CHUNK);
      for (let page = 0; ; page++) {
        const from = page * PAGE;
        let pageData: unknown[] | null = null;
        {
          const res = await supabaseServer
            .from("student_worksheets")
            .select(
              "student_id, worksheet_date, schedule_slot_id, schedule_time, materi, kegiatan, hasil_belajar, catatan_guru, rekomendasi_rumah",
            )
            .in("student_id", ids)
            .gte("worksheet_date", fromDate)
            .lte("worksheet_date", todayISO)
            .order("student_id", { ascending: true })
            .range(from, from + PAGE - 1);
          if (
            res.error &&
            (res.error.code === "PGRST204" ||
              res.error.code === "42703" ||
              String(res.error.message || "").includes("schema cache") ||
              String(res.error.message || "").includes("Could not find the"))
          ) {
            useScheduleCols = false;
            break;
          }
          if (res.error) throw new Error(res.error.message);
          pageData = res.data;
        }
        ((pageData || []) as unknown as WorksheetRaw[]).forEach((w) => {
          if (!w.student_id || !w.worksheet_date) return;
          const dateKey = String(w.worksheet_date).slice(0, 10);
          const key = `${w.student_id}_${dateKey}`;
          const arr = worksheetGroups.get(key);
          if (arr) arr.push(w);
          else worksheetGroups.set(key, [w]);
          if (w.schedule_slot_id) {
            const sk = `${w.student_id}_${w.schedule_slot_id}`;
            const sarr = worksheetBySlot.get(sk);
            if (sarr) sarr.push(w);
            else worksheetBySlot.set(sk, [w]);
          }
          const wt = normTime(w.schedule_time);
          if (wt) {
            const tk = `${w.student_id}_${dateKey}_${wt}`;
            const tarr = worksheetByDateTime.get(tk);
            if (tarr) tarr.push(w);
            else worksheetByDateTime.set(tk, [w]);
          }
        });
        if (!pageData || pageData.length < PAGE) break;
      }
      if (!useScheduleCols) {
        // Migrasi belum jalan: ambil ulang dengan kolom lama saja.
        worksheetGroups.clear();
        worksheetBySlot.clear();
        worksheetByDateTime.clear();
        for (let c2 = 0; c2 < studentIds.length; c2 += ID_CHUNK) {
          const ids2 = studentIds.slice(c2, c2 + ID_CHUNK);
          for (let page = 0; ; page++) {
            const from = page * PAGE;
            const { data: pageData, error: pageError } = await supabaseServer
              .from("student_worksheets")
              .select(
                "student_id, worksheet_date, materi, kegiatan, hasil_belajar, catatan_guru, rekomendasi_rumah",
              )
              .in("student_id", ids2)
              .gte("worksheet_date", fromDate)
              .lte("worksheet_date", todayISO)
              .order("student_id", { ascending: true })
              .range(from, from + PAGE - 1);
            if (pageError) throw new Error(pageError.message);
            ((pageData || []) as unknown as WorksheetRaw[]).forEach((w) => {
              if (!w.student_id || !w.worksheet_date) return;
              const key = `${w.student_id}_${String(w.worksheet_date).slice(0, 10)}`;
              const arr = worksheetGroups.get(key);
              if (arr) arr.push(w);
              else worksheetGroups.set(key, [w]);
            });
            if (!pageData || pageData.length < PAGE) break;
          }
        }
        break;
      }
    }
  } catch (e) {
    console.error(
      "scheduleWorksheetReport worksheets error:",
      e instanceof Error ? e.message : e,
    );
  }
  const consumedKeys = new Set<string>();
  const consumedWorksheets = new Set<WorksheetRaw>();

  function takeWorksheetForBooking(
    studentId: string,
    schedDate: string,
    schedTime: string,
    slotId: string | null,
  ): WorksheetRaw | undefined {
    // 1. Slot persis (paling akurat).
    if (slotId) {
      const arr = worksheetBySlot.get(`${studentId}_${slotId}`);
      if (arr) {
        const w = arr.find((x) => !consumedWorksheets.has(x));
        if (w) return w;
      }
    }
    // 2. Jam sama pada tanggal sama.
    const t = normTime(schedTime);
    if (t) {
      const arr = worksheetByDateTime.get(`${studentId}_${schedDate}_${t}`);
      if (arr) {
        const w = arr.find((x) => !consumedWorksheets.has(x));
        if (w) return w;
      }
    }
    // 3. Fallback lama: isian pertama yang belum dipakai pada tanggal itu
    // (mencakup baris lama tanpa jam agar status Terisi tetap benar).
    const group = worksheetGroups.get(`${studentId}_${schedDate}`);
    if (group) {
      return group.find((x) => !consumedWorksheets.has(x));
    }
    return undefined;
  }

  function toRowContent(ws?: WorksheetRaw) {
    return {
      materi: ws?.materi || "",
      kegiatan: ws?.kegiatan || "",
      hasil_belajar: ws?.hasil_belajar || "",
      catatan_guru: ws?.catatan_guru || "",
      rekomendasi_rumah: ws?.rekomendasi_rumah || "",
    };
  }

  const rows: StudentScheduleWorksheetRow[] = bookingList.map((b) => {
    const s = studentMap.get(b.student_id);
    const schedDate = String(b.slot?.date || "").slice(0, 10);
    const schedTime = String(b.slot?.time || "").slice(0, 5);
    const className = (b.slot?.class_id && classNamesMap.get(b.slot.class_id)) || "-";
    const labelText = s?.label
      ? [s.label.main_level, s.label.sub_level].filter(Boolean).join(" - ")
      : "-";
    const groupKey = `${b.student_id}_${schedDate}`;
    // Cocokkan per slot/jam dulu (baru), fallback tanggal (lama).
    const ws = takeWorksheetForBooking(
      b.student_id,
      schedDate,
      schedTime,
      (b.schedule_slot_id || "").toString() || null,
    );
    const filled = !!ws;
    if (filled && ws) {
      consumedKeys.add(groupKey);
      consumedWorksheets.add(ws);
    }

    return {
      key: `${b.student_id}_${schedDate}_${schedTime}_${className}`,
      student_id: b.student_id,
      student_name: s?.name || "-",
      nickname: s?.nickname || null,
      branch_name: s?.branch?.name || "-",
      label_name: labelText || "-",
      schedule_date: schedDate,
      schedule_time: schedTime,
      class_name: className,
      status: filled ? "Terisi" : "Kosong",
      luar_jadwal: false,
      ...toRowContent(ws),
    };
  });

  // Isian yang tanggalnya tidak cocok dengan jadwal mana pun tetap
  // ditampilkan sebagai baris sendiri agar tidak ada data yang hilang.
  worksheetGroups.forEach((group, groupKey) => {
    const [studentId, wsDate] = groupKey.split("_");
    const s = studentMap.get(studentId);
    if (!s) return;
    const labelText = s.label
      ? [s.label.main_level, s.label.sub_level].filter(Boolean).join(" - ")
      : "-";
    group.forEach((ws, idx) => {
      // Isian yang sudah dipakai baris jadwalnya (per slot/jam) dilewati.
      if (consumedWorksheets.has(ws)) return;
      // Kompatibilitas lama: isian pertama tiap tanggal dianggap terpakai
      // jika tanggalnya sudah dikonsumsi.
      if (idx === 0 && consumedKeys.has(groupKey)) return;
      rows.push({
        key: `${studentId}_${wsDate}_luar-jadwal-${idx}`,
        student_id: studentId,
        student_name: s.name || "-",
        nickname: s.nickname || null,
        branch_name: s.branch?.name || "-",
        label_name: labelText || "-",
        schedule_date: wsDate,
        schedule_time: "-",
        class_name: "Di luar jadwal",
        status: "Terisi",
        luar_jadwal: true,
        ...toRowContent(ws),
      });
    });
  });

  rows.sort((a, b) => {
    if (a.schedule_date !== b.schedule_date)
      return a.schedule_date < b.schedule_date ? 1 : -1;
    if (a.schedule_time !== b.schedule_time)
      return a.schedule_time < b.schedule_time ? 1 : -1;
    return a.student_name.localeCompare(b.student_name);
  });

  return { data: rows };
}
