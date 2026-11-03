// =========================================================
// Admin client (service role) — HANYA UNTUK SERVER
// =========================================================
// Dipakai oleh kode server yang memang berjalan tanpa sesi Supabase:
// cron harian, web push, portal orang tua, dan API route tertentu.
//
// JANGAN pernah mengimpor file ini dari komponen "use client".
// Service role key melewati Row Level Security, sehingga pemakaiannya
// wajib disertai validasi pemanggil (requireUser / requireUserOrParent).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getAdminClient() hanya boleh dipakai di server.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Env Supabase belum lengkap: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.",
    );
  }

  if (!_admin) {
    _admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    });
  }

  return _admin;
}
