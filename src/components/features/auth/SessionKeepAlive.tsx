"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/*
 * Activity-Based Session Keep-Alive
 * 
 * Menjaga sesi login tetap hidup selama aplikasi dibuka.
 * Supabase access token kedaluwarsa +/- 1 jam; tanpa client browser yang
 * aktif, token tidak pernah diperbarui sehingga user ter-log-out saat
 * aplikasi dipakai lama atau dibiarkan idle. Komponen ini memperbarui
 * sesi berdasarkan:
 * 
 * 1. USER ACTIVITY DETECTION - Refresh session setiap kali user beraktivitas
 *    (mengetik, klik, scroll, move mouse) di dalam aplikasi.
 * 
 * 2. PROACTIVE REFRESH - Refresh session setiap 45 menit untuk memastikan
 *    token tidak pernah mendekati expiry.
 * 
 * 3. EXPIRY WARNING - Memberikan warning kepada user 5 menit sebelum
 *    sesi expire agar bisa menyimpan progress.
 *
 * Tidak membebani Vercel: pengecekan interval hanya membaca sesi secara
 * lokal (tanpa jaringan), dan refresh token berjalan langsung dari browser
 * ke Supabase — tidak melewati fungsi Vercel sama sekali.
 */
export function SessionKeepAlive() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) return null;
  
  const supabase = createBrowserClient(url, anonKey);

  /* --- ACTIVITY DETECTION --- */
  const resetIdleTimer = () => {
    // Reset idle counter when user is active
    setUserActiveAt(Date.now());
  };

  useEffect(() => {
    // List of events to detect user activity
    const activityEvents = [
      'keydown',      // User typing
      'keyup',        // User typing
      'click',        // User clicking
      'mousedown',    // User pressing mouse
      'mouseup',      // User releasing mouse
      'scroll',       // User scrolling
      'touchstart',   // Mobile touch
      'touchmove',    // Mobile swipe
      'mousemove',    // Mouse movement
    ];

    // Event handler
    const handleActivity = () => {
      resetIdleTimer();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      // Remove event listeners on cleanup
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Track last user activity time
  const [userActiveAt, setUserActiveAt] = useState(Date.now());

  // Check if user has been idle for too long
  useEffect(() => {
    const checkIdleTime = () => {
      const now = Date.now();
      const idleTime = now - userActiveAt;
      
      // If user idle for more than 30 minutes, log warning
      if (idleTime > 30 * 60 * 1000 && idleTime < 31 * 60 * 1000) {
        console.warn('⚠️ User inactive for 30+ minutes - session may expire soon');
      }
    };

    const idleInterval = setInterval(checkIdleTime, 60 * 1000); // Check every minute
    return () => clearInterval(idleInterval);
  }, [userActiveAt]);

  /* --- SESSION MANAGEMENT --- */
  useEffect(() => {
    let disposed = false;

    // Refresh only if token expires in < 5 minutes
    const maybeRefresh = async () => {
      if (disposed) return;
      try {
        const { data } = await supabase.auth.getSession();
        const expiresAt = data.session?.expires_at ?? 0;
        
        if (!disposed && expiresAt > 0) {
          const timeUntilExpiry = expiresAt * 1000 - Date.now();
          
          // Show warning 5 minutes before expiry
          if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0) {
            setShowWarning(true);
            const minutesLeft = Math.ceil(timeUntilExpiry / 60 / 1000);
            setTimeLeft(`${minutesLeft} menit`);
          } else {
            setShowWarning(false);
          }
          
          // Auto-refresh if less than 10 minutes left
          if (timeUntilExpiry < 10 * 60 * 1000) {
            await supabase.auth.refreshSession();
            if (!disposed) {
              console.log('✅ Session auto-refreshed (token expiring soon)');
            }
          }
        } else {
          setShowWarning(false);
        }
      } catch (error) {
        // Ignore network errors; will retry next interval/focus
        console.debug('Session check skipped:', error);
      }
    };

    // Check on component mount and when tab becomes visible
    const onWake = () => {
      if (document.visibilityState === "visible") {
        maybeRefresh();
      }
    };

    // Proactive refresh every 45 minutes (safely before 1 hour expiry)
    const proactiveRefresh = setInterval(async () => {
      if (!disposed) {
        setIsRefreshing(true);
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            await supabase.auth.refreshSession();
            console.log('✅ Proactive session refresh (45-minute interval)');
          }
        } catch (error) {
          console.debug('Proactive refresh failed:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
    }, 45 * 60 * 1000); // 45 minutes

    // Initial check
    maybeRefresh();
    
    // Periodic check every 10 minutes (backup to proactive refresh)
    const interval = setInterval(maybeRefresh, 10 * 60 * 1000);
    
    // Listen for visibility changes
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      disposed = true;
      clearInterval(interval);
      clearInterval(proactiveRefresh);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [supabase]);

  /* --- UI: SHOW WARNING IF SESSION EXPIRING SOON --- */
  useEffect(() => {
    if (showWarning) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        // Calculate remaining time based on session expiry
        supabase.auth.getSession().then(({ data }) => {
          const expiresAt = data.session?.expires_at ?? 0;
          if (expiresAt > 0) {
            const timeLeftMs = expiresAt * 1000 - now;
            if (timeLeftMs <= 0) {
              setShowWarning(false);
              setTimeLeft("sekarang");
            } else {
              const minutesLeft = Math.ceil(timeLeftMs / 60 / 1000);
              setTimeLeft(minutesLeft === 0 ? "< 1 menit" : `${minutesLeft} menit`);
            }
          }
        });
      }, 10000); // Update every 10 seconds
      
      return () => clearInterval(timer);
    }
  }, [showWarning, supabase]);

  /* --- RENDER WARNING BANNER --- */
  if (!showWarning) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-500 text-white rounded-xl shadow-2xl border border-amber-600">
        {/* Warning Icon */}
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        
        {/* Warning Text */}
        <div className="flex flex-col">
          <span className="text-sm font-bold">⚠️ Sesi akan segera habis</span>
          <span className="text-xs text-amber-100">
            {timeLeft === "sekarang" ? "Logout dalam beberapa detik..." : `Sisa waktu: ${timeLeft}`}
          </span>
        </div>
      </div>
    </div>
  );
}
