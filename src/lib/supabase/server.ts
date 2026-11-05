import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// Deduplikasi instance SupabaseClient per-request (render / Server Action)
// agar panggilan paralel tidak merotasi refresh_token secara ganda.
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            const rememberMe = cookieStore.get('remember_me')?.value !== 'false';
            cookiesToSet.forEach(({ name, value, options }) => {
              if (!rememberMe) {
                delete options.maxAge;
                delete options.expires;
              }
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch: async (url, options) => {
          let retries = 2;
          while (retries > 0) {
            try {
              return await fetch(url, options);
            } catch (err: any) {
              const isNetErr =
                err?.code === "ECONNRESET" ||
                err?.message?.includes("ECONNRESET") ||
                err?.message?.includes("terminated") ||
                err?.message?.includes("fetch failed");
              if (isNetErr && retries > 1) {
                retries--;
                await new Promise((r) => setTimeout(r, 200));
                continue;
              }
              throw err;
            }
          }
          return await fetch(url, options);
        },
      },
    }
  )
})
