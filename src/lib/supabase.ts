// ⚠️ DEPRECATED (03/11/2026): jangan pakai modul ini untuk query server.
// Setelah RLS diketatkan, anon key tidak boleh lagi membaca/menulis tabel admin.
//   - Server tanpa sesi  → pakai `@/lib/supabase/admin` (getAdminClient).
//   - Server dengan sesi → pakai `@/lib/supabase/server` (createClient).
//   - Browser            → pakai `@supabase/ssr` createBrowserClient.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

// Export the createClient function for use in client components
export { createClient };

export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are not set. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.",
    );
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    });
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient();
    return (client as any)[prop];
  },
});
