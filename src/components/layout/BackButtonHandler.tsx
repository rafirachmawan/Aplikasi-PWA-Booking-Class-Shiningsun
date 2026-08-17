"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function BackButtonHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isHandlingRef = useRef(false);
  const hasJustMountedRef = useRef(false);

  useEffect(() => {
    // Save last visited page when navigating away
    if (!hasJustMountedRef.current && !isLoggingOut) {
      try {
        window.history.pushState(
          { trapped: true, path: pathname },
          "",
          window.location.href,
        );
        sessionStorage.setItem("lastVisitedPage", pathname);
      } catch (e) {
        // Ignore in strict webview environments
      }
    }
    hasJustMountedRef.current = false;
  }, [pathname, isLoggingOut]);

  // On first mount, check if there's a saved page and restore it
  useEffect(() => {
    if (hasJustMountedRef.current) return;

    try {
      const lastVisited = sessionStorage.getItem("lastVisitedPage");
      // If we're not on dashboard and there's a saved page, redirect to it
      if (lastVisited && lastVisited !== "/dashboard" && pathname === "/") {
        router.push(lastVisited);
        router.refresh();
        return;
      }
    } catch (e) {}

    // Reset flag
    setTimeout(() => {
      hasJustMountedRef.current = true;
    }, 0);
  }, []);

  // Handle popstate event
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isHandlingRef.current) return;
      isHandlingRef.current = true;

      if (pathname !== "/dashboard") {
        // Any subpage (e.g. /worksheets, /schedule, /students, etc.) -> Back button redirects to /dashboard
        router.push("/dashboard");
        setTimeout(() => {
          isHandlingRef.current = false;
        }, 400);
      } else {
        // On /dashboard -> Back button shows Exit Confirmation Modal
        try {
          window.history.pushState(
            { trapped: true, path: "/dashboard" },
            "",
            "/dashboard",
          );
        } catch (err) {}
        setShowExitModal(true);
        setTimeout(() => {
          isHandlingRef.current = false;
        }, 400);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname, router]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { logout } = await import("@/lib/authActions");
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
      setShowExitModal(false);
    }
  };

  const handleCancelLogout = () => {
    setShowExitModal(false);
  };

  return (
    <>
      {isLoggingOut && <LoadingSpinner usePortal={true} />}

      {showExitModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCancelLogout}
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10 mb-4 text-red-600 dark:text-red-400 shadow-xs">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Konfirmasi Keluar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin keluar dari aplikasi ShiningSun? Anda
                harus login kembali untuk masuk.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancelLogout}
                disabled={isLoggingOut}
                className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="w-full px-4 py-2.5 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isLoggingOut ? "Keluar..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
