"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

// Cache per-request: dipanggil berkali-kali dalam 1 render (layout + page +
// tiap fungsi data). Tanpa cache, tiap panggilan = auth.getUser + select users.
// cache() tidak mengubah logika/hasil, hanya mendedup query yang sama.
export const getCurrentUserRole = cache(async (): Promise<string | null> => {
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
});

export async function setSuperadminBranch(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set("superadmin_branch_id", branchId, { path: "/" });
}

export async function clearSuperadminBranch() {
  const cookieStore = await cookies();
  cookieStore.delete("superadmin_branch_id");
}

// Cache per-request: logika & return value identik, hanya didedup per render.
export const getBranchId = cache(async (): Promise<string> => {
  try {
    const supabaseServer = await createClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      // Tidak ada sesi → tidak ada cabang. Jangan pernah menebak cabang
      // default: RLS kini menolak akses anon, jadi data memang harus kosong.
      return "";
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

        // Fallback: jika tidak cocok, gunakan cabang pertama yang tersedia
        // agar data BRANCH_ADMIN tidak tercampur lintas unit
        if (branches.length > 0) {
          return branches[0].id;
        }
      }
    }

    // Fallback terakhir: ambil cabang pertama yang aktif agar data tidak tercampur
    const { data: firstBranch } = await supabaseServer
      .from("branches")
      .select("id")
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .single();
    if (firstBranch) {
      return firstBranch.id;
    }

    return "ALL";
  } catch (err) {
    return "ALL";
  }
});

export const getActiveBranchName = cache(async (): Promise<string | null> => {
  const branchId = await getBranchId();
  if (!branchId || branchId === "ALL") return null;

  const supabaseServer = await createClient();
  const { data } = await supabaseServer
    .from("branches")
    .select("name")
    .eq("id", branchId)
    .single();

  return data?.name || null;
});

export const getBranches = cache(async () => {
  const supabaseServer = await createClient();
  // Hemat Origin (tanpa ubah logika/data): UI hanya pakai id+name
  // (dashboard, BranchSelector, portal-ortu). Filter + order sama.
  const { data, error } = await supabaseServer
    .from("branches")
    .select("id,name")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
  return data;
});

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

// =========================================
// ACCOUNT MANAGEMENT ACTIONS (SUPERADMIN)
// =========================================

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

  const supabaseServer = await createClient();
  const { data, error } = await supabaseServer
    .from("users")
    .select("id, name, email, role, branch_id, created_at, branch:branches(name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  // Bentuk data sama seperti sebelumnya (termasuk branch), hanya kolom
  // sensitif seperti password tidak lagi ikut terkirim ke browser.
  return (data || []).map((u) => ({
    ...u,
    branch: Array.isArray(u.branch) ? (u.branch[0] ?? null) : u.branch,
  }));
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

// Global in-memory cache fallback for module lock passwords
let memoryLockPasswords: Record<string, string> = {
  "/points": "123",
};

// Cache per-request: bacaan murni (cookie + memory + system_settings) yang
// hasilnya deterministik dalam 1 request. Tanpa cache, Sidebar +
// QuickAccessLinks + Points masing-masing memicu roundtrip server sendiri
// untuk data 1 baris yang sama. Logika & return value identik.
export const getModuleLockPasswords = cache(async (): Promise<
  Record<string, string>
> => {
  const result: Record<string, string> = {
    ...memoryLockPasswords,
  };

  // 1. Try reading from cookie fallback
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get("module_lock_passwords")?.value;
    if (cookieVal) {
      const parsed = JSON.parse(cookieVal);
      Object.assign(result, parsed);
      Object.assign(memoryLockPasswords, parsed);
    }
  } catch {
    // Ignore cookie error
  }

  // 2. Try fetching from Supabase system_settings table if present
  try {
    const supabaseServer = await createClient();
    const { data, error } = await supabaseServer
      .from("system_settings")
      .select("key, value")
      .like("key", "lock_password_%");

    if (!error && data && data.length > 0) {
      data.forEach((item: { key: string; value: string }) => {
        if (item.key === "lock_password_points") result["/points"] = item.value;
        if (item.key === "lock_password_worksheets")
          result["/worksheets"] = item.value;
        if (item.key === "lock_password_teachers")
          result["/teachers"] = item.value;
        if (item.key === "lock_password_templates")
          result["/templates"] = item.value;
      });
      Object.assign(memoryLockPasswords, result);
    }
  } catch {
    // Graceful fallback when table doesn't exist
  }

  return result;
});

export async function updateModuleLockPassword(
  routeKey: string,
  newPassword: string,
) {
  const cleanPass = newPassword ? newPassword.trim() : "";
  memoryLockPasswords[routeKey] = cleanPass;

  // 1. Store in server cookie fallback
  try {
    const cookieStore = await cookies();
    let currentCookies: Record<string, string> = {};
    const rawCookie = cookieStore.get("module_lock_passwords")?.value;
    if (rawCookie) {
      try {
        currentCookies = JSON.parse(rawCookie);
      } catch {}
    }
    currentCookies[routeKey] = cleanPass;
    cookieStore.set("module_lock_passwords", JSON.stringify(currentCookies), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
    });
  } catch (e) {
    console.error("Cookie write error:", e);
  }

  // 2. Try updating database system_settings table if available
  try {
    const dbKeyMap: Record<string, string> = {
      "/points": "lock_password_points",
      "/worksheets": "lock_password_worksheets",
      "/teachers": "lock_password_teachers",
      "/templates": "lock_password_templates",
    };

    const keyName =
      dbKeyMap[routeKey] || `lock_password_${routeKey.replace("/", "")}`;
    const supabaseServer = await createClient();

    const { error } = await supabaseServer.from("system_settings").upsert(
      {
        key: keyName,
        value: cleanPass,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) {
      console.warn(
        "system_settings table unavailable, saved to cookie/memory fallback:",
        error.message,
      );
    }
  } catch (e: any) {
    console.warn("DB error fallback:", e?.message);
  }

  return true;
}

// ============================================
// PERATURAN SISWA (Dokumen PDF)
// ============================================
