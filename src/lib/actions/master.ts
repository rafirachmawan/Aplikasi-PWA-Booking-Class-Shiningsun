"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { getCurrentUserRole, getBranchId } from "./auth-branch";
import { requireUser } from "./_internal";
import { getAdminClient } from "@/lib/supabase/admin";

export const getClasses = cache(async () => {
  const supabaseServer = await createClient();
  const branchId = await getBranchId();
  if (!branchId) return [];

  let query = supabaseServer
    .from("classes")
    .select("*, branch:branches(name)")
    .order("name", { ascending: true });

  if (branchId !== "ALL") {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching classes:", error);
    return [];
  }
  return data;
});

let memoryLabelsCache: { data: any[]; timestamp: number } | null = null;
const LABELS_CACHE_TTL = 3 * 60 * 1000; // 3 menit cache in-memory

export async function getLabels() {
  await requireUser();
  if (memoryLabelsCache && Date.now() - memoryLabelsCache.timestamp < LABELS_CACHE_TTL) {
    return memoryLabelsCache.data;
  }

  const supabaseServer = await createClient();
  // Hemat Origin (tanpa ubah logika/data): UI hanya pakai
  // id,main_level,sub_level,hex_color (+branch_id/is_system_default defensif).
  // created_at tidak pernah dibaca. Order sama.
  const { data, error } = await supabaseServer
    .from("labels")
    .select("id,branch_id,main_level,sub_level,hex_color,is_system_default")
    .order("main_level")
    .order("sub_level");

  if (error) {
    console.error("Error fetching labels:", error);
    return [];
  }
  memoryLabelsCache = { data: data || [], timestamp: Date.now() };
  return data;
}

export async function createClass(formData: FormData) {
  await requireUser();
  const name = formData.get("name") as string;
  const max_quota = parseInt(formData.get("max_quota") as string, 10) || 4;
  const branchId = await getBranchId();

  if (branchId === "ALL") {
    throw new Error(
      "Tidak dapat membuat kelas di mode 'Semua Cabang'. Silakan pilih cabang spesifik terlebih dahulu.",
    );
  }

  const supabaseServer = await createClient();
  const { error } = await supabaseServer.from("classes").insert({
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
  await requireUser();
  const main_level = formData.get("main_level") as string;
  const sub_level = formData.get("sub_level") as string;
  const hex_color = formData.get("hex_color") as string;

  const supabaseServer = await createClient();
  // Labels are global — no branch_id needed
  const { error } = await supabaseServer.from("labels").insert({
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
  memoryLabelsCache = null;
  return true;
}

// =========================================
// DELETE & UPDATE ACTIONS (FULL CRUD)
// =========================================

export async function deleteClass(id: string) {
  await requireUser();
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

// Batch2 (read-only): dampak hapus kelas untuk konfirmasi — jumlah sesi,
// booking, dan siswa unik yang ikut terhapus. Cakupan SAMA PERSIS seperti
// deleteClass (tanpa filter cabang) agar angka sesuai kenyataan.
// Mengembalikan null jika gagal dihitung (UI wajib menampilkannya, bukan angka 0).
export async function getClassDeletionImpact(
  classId: string,
): Promise<{ slots: number; bookings: number; students: number } | null> {
  await requireUser();
  try {
    const supabaseServer = await createClient();

    const { count: slotCount, error: slotErr } = await supabaseServer
      .from("schedule_slots")
      .select("*", { count: "exact", head: true })
      .eq("class_id", classId);
    if (slotErr) throw slotErr;

    const { count: bookingCount, error: bookErr } = await supabaseServer
      .from("schedule_student")
      .select("student_id, slot:schedule_slots!inner(class_id)", {
        count: "exact",
        head: true,
      })
      .eq("slot.class_id", classId);
    if (bookErr) throw bookErr;

    // Siswa unik terdampak (paginasi, hanya kolom student_id).
    const studentSet = new Set<string>();
    const PAGE = 1000;
    for (let page = 0; ; page++) {
      const from = page * PAGE;
      const { data, error } = await supabaseServer
        .from("schedule_student")
        .select("student_id, slot:schedule_slots!inner(class_id)")
        .eq("slot.class_id", classId)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (data && data.length > 0) {
        for (const row of data) {
          const sid = (row as any).student_id;
          if (sid) studentSet.add(String(sid));
        }
      }
      if (!data || data.length < PAGE) break;
    }

    return {
      slots: slotCount || 0,
      bookings: bookingCount || 0,
      students: studentSet.size,
    };
  } catch (err) {
    console.warn("Exception fetching class deletion impact:", err);
    return null;
  }
}

export async function deleteLabel(id: string) {
  await requireUser();
  const supabaseServer = await createClient();
  const { error } = await supabaseServer.from("labels").delete().eq("id", id);

  if (error)
    throw new Error(
      "Gagal menghapus label. Pastikan tidak ada siswa yang menggunakan label ini.",
    );
  memoryLabelsCache = null;
  return true;
}

export async function getClassesWithSchedules() {
  await requireUser();
  const branchId = await getBranchId();
  if (!branchId) return [];

  const supabaseServer = await createClient();
  // 1. Fetch classes
  let classQuery = supabaseServer
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
  let slotQuery = supabaseServer
    .from("schedule_slots")
    .select(
      `
      id, class_id, date, time, is_locked,
      bookings:schedule_student(
        student_id,
        student:students(id, name, nickname, status, label_id, label:labels(id, main_level, sub_level, hex_color))
      )
    `,
    )
    .in("class_id", classIds)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  const { data: slots } = await slotQuery;

  // Siswa nonaktif tidak dihitung: jadwalnya hilang dari kuota dashboard
  const activeSlots = (slots || []).map((s: any) => ({
    ...s,
    bookings: (s.bookings || []).filter(
      (b: any) => b?.student?.status !== "INACTIVE",
    ),
  }));

  // 4. Group slots by class_id
  const slotMap: Record<string, any[]> = {};
  for (const s of activeSlots) {
    if (!slotMap[s.class_id]) slotMap[s.class_id] = [];
    slotMap[s.class_id].push(s);
  }

  // 5. Merge
  return classes.map((c) => ({
    ...c,
    schedules: slotMap[c.id] || [],
  }));
}

export async function getTeachers() {
  await requireUser();
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
  await requireUser();
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
  await requireUser();
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
  await requireUser();
  const supabaseServer = await createClient();
  const { error } = await supabaseServer.from("teachers").delete().eq("id", id);

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

// Kategori "materi" bersifat global (sama di semua cabang);
// kategori lainnya milik cabang yang sedang aktif.
function templateBranchId(category: string, branchId: string) {
  return category === "materi" ? null : branchId || null;
}

let memoryTemplatesCache: { data: any[]; timestamp: number } | null = null;
const TEMPLATES_CACHE_TTL = 5 * 60 * 1000; // 5 menit cache in-memory

export async function getAssessmentTemplates() {
  await requireUser();
  try {
    const supabaseServer = await createClient();
    const branchId = await getBranchId();

    let templates: any[] = [];
    if (
      memoryTemplatesCache &&
      Date.now() - memoryTemplatesCache.timestamp < TEMPLATES_CACHE_TTL
    ) {
      templates = memoryTemplatesCache.data;
    } else {
      const { data, error } = await supabaseServer
        .from("assessment_templates")
        .select("*, label:labels(id, main_level, sub_level, hex_color)")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Notice fetching assessment templates:", error.message);
        return [];
      }
      templates = data || [];
      memoryTemplatesCache = { data: templates, timestamp: Date.now() };
    }

    // Kategori "materi" global; kategori lain per-cabang agar editan
    // admin cabang tidak mempengaruhi cabang lainnya.
    if (branchId) {
      const isMateri = (t: any) => (t.category || "kegiatan") === "materi";
      const materiRows = templates.filter(isMateri);
      const branchRows = templates.filter(
        (t: any) => !isMateri(t) && t.branch_id === branchId,
      );
      const globalNonMateri = templates.filter(
        (t: any) => !isMateri(t) && !t.branch_id,
      );

      // Akses pertama: patenkan template global yang ada ke cabang ini
      if (branchRows.length === 0 && globalNonMateri.length > 0) {
        const clones = globalNonMateri.map((t: any) => ({
          branch_id: branchId,
          category: t.category,
          title: t.title,
          materi: t.materi,
          kegiatan: t.kegiatan,
          hasil_belajar: t.hasil_belajar,
          label_id: t.label_id || null,
          is_active: true,
        }));
        const { data: cloned, error: cloneError } = await supabaseServer
          .from("assessment_templates")
          .insert(clones)
          .select("*, label:labels(id, main_level, sub_level, hex_color)");
        if (!cloneError && cloned) {
          memoryTemplatesCache = null;
          return [...materiRows, ...cloned];
        }
        console.warn(
          "Notice pinning templates per branch:",
          cloneError?.message,
        );
        return [...materiRows, ...globalNonMateri];
      }

      return [...materiRows, ...branchRows];
    }

    return templates;
  } catch (err: any) {
    console.warn(
      "Exception fetching assessment templates:",
      err?.message || err,
    );
    return [];
  }
}

export async function createAssessmentTemplate(formData: FormData) {
  await requireUser();
  const category = (formData.get("category") as string) || "kegiatan";
  const title = formData.get("title") as string;
  const materi = (formData.get("materi") as string) || "";
  const kegiatan = (formData.get("kegiatan") as string) || "";
  const hasil_belajar = (formData.get("hasil_belajar") as string) || "";
  const labelIds = formData
    .getAll("label_id")
    .map((item) => String(item))
    .filter(Boolean);

  if (!title || !title.trim()) {
    throw new Error("Judul / Isi Template wajib diisi.");
  }

  const branchId = await getBranchId();
  const supabaseServer = await createClient();

  if (labelIds.length > 1) {
    const insertPayloads = labelIds.map((lId) => ({
      branch_id: templateBranchId(category, branchId),
      category: category,
      title: title.trim(),
      materi: materi.trim(),
      kegiatan: kegiatan.trim(),
      hasil_belajar: hasil_belajar.trim(),
      label_id: lId,
      is_active: true,
    }));

    let { error } = await supabaseServer
      .from("assessment_templates")
      .insert(insertPayloads);

    if (
      error &&
      (error.message?.toLowerCase().includes("label_id") ||
        error.code === "PGRST204" ||
        error.code === "42703")
    ) {
      const fallbackPayloads = insertPayloads.map(
        ({ label_id, ...rest }) => rest,
      );
      const retry = await supabaseServer
        .from("assessment_templates")
        .insert(fallbackPayloads);
      error = retry.error;
    }

    if (error) {
      console.error("Error creating assessment templates in batch:", error);
      throw new Error("Gagal membuat template: " + error.message);
    }
  } else {
    const singleLabelId = labelIds[0] || null;
    const insertPayload: any = {
      branch_id: templateBranchId(category, branchId),
      category: category,
      title: title.trim(),
      materi: materi.trim(),
      kegiatan: kegiatan.trim(),
      hasil_belajar: hasil_belajar.trim(),
      label_id: singleLabelId,
      is_active: true,
    };

    let { error } = await supabaseServer
      .from("assessment_templates")
      .insert(insertPayload);

    if (
      error &&
      (error.message?.toLowerCase().includes("label_id") ||
        error.code === "PGRST204" ||
        error.code === "42703")
    ) {
      delete insertPayload.label_id;
      const retry = await supabaseServer
        .from("assessment_templates")
        .insert(insertPayload);
      error = retry.error;
    }

    if (error) {
      console.error("Error creating assessment template:", error);
      throw new Error("Gagal membuat template: " + error.message);
    }
  }

  memoryTemplatesCache = null;
  revalidatePath("/templates");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

export async function updateAssessmentTemplate(id: string, formData: FormData) {
  await requireUser();
  const category = (formData.get("category") as string) || "kegiatan";
  const title = formData.get("title") as string;
  const materi = (formData.get("materi") as string) || "";
  const kegiatan = (formData.get("kegiatan") as string) || "";
  const hasil_belajar = (formData.get("hasil_belajar") as string) || "";
  const labelIds = formData
    .getAll("label_id")
    .map((item) => String(item))
    .filter(Boolean);
  const idsToDelete = formData
    .getAll("ids")
    .map((item) => String(item))
    .filter(Boolean);

  if (!title || !title.trim()) {
    throw new Error("Judul / Isi Template wajib diisi.");
  }

  const branchId = await getBranchId();
  const supabaseServer = await createClient();

  // Delete all existing grouped records first
  const targetIds = idsToDelete.length > 0 ? idsToDelete : [id];
  await supabaseServer
    .from("assessment_templates")
    .delete()
    .in("id", targetIds);

  // Re-insert template records for selected level IDs
  if (labelIds.length > 1) {
    const insertPayloads = labelIds.map((lId) => ({
      branch_id: templateBranchId(category, branchId),
      category: category,
      title: title.trim(),
      materi: materi.trim(),
      kegiatan: kegiatan.trim(),
      hasil_belajar: hasil_belajar.trim(),
      label_id: lId,
      is_active: true,
    }));

    let { error } = await supabaseServer
      .from("assessment_templates")
      .insert(insertPayloads);

    if (
      error &&
      (error.message?.toLowerCase().includes("label_id") ||
        error.code === "PGRST204" ||
        error.code === "42703")
    ) {
      const fallbackPayloads = insertPayloads.map(
        ({ label_id, ...rest }) => rest,
      );
      const retry = await supabaseServer
        .from("assessment_templates")
        .insert(fallbackPayloads);
      error = retry.error;
    }

    if (error) {
      console.error("Error updating assessment templates:", error);
      throw new Error("Gagal memperbarui template: " + error.message);
    }
  } else {
    const singleLabelId = labelIds[0] || null;
    const insertPayload: any = {
      branch_id: templateBranchId(category, branchId),
      category: category,
      title: title.trim(),
      materi: materi.trim(),
      kegiatan: kegiatan.trim(),
      hasil_belajar: hasil_belajar.trim(),
      label_id: singleLabelId,
      is_active: true,
    };

    let { error } = await supabaseServer
      .from("assessment_templates")
      .insert(insertPayload);

    if (
      error &&
      (error.message?.toLowerCase().includes("label_id") ||
        error.code === "PGRST204" ||
        error.code === "42703")
    ) {
      delete insertPayload.label_id;
      const retry = await supabaseServer
        .from("assessment_templates")
        .insert(insertPayload);
      error = retry.error;
    }

    if (error) {
      console.error("Error updating assessment template:", error);
      throw new Error("Gagal memperbarui template: " + error.message);
    }
  }

  memoryTemplatesCache = null;
  revalidatePath("/templates");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

export async function deleteAssessmentTemplate(idOrIds: string | string[]) {
  await requireUser();
  const supabaseServer = await createClient();
  const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

  const { error } = await supabaseServer
    .from("assessment_templates")
    .delete()
    .in("id", ids);

  if (error) {
    console.error("Error deleting assessment template:", error);
    throw new Error("Gagal menghapus template: " + error.message);
  }

  memoryTemplatesCache = null;
  revalidatePath("/templates");
  revalidatePath("/worksheets");
  revalidatePath("/master");
  return true;
}

/**
 * Mengambil dokumen Peraturan Siswa terbaru (dipakai dashboard & portal ortu)
 */
export async function getStudentRulesDocument() {
  try {
    const supabaseServer = await createClient();
    const { data, error } = await supabaseServer
      .from("student_rules_documents")
      .select("id, file_url, file_name, uploaded_at")
      .order("uploaded_at", { ascending: false })
      .limit(1);

    if (error) {
      console.warn(
        "Notice fetching student rules document:",
        error.message || error,
      );
      return null;
    }
    return data?.[0] || null;
  } catch (e: any) {
    console.warn("Exception fetching student rules document:", e?.message || e);
    return null;
  }
}

/**
 * Mengambil semua dokumen Upload File PDF, urut dari yang terbaru (dipakai dashboard)
 */
export async function getStudentRulesDocuments() {
  try {
    // Dokumen peraturan dibaca dashboard (admin) DAN portal ortu (tanpa sesi
    // Supabase), jadi pakai service role. Isinya metadata file publik yang
    // memang ditampilkan ke orang tua.
    const supabaseServer = getAdminClient();
    const { data, error } = await supabaseServer
      .from("student_rules_documents")
      .select("id, file_url, file_name, uploaded_at")
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.warn(
        "Notice fetching student rules documents:",
        error.message || error,
      );
      return [];
    }
    return data || [];
  } catch (e: any) {
    console.warn(
      "Exception fetching student rules documents:",
      e?.message || e,
    );
    return [];
  }
}

/**
 * Menyimpan dokumen Peraturan Siswa baru (admin mengunggah via Google Drive)
 */
export async function saveStudentRulesDocument(
  fileUrl: string,
  fileName: string,
) {
  await requireUser();
  try {
    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Sesi admin tidak ditemukan. Silakan login ulang.",
      };
    }

    const { data, error } = await supabaseServer
      .from("student_rules_documents")
      .insert({
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by: user.id,
      })
      .select("id, file_url, file_name, uploaded_at")
      .single();

    if (error) {
      console.error("Error saving student rules document:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/portal-ortu/dashboard");
    return { success: true, data };
  } catch (e: any) {
    console.error("Error saving student rules document:", e);
    return {
      success: false,
      error: e.message || "Gagal menyimpan dokumen peraturan",
    };
  }
}

/**
 * Mengubah nama dokumen Upload File PDF
 */
export async function renameStudentRulesDocument(id: string, newName: string) {
  await requireUser();
  try {
    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Sesi admin tidak ditemukan. Silakan login ulang.",
      };
    }

    const { data, error } = await supabaseServer
      .from("student_rules_documents")
      .update({ file_name: newName })
      .eq("id", id)
      .select("id, file_url, file_name, uploaded_at")
      .maybeSingle();

    if (error) {
      console.error("Error renaming student rules document:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return {
        success: false,
        error:
          "Rename gagal: policy UPDATE belum ada di Supabase. Jalankan ulang file supabase/student_rules_documents.sql di Supabase SQL Editor.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/portal-ortu/dashboard");
    return { success: true, data };
  } catch (e: any) {
    console.error("Error renaming student rules document:", e);
    return {
      success: false,
      error: e.message || "Gagal mengubah nama dokumen",
    };
  }
}

/**
 * Menghapus dokumen Peraturan Siswa
 */
export async function deleteStudentRulesDocument(id: string) {
  await requireUser();
  try {
    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Sesi admin tidak ditemukan. Silakan login ulang.",
      };
    }

    const { error } = await supabaseServer
      .from("student_rules_documents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting student rules document:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/portal-ortu/dashboard");
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting student rules document:", e);
    return {
      success: false,
      error: e.message || "Gagal menghapus dokumen peraturan",
    };
  }
}

/**
 * Mengambil daftar dokumen Kurikulum (superadmin & branch admin)
 */
export async function getCurriculumDocuments() {
  await requireUser();
  try {
    const supabaseServer = await createClient();
    const { data, error } = await supabaseServer
      .from("curriculum_documents")
      .select("id, file_url, file_name, uploaded_at")
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.warn(
        "Notice fetching curriculum documents:",
        error.message || error,
      );
      return [];
    }
    return data || [];
  } catch (e: any) {
    console.warn("Exception fetching curriculum documents:", e?.message || e);
    return [];
  }
}

/**
 * Menyimpan dokumen Kurikulum baru — khusus SUPERADMIN
 */
export async function saveCurriculumDocument(
  fileUrl: string,
  fileName: string,
) {
  await requireUser();
  try {
    const role = await getCurrentUserRole();
    if (role !== "SUPERADMIN") {
      return {
        success: false,
        error: "Hanya Superadmin yang dapat mengunggah dokumen kurikulum.",
      };
    }

    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Sesi admin tidak ditemukan. Silakan login ulang.",
      };
    }

    const { data, error } = await supabaseServer
      .from("curriculum_documents")
      .insert({
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by: user.id,
      })
      .select("id, file_url, file_name, uploaded_at")
      .single();

    if (error) {
      console.error("Error saving curriculum document:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (e: any) {
    console.error("Error saving curriculum document:", e);
    return {
      success: false,
      error: e.message || "Gagal menyimpan dokumen kurikulum",
    };
  }
}

/**
 * Mengubah nama dokumen Kurikulum — khusus SUPERADMIN
 */
export async function renameCurriculumDocument(id: string, newName: string) {
  await requireUser();
  try {
    const role = await getCurrentUserRole();
    if (role !== "SUPERADMIN") {
      return {
        success: false,
        error: "Hanya Superadmin yang dapat mengubah nama dokumen kurikulum.",
      };
    }

    const supabaseServer = await createClient();
    const { data, error } = await supabaseServer
      .from("curriculum_documents")
      .update({ file_name: newName })
      .eq("id", id)
      .select("id, file_url, file_name, uploaded_at")
      .maybeSingle();

    if (error) {
      console.error("Error renaming curriculum document:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return {
        success: false,
        error:
          "Rename gagal: policy UPDATE belum ada di Supabase. Jalankan file supabase/curriculum_documents.sql di Supabase SQL Editor.",
      };
    }

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (e: any) {
    console.error("Error renaming curriculum document:", e);
    return {
      success: false,
      error: e.message || "Gagal mengubah nama dokumen kurikulum",
    };
  }
}

/**
 * Menghapus dokumen Kurikulum — khusus SUPERADMIN
 */
export async function deleteCurriculumDocument(id: string) {
  await requireUser();
  try {
    const role = await getCurrentUserRole();
    if (role !== "SUPERADMIN") {
      return {
        success: false,
        error: "Hanya Superadmin yang dapat menghapus dokumen kurikulum.",
      };
    }

    const supabaseServer = await createClient();
    const { error } = await supabaseServer
      .from("curriculum_documents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting curriculum document:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting curriculum document:", e);
    return {
      success: false,
      error: e.message || "Gagal menghapus dokumen kurikulum",
    };
  }
}
