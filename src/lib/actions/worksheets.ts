"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { parseIndonesianDateToISO, isAbsentWorksheet, formatFullIndonesianDate } from "../dateUtils";
import { ABSENT_WORKSHEET_OR_FILTER, memoryPointsCache, normalizeScheduleTime, isMissingColumnError, requireUserOrParent, requireUser } from "./_internal";
import { getBranchId } from "./auth-branch";
import { getStudentScheduleMap } from "./schedules";
import { getStudents } from "./students";
import { getAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logger";

export async function getWorksheetsByBranch(studentId?: string, limit: number = 100) {
  await requireUser();
  try {
    const branchId = await getBranchId();
    if (!branchId) return [];

    const supabaseServer = await createClient();

    let query = supabaseServer
      .from("student_worksheets")
      .select(
        `
        *,
        student:students(id, name, nickname, gender, date_of_birth, status, access_pin, label_id, label:labels(id, main_level, sub_level, hex_color))
      `,
      )
      .order("worksheet_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (studentId) {
      query = query.eq("student_id", studentId);
    } else {
      query = query.limit(limit);
    }

    if (branchId !== "ALL") {
      query = query.eq("branch_id", branchId);
    }

    const { data: allWorksheets, error } = await query;
    if (error) {
      console.warn(
        "Notice fetching worksheets (Pastikan SQL Migration sudah dijalankan):",
        error.message || error,
      );
      return [];
    }

    if (allWorksheets.length > 0) {
      const studentIds = Array.from(
        new Set(allWorksheets.map((w) => w.student_id).filter(Boolean)),
      );
      const scheduleMap = await getStudentScheduleMap(studentIds);
      return allWorksheets.map((w) => {
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

    return allWorksheets;
  } catch (err: any) {
    console.warn("Exception fetching worksheets:", err?.message || err);
    return [];
  }
}

export const getWorksheetsByStudent = cache(async (studentId: string) => {
  try {
    // Guard: admin login ATAU portal ortu siswa yang sama.
    await requireUserOrParent(studentId);
    const supabaseServer = getAdminClient();
    const { data, error } = await supabaseServer
      .from("student_worksheets")
      .select("*")
      .eq("student_id", studentId)
      .order("worksheet_date", { ascending: false })
      .order("created_at", { ascending: false });

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
});

const DUPLICATE_REPORT_MESSAGE =
  "LAPORAN_SUDAH_TERISI: Laporan perkembangan siswa ini pada jadwal (tanggal & jam) tersebut sudah terisi. Tidak bisa isi 2x.";

function isDuplicateKeyError(err: any): boolean {
  const msg = String(err?.message || "");
  return (
    err?.code === "23505" ||
    msg.includes("uq_worksheets_student_date_slot") ||
    msg.includes("uq_worksheets_student_date_time") ||
    msg.includes("duplicate key value")
  );
}

// Aturan tabrakan laporan per jadwal — dipakai create & update agar konsisten
// dengan cek client di WorksheetFormModal. Mengizinkan 1 siswa memiliki 2 sesi
// pada tanggal yang sama jika jam/slot-nya berbeda.
function isSlotDuplicate(
  newSlot: string | null,
  newTime: string | null,
  rows: any[],
): boolean {
  return (rows || []).some((w: any) => {
    const wSlot = (w?.schedule_slot_id || "").toString().trim();
    const wTime = normalizeScheduleTime(w?.schedule_time);

    // 1. Jika keduanya memiliki slot_id: tabrakan hanya jika slot-nya sama
    if (newSlot && wSlot) {
      return wSlot === newSlot;
    }

    // 2. Jika keduanya memiliki jam sesi: tabrakan hanya jika jam-nya sama
    if (newTime && wTime) {
      return wTime === newTime;
    }

    // 3. Jika keduanya sama-sama tidak memiliki slot & tidak memiliki jam
    // (laporan umum tanggal yang sama tanpa konteks jam)
    if (!newSlot && !newTime && !wSlot && !wTime) {
    return true;
    }

    // Sesi dengan jam berbeda tidak dianggap duplikat (siswa boleh les 2 sesi sehari)
    return false;
  });
}

// Batch2 (read-only): jam-jam sesi (HH:MM) seorang siswa pada tanggal tertentu.
// Dipakai validasi form worksheet agar jam manual yang mustahil (mis. 02:00)
// ditolak sejak awal. Mengembalikan [] jika tak ada sesi — laporan sesi
// tambahan tetap boleh disimpan (perilaku lama).
export async function getStudentSessionTimes(
  studentId: string,
  dateStr: string,
): Promise<string[]> {
  await requireUser();
  try {
    if (!studentId || !dateStr) return [];
    const iso = String(dateStr).slice(0, 10);
    if (!iso) return [];
    const supabaseServer = await createClient();
    const { data, error } = await supabaseServer
      .from("schedule_student")
      .select("slot:schedule_slots!inner(time)")
      .eq("student_id", studentId)
      .eq("slot.date", iso);
    if (error || !data) return [];
    const times = new Set<string>();
    for (const row of data) {
      const slotObj = (row as any)?.slot;
      const rawTime = Array.isArray(slotObj) ? slotObj[0]?.time : slotObj?.time;
      const norm = normalizeScheduleTime(rawTime);
      if (norm) times.add(norm);
    }
    return Array.from(times).sort();
  } catch {
    return [];
  }
}

// Batch2: tanggal laporan yang tertaut slot WAJIB sama dengan tanggal slot.
// Mencegah laporan "mengambang" (overdue palsu di tanggal asli + salah
// menutup slot lain). Dipakai create & update. Slot tak ditemukan (terhapus)
// = lolos seperti perilaku lama.
async function assertWorksheetDateMatchesSlot(
  supabaseServer: any,
  slotId: string | null,
  isoDate: string | null,
): Promise<void> {
  if (!slotId || !isoDate) return;
  const { data: slot, error } = await supabaseServer
    .from("schedule_slots")
    .select("date")
    .eq("id", slotId)
    .maybeSingle();
  if (error || !slot) return;
  const slotDate =
    typeof (slot as any).date === "string"
      ? (slot as any).date.split("T")[0]
      : null;
  if (slotDate && slotDate !== isoDate) {
    throw new Error(
      `Tanggal laporan (${formatFullIndonesianDate(isoDate, { includeDayName: false })}) tidak sama dengan tanggal jadwal (${formatFullIndonesianDate(slotDate, { includeDayName: false })}). Jika salah jadwal, hapus laporan ini dan isi ulang dari jadwal yang benar.`,
    );
  }
}

export async function createWorksheet(formData: FormData) {
  await requireUser();
  const student_id = formData.get("student_id") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const rawDate = (formData.get("worksheet_date") as string) || "";
  const worksheet_date = parseIndonesianDateToISO(rawDate);
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
  // Konteks jadwal (opsional, nullable agar data lama & flow lama tetap jalan).
  const rawSlotId = (formData.get("schedule_slot_id") as string) || "";
  const schedule_slot_id = rawSlotId.trim() ? rawSlotId.trim() : null;
  const schedule_time = normalizeScheduleTime(
    formData.get("schedule_time") as string,
  );

  if (!student_id || !title) {
    throw new Error("Siswa dan Judul Laporan Perkembangan wajib diisi.");
  }

  const supabaseAuthCheck = await createClient();
  const {
    data: { user: worksheetUser },
  } = await supabaseAuthCheck.auth.getUser();
  if (!worksheetUser) {
    // Pesan jelas agar client tidak bingung + tidak perlu logout (cukup refresh).
    // Tidak merubah data / payload apapun.
    throw new Error(
      "Sesi login kedaluwarsa. Refresh halaman lalu coba Simpan lagi (draft tersimpan otomatis di HP). Jika masih gagal, login ulang.",
    );
  }

  const branchId = await getBranchId();
  const supabaseServer = await createClient();

  // Batch2: tanggal laporan tertaut slot wajib sama dengan tanggal slot.
  await assertWorksheetDateMatchesSlot(
    supabaseServer,
    schedule_slot_id,
    worksheet_date,
  );

  // Cegah double sebelum insert (check-then-insert).
  // Toleran jika migrasi kolom jadwal belum dijalankan: lewati cek baru,
  // fallback ke cek lama per siswa+tanggal agar tidak merusak flow lama.
  try {
    if (schedule_slot_id || schedule_time) {
      // 1 query: ambil semua laporan siswa di tanggal itu, cocokkan di JS
      // agar baris lama tanpa slot/jam tetap terdeteksi (tanpa query ekstra).
      const { data: dayRows, error: dayErr } = await supabaseServer
        .from("student_worksheets")
        .select("id, schedule_slot_id, schedule_time")
        .eq("student_id", student_id)
        .eq("worksheet_date", worksheet_date)
        .limit(20);
      if (dayErr) {
        if (!isMissingColumnError(dayErr)) throw dayErr;
        // Kolom jadwal belum ada (migrasi belum jalan): fallback ke aturan
        // lama 1 laporan per tanggal agar duplikat tetap ditolak.
        // Hanya jalan pra-migrasi; pasca-migrasi nol query tambahan.
        const { data: legacy, error: legacyErr } = await supabaseServer
          .from("student_worksheets")
          .select("id")
          .eq("student_id", student_id)
          .eq("worksheet_date", worksheet_date)
          .limit(1);
        if (!legacyErr && legacy && legacy.length > 0) {
          throw new Error(DUPLICATE_REPORT_MESSAGE);
        }
        if (legacyErr) throw legacyErr;
      } else if (
        isSlotDuplicate(schedule_slot_id, schedule_time, dayRows || [])
      ) {
        throw new Error(DUPLICATE_REPORT_MESSAGE);
      }
    } else {
      // Flow tanpa konteks jam: cegah double jika sudah ada laporan tanpa jam di tanggal itu
      const { data: existing, error: checkError } = await supabaseServer
        .from("student_worksheets")
        .select("id, schedule_slot_id, schedule_time")
        .eq("student_id", student_id)
        .eq("worksheet_date", worksheet_date)
        .limit(20);
      if (checkError) {
        if (!isMissingColumnError(checkError)) throw checkError;
      } else if (existing && existing.length > 0) {
        const hasUntimed = existing.some(
          (w: any) =>
            !(w?.schedule_slot_id) && !normalizeScheduleTime(w?.schedule_time),
        );
        if (hasUntimed) {
          throw new Error(DUPLICATE_REPORT_MESSAGE);
        }
      }
    }
  } catch (e: any) {
    if (String(e?.message || "").startsWith("LAPORAN_SUDAH_TERISI")) throw e;
    // Selain duplikat terdeteksi, error cek diabaikan agar insert tetap dicoba
    // (unique index DB menjadi pengaman terakhir, termasuk untuk race condition).
    if (
      e &&
      !isMissingColumnError(e) &&
      !String(e?.message || "").includes("LAPORAN_SUDAH_TERISI")
    ) {
      console.warn("Pre-check duplikat laporan dilewati:", e?.message || e);
    }
  }

  const basePayload: any = {
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
  };
  const fullPayload: any = { ...basePayload };
  if (schedule_slot_id) fullPayload.schedule_slot_id = schedule_slot_id;
  if (schedule_time) fullPayload.schedule_time = schedule_time;

  let { error } = await supabaseServer
    .from("student_worksheets")
    .insert(fullPayload);

  // Fallback: jika kolom jadwal belum ada di DB (migrasi belum jalan),
  // ulangi insert tanpa kolom baru agar flow lama tetap berhasil.
  if (error && isMissingColumnError(error)) {
    const retry = await supabaseServer
      .from("student_worksheets")
      .insert(basePayload);
    error = retry.error;
  }

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
    if (isDuplicateKeyError(error)) {
      throw new Error(DUPLICATE_REPORT_MESSAGE);
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

  memoryPointsCache.clear();
  revalidatePath("/points");
  logActivity("WORKSHEET", "Lembar kerja baru disimpan", {
    student_id,
    tanggal: worksheet_date,
    materi: materi || title,
    hadir: !isAbsentWorksheet({ materi, title, kegiatan, hasil_belajar }),
  });
  return true;
}

export async function updateWorksheet(id: string, formData: FormData) {
  await requireUser();
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

  const supabaseAuthCheckUpdate = await createClient();
  const {
    data: { user: worksheetUpdateUser },
  } = await supabaseAuthCheckUpdate.auth.getUser();
  if (!worksheetUpdateUser) {
    throw new Error(
      "Sesi login kedaluwarsa. Refresh halaman lalu coba Simpan lagi (draft tersimpan otomatis di HP). Jika masih gagal, login ulang.",
    );
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
  };

  if (worksheet_date) {
    updatePayload.worksheet_date = parseIndonesianDateToISO(worksheet_date);
  }

  // Konteks jadwal hanya diupdate jika form mengirimkannya (edit lama tanpa
  // konteks tidak mengubah kolom jadwal yang sudah ada).
  const rawSlotId = formData.get("schedule_slot_id");
  const rawTime = formData.get("schedule_time");
  const hasSlotField = rawSlotId !== null;
  const hasTimeField = rawTime !== null;
  if (hasSlotField) {
    const v = String(rawSlotId || "").trim();
    updatePayload.schedule_slot_id = v ? v : null;
  }
  if (hasTimeField) {
    updatePayload.schedule_time = normalizeScheduleTime(rawTime);
  }

  // Cegah edit menabrak laporan lain (kecualikan diri sendiri).
  // Toleran jika kolom jadwal belum ada: fallback ke cek lama.
  try {
    if (updatePayload.worksheet_date) {
      // Ambil baris sendiri (toleran pra-migrasi: kolom jadwal mungkin belum ada).
      let ownStudentId: string | null = null;
      let ownSlot: string | null = null;
      let ownTime: string | null = null;
      const { data: current, error: curErr } = await supabaseServer
        .from("student_worksheets")
        .select("student_id, schedule_slot_id, schedule_time")
        .eq("id", id)
        .single();
      if (!curErr && current) {
        ownStudentId = (current as any).student_id;
        ownSlot = (current as any).schedule_slot_id
          ? String((current as any).schedule_slot_id)
          : null;
        ownTime = normalizeScheduleTime((current as any).schedule_time);
      } else if (curErr && isMissingColumnError(curErr)) {
        const legacyOwn = await supabaseServer
          .from("student_worksheets")
          .select("student_id")
          .eq("id", id)
          .single();
        if (!legacyOwn.error && legacyOwn.data)
          ownStudentId = (legacyOwn.data as any).student_id;
      }
      if (ownStudentId) {
        const effSlot =
          hasSlotField && updatePayload.schedule_slot_id !== undefined
            ? updatePayload.schedule_slot_id
            : ownSlot;
        const effTime =
          hasTimeField && updatePayload.schedule_time !== undefined
            ? updatePayload.schedule_time
            : ownTime;
        if (effSlot || effTime) {
          // 1 query: kandidat tabrakan di tanggal itu (kecualikan diri sendiri).
          const { data: dayRows, error: dayErr } = await supabaseServer
            .from("student_worksheets")
            .select("id, schedule_slot_id, schedule_time")
            .eq("student_id", ownStudentId)
            .eq("worksheet_date", updatePayload.worksheet_date)
            .neq("id", id)
            .limit(20);
          if (dayErr) {
            if (!isMissingColumnError(dayErr)) throw dayErr;
            // Fallback pra-migrasi: tolak jika tanggal itu ada laporan lain.
            const f = await supabaseServer
              .from("student_worksheets")
              .select("id")
              .eq("student_id", ownStudentId)
              .eq("worksheet_date", updatePayload.worksheet_date)
              .neq("id", id)
              .limit(1);
            if (!f.error && f.data && f.data.length > 0) {
              throw new Error(DUPLICATE_REPORT_MESSAGE);
            }
          } else if (isSlotDuplicate(effSlot, effTime, dayRows || [])) {
            throw new Error(DUPLICATE_REPORT_MESSAGE);
          }
        } else {
          // Edit tanpa slot/jam: cegah jika tanggal tujuan sudah ditempati laporan lain yang juga tanpa slot & jam
          const { data: dayRows, error: dayErr } = await supabaseServer
            .from("student_worksheets")
            .select("id, schedule_slot_id, schedule_time")
            .eq("student_id", ownStudentId)
            .eq("worksheet_date", updatePayload.worksheet_date)
            .neq("id", id)
            .limit(20);
          if (!dayErr && dayRows && dayRows.length > 0) {
            const hasUntimed = dayRows.some(
              (w: any) =>
                !(w?.schedule_slot_id) && !normalizeScheduleTime(w?.schedule_time),
            );
            if (hasUntimed) {
              throw new Error(DUPLICATE_REPORT_MESSAGE);
            }
          }
        }
      }
    }
  } catch (e: any) {
    if (String(e?.message || "").startsWith("LAPORAN_SUDAH_TERISI")) throw e;
    // Abaikan error cek agar update tetap dicoba (pengaman akhir di DB).
  }

  // Batch2: tanggal laporan tertaut slot wajib sama dengan tanggal slot.
  // Baris lama tanpa slot tetap boleh ganti tanggal seperti perilaku lama.
  if (updatePayload.worksheet_date) {
    let effSlotForDateCheck: string | null = null;
    if (hasSlotField) {
      effSlotForDateCheck = updatePayload.schedule_slot_id
        ? String(updatePayload.schedule_slot_id)
        : null;
    } else {
      const { data: ownRow } = await supabaseServer
        .from("student_worksheets")
        .select("schedule_slot_id")
        .eq("id", id)
        .maybeSingle();
      const ownSlot = (ownRow as any)?.schedule_slot_id;
      effSlotForDateCheck = ownSlot ? String(ownSlot) : null;
    }
    await assertWorksheetDateMatchesSlot(
      supabaseServer,
      effSlotForDateCheck,
      updatePayload.worksheet_date,
    );
  }

  let { error } = await supabaseServer
    .from("student_worksheets")
    .update(updatePayload)
    .eq("id", id);

  // Fallback jika kolom jadwal belum ada di DB: ulangi tanpa kolom baru.
  if (error && isMissingColumnError(error)) {
    const { schedule_slot_id: _s, schedule_time: _t, ...legacyPayload } =
      updatePayload;
    const retry = await supabaseServer
      .from("student_worksheets")
      .update(legacyPayload)
      .eq("id", id);
    error = retry.error;
  }

  if (error) {
    if (isDuplicateKeyError(error)) {
      throw new Error(DUPLICATE_REPORT_MESSAGE);
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

  memoryPointsCache.clear();
  revalidatePath("/points");
  logActivity("WORKSHEET", "Lembar kerja diperbarui", {
    id,
    tanggal: worksheet_date,
    materi: materi || title,
  });
  return true;
}

export async function deleteWorksheet(id: string) {
  await requireUser();
  const supabaseServer = await createClient();
  const { error } = await supabaseServer
    .from("student_worksheets")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting worksheet:", error);
    throw new Error("Gagal menghapus laporan perkembangan: " + error.message);
  }

  memoryPointsCache.clear();
  revalidatePath("/points");
  logActivity("WORKSHEET", "Lembar kerja dihapus", { id });
  return true;
}

export async function deleteWorksheetMonth(
  studentId: string,
  bulanKe: number | null,
) {
  await requireUser();
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

  memoryPointsCache.clear();
  revalidatePath("/points");
  logActivity("WORKSHEET", "Lembar kerja sebulan dihapus", {
    student_id: studentId,
    bulan_ke: bulanKe,
  });
  return true;
}

export async function getWorksheetAttendanceHistory() {
  await requireUser();
  const supabaseServer = await createClient();
  const activeBranchId = await getBranchId();

  try {
    const isSpecificBranch = Boolean(
      activeBranchId && activeBranchId !== "ALL",
    );
    // Hemat Egress: jangan tarik kolom teks panjang (kegiatan, hasil_belajar)
    // yang tidak pernah dipakai UI. Deteksi absen via filter SQL yang sama dengan getStudents.
    let query = supabaseServer
      .from("student_worksheets")
      .select(
        isSpecificBranch
          ? `
        id,
        student_id,
        title,
        materi,
        created_at,
        student:students!inner(name, nickname, branch_id)
      `
          : `
        id,
        student_id,
        title,
        materi,
        created_at,
        student:students(name, nickname, branch_id)
      `,
      )
      .order("created_at", { ascending: false });

    let absentQuery = supabaseServer
      .from("student_worksheets")
      .select(
        isSpecificBranch
          ? "id, student:students!inner(branch_id)"
          : "id",
      )
      .or(ABSENT_WORKSHEET_OR_FILTER);

    if (isSpecificBranch) {
      query = query.eq("student.branch_id", activeBranchId);
      absentQuery = absentQuery.eq("student.branch_id", activeBranchId);
    }

    const [{ data, error }, { data: absentRows }] = await Promise.all([
      query,
      absentQuery,
    ]);
    if (error) {
      return [];
    }

    const absentIdSet = new Set(
      (absentRows || []).map((r: any) => r.id).filter(Boolean),
    );

    const rows = data || [];
    return rows.map((item: any) => ({
      id: item.id,
      student_id: item.student_id,
      title: item.title,
      materi: item.materi,
      created_at: item.created_at,
      student: item.student,
      is_absent: absentIdSet.has(item.id) || isAbsentWorksheet(item),
    }));
  } catch (e) {
    return [];
  }
}
