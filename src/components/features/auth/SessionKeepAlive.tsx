"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

/*
 * Menjaga sesi login tetap hidup selama aplikasi terbuka.
 * Supabase access token kedaluwarsa +/- 1 jam; tanpa client browser yang
 * aktif, token tidak pernah diperbarui sehingga user ter-log-out saat
 * aplikasi dipakai lama atau dibiarkan idle. Komponen ini memperbarui
 * sesi sebelum token kedaluwarsa (periodik + saat tab aktif kembali).
 *
 * Tidak membebani Vercel: pengecekan interval hanya membaca sesi secara
 * lokal (tanpa jaringan), dan refresh token berjalan langsung dari browser
 * ke Supabase — tidak melewati fungsi Vercel sama sekali.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return;

    const supabase = createBrowserClient(url, anonKey);
    let disposed = false;

    // Refresh hanya jika token kedaluwarsa dalam < 5 menit,
    // supaya tidak memutar ulang token secara berlebihan.
    const maybeRefresh = async () => {
      if (disposed) return;
      try {
        const { data } = await supabase.auth.getSession();
        const expiresAt = data.session?.expires_at ?? 0;
        if (
          !disposed &&
          expiresAt > 0 &&
          expiresAt * 1000 < Date.now() + 5 * 60 * 1000
        ) {
          await supabase.auth.refreshSession();
        }
      } catch {
        // Abaikan error jaringan sesaat; dicoba lagi di interval/focus berikutnya.
      }
    };

    // Saat tab dibuka kembali setelah lama idle, perbarui sebelum request lain.
    const onWake = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };

    maybeRefresh();
    const interval = setInterval(maybeRefresh, 10 * 60 * 1000);
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  return null;
}
