"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface NoBranchSelectedProps {
  pageName?: string;
}

export function NoBranchSelected({
  pageName = "halaman ini",
}: NoBranchSelectedProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = () => {
    setIsNavigating(true);
    router.push("/dashboard");
  };

  return (
    <>
      {isNavigating && <LoadingSpinner usePortal={true} />}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-3xl bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-16 flex flex-col items-center justify-center text-center min-h-[50vh]">
          {/* Icon */}
          <div className="rounded-2xl p-4 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 mb-6">
            <svg
              className="h-10 w-10 text-amber-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M3.6 15.4l7-12.1a1.6 1.6 0 0 1 2.8 0l7 12.1a1.6 1.6 0 0 1-1.4 2.4H5a1.6 1.6 0 0 1-1.4-2.4z" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Belum Memilih Cabang
          </h3>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
            Untuk mengakses{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {pageName}
            </span>
            , silakan pilih cabang terlebih dahulu melalui Dashboard.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleClick}
            disabled={isNavigating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 hover:bg-brand-700 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {isNavigating
              ? "Menuju Dashboard..."
              : "Ke Dashboard & Pilih Cabang"}
          </button>
        </div>
      </div>
    </>
  );
}
