"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { getTodayISO, isAbsentWorksheet } from "../dateUtils";
import { getStudentScheduleMap } from "./schedules";
import { getWorksheetsByStudent } from "./worksheets";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireUserOrParent } from "./_internal";
import { logActivity } from "@/lib/logger";

// ── Log diagnostik Portal Orang Tua ────────────────────────────────────────
// Sementara dipakai untuk menelusuri laporan client "halaman gagal dimuat".
// Formatnya satu baris per kejadian dengan awalan [PORTAL] supaya mudah
// difilter di Vercel Logs (filter: "[PORTAL]").
//
// PENTING: hanya console.log. Tidak mengubah alur login, query, maupun data
// di database. Boleh dihapus lagi setelah kasus selesai.
//
// Cara baca:
//   [PORTAL] LOGIN ... | MASUK        → request login sampai ke server
//   [PORTAL] LOGIN ... | COCOK        → siswa ketemu, session dibuat
//   [PORTAL] LOGIN ... | GAGAL:<alasan> → request sampai, tapi tidak lolos
//   [PORTAL] DASH  ... | MASUK        → request dashboard sampai ke server
//   [PORTAL] DASH  ... | TANPA-SESSION → cookie tidak ada / tidak berlaku
// Kalau tidak ada baris [PORTAL] sama sekali pada jam yang diklaim client,
// berarti request-nya gagal sebelum sampai server (jaringan atau browser HP).
// ──────────────────────────────────────────────────────────────────────────
function logPortal(
  stage: "LOGIN" | "LOGIN-PILIH" | "DASH",
  detail: Record<string, unknown>,
) {
  try {
    console.log(
      `[PORTAL] ${stage} ${new Date().toISOString()} | ${JSON.stringify(detail)}`,
    );
    if (stage === "LOGIN" && detail.tahap === "COCOK") {
      logActivity("PORTAL-ORTU", "Login berhasil", {
        siswa: detail.nama,
        id: detail.studentId,
        level: detail.level,
      });
    } else if (stage === "LOGIN" && detail.tahap === "GAGAL") {
      logActivity("PORTAL-ORTU", "Login gagal", {
        nama: detail.nama,
        alasan: detail.alasan,
      });
    } else if (stage === "LOGIN-PILIH") {
      logActivity("PORTAL-ORTU", "Pilih siswa (ganda)", {
        siswa: detail.nama,
        id: detail.studentId,
      });
    }
  } catch (e) {
    // logger tidak boleh pernah mengganggu alur portal
  }
}

export async function verifyParentAccess(
  studentNameOrSearch: string,
  pin: string,
  branchId?: string,
): Promise<{
  success: boolean;
  error?: string;
  student?: any;
  needSelection?: boolean;
  candidates?: any[];
  matchLevel?: "nickname" | "fullname" | "word_or_id";
}> {
  if (!studentNameOrSearch || !pin) {
    return { success: false, error: "Nama Siswa dan PIN Akses wajib diisi." };
  }

  const cleanSearchRaw = studentNameOrSearch.trim();
  const cleanPin = pin.trim();

  const normalizeText = (str: string | null | undefined) =>
    (str || "").trim().toLowerCase().replace(/\s+/g, " ");

  const cleanSearch = normalizeText(cleanSearchRaw);

  const supabaseServer = getAdminClient();

  // Bukti request login sampai ke server (penting saat client lapor
  // "halaman gagal dimuat" — kalau baris ini tidak ada, masalahnya
  // ada di jaringan/browser HP, bukan di aplikasi).
  logPortal("LOGIN", {
    tahap: "MASUK",
    nama: cleanSearch,
    cabang: branchId || "SEMUA",
  });

  let students: any[] | null = null;
  let error: any = null;

  // Filter SQL langsung jika branchId berupa UUID cabang valid (hemat Egress tanpa ubah hasil)
  const cleanBranchFilter =
    branchId && branchId.trim() !== "" && branchId !== "ALL"
      ? branchId.trim()
      : null;
  const isBranchUuid =
    !!cleanBranchFilter &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cleanBranchFilter,
    );

  let primaryQuery = supabaseServer.from("students").select(`
      id, name, nickname, gender, date_of_birth, status, registration_date, access_pin, branch_id,
      branch:branches(id, name),
      label:labels(id, main_level, sub_level, hex_color)
    `);
  if (isBranchUuid && cleanBranchFilter) {
    primaryQuery = primaryQuery.eq("branch_id", cleanBranchFilter);
  }
  const primaryRes = await primaryQuery;

  students = primaryRes.data;
  error = primaryRes.error;

  if (error) {
    let fallbackQuery = supabaseServer.from("students").select(`
        id, name, nickname, gender, date_of_birth, status, registration_date, branch_id,
        branch:branches(id, name),
        label:labels(id, main_level, sub_level, hex_color)
      `);
    if (isBranchUuid && cleanBranchFilter) {
      fallbackQuery = fallbackQuery.eq("branch_id", cleanBranchFilter);
    }
    const fallbackRes = await fallbackQuery;
    students = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (!error && isBranchUuid && (!students || students.length === 0)) {
    return {
      success: false,
      error:
        "Siswa tidak ditemukan pada Unit/Cabang yang dipilih. Mohon periksa kembali pilihan Unit/Cabang.",
    };
  }

  if (error || !students || students.length === 0) {
    logPortal("LOGIN", {
      tahap: "GAGAL",
      nama: cleanSearch,
      alasan: "data-siswa-tidak-dibaca",
    });
    return {
      success: false,
      error:
        "Data siswa tidak ditemukan. Mohon periksa kembali nama yang dimasukkan.",
    };
  }

  // Filter per Unit/Cabang jika dipilih oleh orang tua
  if (branchId && branchId.trim() !== "" && branchId !== "ALL") {
    const cleanBranchId = branchId.trim();
    students = students.filter(
      (s) =>
        s.branch_id === cleanBranchId ||
        s.branch?.id === cleanBranchId ||
        (s.branch?.name &&
          normalizeText(s.branch.name) === normalizeText(cleanBranchId)),
    );
    if (students.length === 0) {
      return {
        success: false,
        error:
          "Siswa tidak ditemukan pada Unit/Cabang yang dipilih. Mohon periksa kembali pilihan Unit/Cabang.",
      };
    }
  }

  // Helper: check if a student's PIN matches (fallback to "123456" if null/empty/whitespace)
  const getStudentPin = (s: any) => {
    if (s.access_pin && String(s.access_pin).trim() !== "") {
      return String(s.access_pin).trim();
    }
    return "123456";
  };

  const pinMatches = (s: any) => getStudentPin(s) === cleanPin;

  // Order students so ACTIVE students are checked before INACTIVE ones.
  // This prevents an inactive student record with the same PIN from shadowing an active student.
  const activeStudents = students.filter((s) => s.status !== "INACTIVE");
  const inactiveStudents = students.filter((s) => s.status === "INACTIVE");
  const orderedStudents = [...activeStudents, ...inactiveStudents];

  // Strict matching logic for Parent Portal (read-only, tanpa mutasi data):
  // 1. Exact Nickname match (case & whitespace insensitive) — Highest priority as requested
  // 2. Exact Full Name match (case & whitespace insensitive)
  // 3. Exact word in full name match (e.g. searching "Khaleed" for "Khaleed Al Fatih") or Student ID match
  //
  // OPSI 2 (disambiguasi): bila ada >1 kandidat pada level yang sama,
  // jangan diam-diam pilih yang pertama — kembalikan daftar kandidat
  // agar orang tua memilih anak yang benar. Tidak ada perubahan prioritas.
  const sanitizeStudent = (s: any) => {
    const { access_pin, ...safe } = s;
    return safe;
  };

  // Helper: bila kandidat ganda, hanya tawarkan yang aktif.
  // Jika semuanya nonaktif, kembalikan error nonaktif seperti flow lama.
  const resolveCandidates = (
    matches: any[],
    matchLevel: "nickname" | "fullname" | "word_or_id",
  ): { success: boolean; error?: string; student?: any; needSelection?: boolean; candidates?: any[]; matchLevel?: any } | null => {
    if (matches.length === 0) return null;
    if (matches.length === 1) {
      const only = matches[0];
      if (only.status === "INACTIVE") {
        return {
          success: false,
          error:
            "Akun siswa ini sedang Nonaktif. Silakan hubungi pihak admin sekolah.",
        };
      }
      return { single: only } as any;
    }
    const activeMatches = matches.filter((s) => s.status !== "INACTIVE");
    if (activeMatches.length === 0) {
      return {
        success: false,
        error:
          "Akun siswa ini sedang Nonaktif. Silakan hubungi pihak admin sekolah.",
      };
    }
    if (activeMatches.length === 1) {
      return { single: activeMatches[0] } as any;
    }
    return {
      success: false,
      needSelection: true,
      candidates: activeMatches.map(sanitizeStudent),
      matchLevel,
      error:
        "Ditemukan lebih dari satu siswa dengan nama & PIN tersebut. Silakan pilih anak Anda pada daftar berikut.",
    };
  };

  // FIX kasus "Nathan": cari kandidat per level TANPA PIN dulu,
  // baru saring PIN di dalam level itu. Tujuannya agar nickname exact
  // tidak dibajak oleh word-match siswa lain.
  // Contoh: ketik "nathan" -> pool nickname = [Alfarezel (panggilan nathan)].
  // - Jika PIN cocok -> login Alfarezel.
  // - Jika PIN salah -> kembalikan "PIN salah", JANGAN loncat ke
  //   "Ervin Nathan Rifansyah" yang kebetulan mengandung kata "nathan".
  const pinError = {
    success: false,
    error:
      "PIN Akses salah. Silakan masukkan PIN yang benar atau hubungi admin sekolah.",
  };
  // dipakai untukNeedsiagnostik PIN salah
  const pinGagal = () => {
    logPortal("LOGIN", {
      tahap: "GAGAL",
      nama: cleanSearch,
      alasan: "pin-salah",
    });
    return pinError;
  };

  // Level 1: pool nickname exact (abaikan PIN dulu)
  const nicknamePool = orderedStudents.filter((s) => {
    const nickNorm = normalizeText(s.nickname);
    return nickNorm && nickNorm === cleanSearch;
  });
  if (nicknamePool.length > 0) {
    const pinOk = nicknamePool.filter(pinMatches);
    if (pinOk.length === 0) return pinGagal();
    const r = resolveCandidates(pinOk, "nickname");
    if ((r as any)?.single) {
      const { access_pin, ...safe } = (r as any).single;
      const cookieStore = await cookies();
      cookieStore.set("parent_student_id", (r as any).single.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
      logPortal("LOGIN", {
        tahap: "COCOK",
        nama: (r as any).single.name,
        studentId: (r as any).single.id,
        level: "nickname",
      });
      return { success: true, student: safe };
    }
    return r as any;
  }

  // Level 2: pool nama lengkap exact (abaikan PIN dulu)
  const fullnamePool = orderedStudents.filter((s) => {
    const nameNorm = normalizeText(s.name);
    return nameNorm === cleanSearch;
  });
  if (fullnamePool.length > 0) {
    const pinOk = fullnamePool.filter(pinMatches);
    if (pinOk.length === 0) return pinGagal();
    const r = resolveCandidates(pinOk, "fullname");
    if ((r as any)?.single) {
      const { access_pin, ...safe } = (r as any).single;
      const cookieStore = await cookies();
      cookieStore.set("parent_student_id", (r as any).single.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
      logPortal("LOGIN", {
        tahap: "COCOK",
        nama: (r as any).single.name,
        studentId: (r as any).single.id,
        level: "fullname",
      });
      return { success: true, student: safe };
    }
    return r as any;
  }

  // Level 3: pool kata dalam nama / ID (abaikan PIN dulu)
  const wordPool = orderedStudents.filter((s) => {
    const nameNorm = normalizeText(s.name);
    const words = nameNorm.split(" ");
    const isWordMatch = words.includes(cleanSearch);
    const isIdMatch = s.id === cleanSearchRaw;
    return isWordMatch || isIdMatch;
  });
  if (wordPool.length > 0) {
    const pinOk = wordPool.filter(pinMatches);
    if (pinOk.length === 0) return pinGagal();
    const r = resolveCandidates(pinOk, "word_or_id");
    if ((r as any)?.single) {
      const matchedStudent: any = (r as any).single;
      if (matchedStudent.status === "INACTIVE") {
        return {
          success: false,
          error:
            "Akun siswa ini sedang Nonaktif. Silakan hubungi pihak admin sekolah.",
        };
      }
      const { access_pin, ...safe } = matchedStudent;
      const cookieStore = await cookies();
      cookieStore.set("parent_student_id", matchedStudent.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
      logPortal("LOGIN", {
        tahap: "COCOK",
        nama: matchedStudent.name,
        studentId: matchedStudent.id,
        level: "word_or_id",
      });
      return { success: true, student: safe };
    }
    return r as any;
  }

  // Tidak ada kecocokan nama di level manapun — pakai pengecekan lama
  // untuk pesan error yang jelas (tanpa mengubah data).
  {
    const nameFoundButPinWrong = orderedStudents.some((s) => {
      const nickNorm = normalizeText(s.nickname);
      const nameNorm = normalizeText(s.name);
      const words = nameNorm.split(" ");
      return (
        (nickNorm && nickNorm === cleanSearch) ||
        nameNorm === cleanSearch ||
        words.includes(cleanSearch) ||
        s.id === cleanSearchRaw
      );
    });

    if (nameFoundButPinWrong) {
      logPortal("LOGIN", {
        tahap: "GAGAL",
        nama: cleanSearch,
        alasan: "pin-salah",
      });
      return {
        success: false,
        error:
          "PIN Akses salah. Silakan masukkan PIN yang benar atau hubungi admin sekolah.",
      };
    } else {
      logPortal("LOGIN", {
        tahap: "GAGAL",
        nama: cleanSearch,
        alasan: "nama-tidak-ditemukan",
      });
      return {
        success: false,
        error:
          "Nama Siswa tidak ditemukan. Pastikan Anda memasukkan Nama Panggilan atau Nama Lengkap yang benar.",
      };
    }
  }
}

export async function confirmParentStudentSelection(
  studentId: string,
  pin: string,
  originalSearch: string,
  branchId?: string,
): Promise<{ success: boolean; error?: string; student?: any }> {
  // Finalisasi OPSI 2: ortu sudah memilih 1 dari daftar kandidat ganda.
  // Read-only terhadap tabel students — hanya set cookie sesi bila valid.
  if (!studentId || !pin) {
    return { success: false, error: "Pilihan siswa dan PIN wajib diisi." };
  }

  const cleanPin = pin.trim();
  const cleanSearchRaw = (originalSearch || "").trim();
  const normalizeText = (str: string | null | undefined) =>
    (str || "").trim().toLowerCase().replace(/\s+/g, " ");
  const cleanSearch = normalizeText(cleanSearchRaw);

  const supabaseServer = getAdminClient();
  const { data: s, error } = await supabaseServer
    .from("students")
    .select(
      `
      id, name, nickname, gender, date_of_birth, status, registration_date, access_pin, branch_id,
      branch:branches(id, name),
      label:labels(id, main_level, sub_level, hex_color)
    `,
    )
    .eq("id", studentId.trim())
    .single();

  if (error || !s) {
    return {
      success: false,
      error: "Pilihan siswa tidak valid. Silakan ulangi pencarian.",
    };
  }

  // Hormati filter cabang yang dipakai saat pencarian awal
  if (branchId && branchId.trim() !== "" && branchId !== "ALL") {
    const cleanBranchId = branchId.trim();
    const branchOk =
      s.branch_id === cleanBranchId ||
      (s as any).branch?.id === cleanBranchId ||
      ((s as any).branch?.name &&
        normalizeText((s as any).branch.name) === normalizeText(cleanBranchId));
    if (!branchOk) {
      return {
        success: false,
        error: "Pilihan siswa tidak berada pada Unit/Cabang yang dipilih.",
      };
    }
  }

  const storedPin =
    (s as any).access_pin && String((s as any).access_pin).trim() !== ""
      ? String((s as any).access_pin).trim()
      : "123456";
  if (storedPin !== cleanPin) {
    return {
      success: false,
      error:
        "PIN Akses salah. Silakan masukkan PIN yang benar atau hubungi admin sekolah.",
    };
  }

  // Pastikan ID yang dipilih memang cocok dengan nama yang diketik
  // (mencegah login ke ID sembarang hanya dengan menebak PIN default).
  if (cleanSearch) {
    const nickNorm = normalizeText((s as any).nickname);
    const nameNorm = normalizeText((s as any).name);
    const words = nameNorm.split(" ");
    const matchesSearch =
      (nickNorm && nickNorm === cleanSearch) ||
      nameNorm === cleanSearch ||
      words.includes(cleanSearch) ||
      (s as any).id === cleanSearchRaw;
    if (!matchesSearch) {
      return {
        success: false,
        error: "Pilihan siswa tidak sesuai dengan nama yang dimasukkan.",
      };
    }
  }

  if ((s as any).status === "INACTIVE") {
    return {
      success: false,
      error:
        "Akun siswa ini sedang Nonaktif. Silakan hubungi pihak admin sekolah.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("parent_student_id", (s as any).id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  });

  const { access_pin, ...safeStudent } = s as any;
  logPortal("LOGIN-PILIH", {
    tahap: "COCOK",
    nama: safeStudent.name,
    studentId: safeStudent.id,
  });
  return { success: true, student: safeStudent };
}

export async function getParentSessionStudent() {
  const cookieStore = await cookies();
  const studentId = cookieStore.get("parent_student_id")?.value;

  // ── DIAGNOSA SEMENTARA (portal orang tua) ────────────────────────────────
  // Mencatat cookie apa saja yang benar-benar tiba di server. Ini membedakan:
  //   cookieNames kosong        → cookie tidak tersimpan di perangkat sama sekali
  //   cookieNames ada, tanpa    → cookie tersimpan tapi tidak terkirim / tertimpa
  //   parent_student_id
  // Hapus blok ini setelah kasus selesai.
  let diagUserAgent = "";
  let diagCookieNames: string[] = [];
  try {
    diagCookieNames = cookieStore.getAll().map((c) => c.name).sort();
    diagUserAgent = (await headers()).get("user-agent") ?? "";
  } catch {
    diagCookieNames = [];
    diagUserAgent = "";
  }
  const diag = {
    cookieNames: diagCookieNames,
    adaCookieSesi: diagCookieNames.includes("parent_student_id"),
    ua: diagUserAgent.slice(0, 140),
  };
  // ─────────────────────────────────────────────────────────────────────────

  if (!studentId) {
    logPortal("DASH", { tahap: "TANPA-SESSION", alasan: "cookie-tidak-ada", ...diag });
    return null;
  }

  const supabaseServer = getAdminClient();
  let student: any = null;
  let error: any = null;

  const primaryRes = await supabaseServer
    .from("students")
    .select(
      `
      id, name, nickname, gender, date_of_birth, status, registration_date, photo_url,
      branch:branches(name),
      label:labels(id, main_level, sub_level, hex_color)
    `,
    )
    .eq("id", studentId)
    .single();

  student = primaryRes.data;
  error = primaryRes.error;

  // Fallback if photo_url column does not exist in Supabase database yet
  if (error) {
    const fallbackRes = await supabaseServer
      .from("students")
      .select(
        `
        id, name, nickname, gender, date_of_birth, status, registration_date,
        branch:branches(name),
        label:labels(id, main_level, sub_level, hex_color)
      `,
      )
      .eq("id", studentId)
      .single();

    student = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error || !student) {
    logPortal("DASH", { tahap: "TANPA-SESSION", studentId, alasan: "siswa-tidak-ditemukan", pesan: error?.message, ...diag });
    return null;
  }

  if (student.status === "INACTIVE") {
    logPortal("DASH", { tahap: "TANPA-SESSION", studentId, alasan: "siswa-nonaktif", ...diag });
    cookieStore.delete("parent_student_id");
    return null;
  }

  // Ketiganya independen (hanya butuh student.id) — jalan paralel.
  // getWorksheetsByStudent terdedup otomatis via cache() dengan panggilan di ParentDashboardPage
  // sehingga tidak terjadi query student_worksheets 2x untuk siswa yang sama.
  const scheduleMapPromise = getStudentScheduleMap([student.id], supabaseServer);
  const worksheetsPromise = getWorksheetsByStudent(student.id);
  const redemptionsPromise = supabaseServer
    .from("student_point_redemptions")
    .select("points_deducted")
    .eq("student_id", student.id);

  const [scheduleMap, worksheetsData] = await Promise.all([
    scheduleMapPromise,
    worksheetsPromise,
  ]);

  // Fetch worksheets to calculate gross attendance points
  let gross = 0;
  (worksheetsData || []).forEach((w) => {
    if (!isAbsentWorksheet(w)) {
      gross++;
    }
  });

  // Fetch redemptions to calculate redeemed points
  let redeemed = 0;
  try {
    const { data: redemptionsData } = await redemptionsPromise;

    (redemptionsData || []).forEach((r) => {
      redeemed += r.points_deducted || 0;
    });
  } catch (e) {}

  const net = Math.max(0, gross - redeemed);

  logPortal("DASH", {
    tahap: "OK",
    nama: student.name,
    studentId: student.id,
    laporan: (worksheetsData || []).length,
  });

  return {
    ...student,
    schedule: scheduleMap[student.id] || null,
    schedule_detail: scheduleMap[`${student.id}__detail`] || null,
    gross_points: gross,
    redeemed_points: redeemed,
    points: net,
  };
}

export async function clearParentSession() {
  const cookieStore = await cookies();
  cookieStore.delete("parent_student_id");
  return true;
}

export async function getStudentUpcomingSchedule(studentId: string) {
  // Guard: admin login ATAU portal ortu siswa yang sama.
  await requireUserOrParent(studentId);
  const supabaseServer = getAdminClient();
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
  // Guard: admin login ATAU portal ortu siswa yang sama.
  await requireUserOrParent(studentId);
  const supabaseServer = getAdminClient();
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
  // Guard: admin login ATAU portal ortu siswa yang sama.
  await requireUserOrParent(studentId);
  const supabaseServer = getAdminClient();
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
  const supabaseServer = getAdminClient();

  // Guard: cari pemilik lembar kerja dulu, lalu hanya admin login atau
  // portal ortu siswa tersebut yang boleh mengubah catatan.
  const { data: ownerRow } = await supabaseServer
    .from("student_worksheets")
    .select("student_id")
    .eq("id", worksheetId)
    .maybeSingle();

  if (!ownerRow?.student_id) throw new Error("UNAUTHORIZED");
  await requireUserOrParent(ownerRow.student_id);

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
