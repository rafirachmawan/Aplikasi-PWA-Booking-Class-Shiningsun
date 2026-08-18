"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { setSuperadminBranch } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Branch {
  id: string;
  name: string;
}

export function BranchSelector({
  branches,
  currentBranchId,
}: {
  branches: Branch[];
  currentBranchId: string;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedId, setSelectedId] = useState(currentBranchId);

  // Custom dropdown state (pola sama dengan dropdown lain di aplikasi)
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state if props change (misalnya karena routing ulang)
  useEffect(() => {
    setSelectedId(currentBranchId);
  }, [currentBranchId]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const filteredBranches = search.trim()
    ? branches.filter((b) =>
        b.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : branches;

  const selectedBranch = branches.find((b) => b.id === selectedId);

  // Logika pemilihan cabang tetap sama seperti sebelumnya —
  // hanya UI dropdown yang diganti.
  const selectBranch = async (newBranchId: string) => {
    setIsOpen(false);
    setSelectedId(newBranchId);
    setIsUpdating(true);

    if (newBranchId === "") {
      // Reset ke netral: hapus cookie
      const { clearSuperadminBranch } = await import("@/lib/actions");
      await clearSuperadminBranch();
    } else {
      // Set cookie ke cabang terpilih
      await setSuperadminBranch(newBranchId);
    }

    // Refresh page fully to update all server components
    router.refresh();
    setTimeout(() => {
      setIsUpdating(false);
    }, 1000);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {isUpdating && <LoadingSpinner usePortal={true} />}
      <div className="relative w-full">
        {/* Trigger Button */}
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white shadow-xs transition-all cursor-pointer disabled:opacity-60 ${
            isOpen
              ? "border-brand-500 ring-2 ring-brand-500/30 bg-white dark:bg-slate-900"
              : "border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span
            className={`truncate text-left ${
              selectedBranch
                ? ""
                : "text-slate-500 dark:text-slate-400 font-medium"
            }`}
          >
            {selectedBranch ? selectedBranch.name : "-- Pilih Cabang --"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180 text-brand-500" : ""
            }`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {/* Floating Menu Popover */}
        {isOpen && (
          <>
            {/* Invisible Backdrop (tanpa blur/gelap — halaman tetap normal) */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Popover Container */}
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {/* Search */}
              <div className="p-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari cabang..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1">
                {/* Reset / netral */}
                <button
                  type="button"
                  onClick={() => selectBranch("")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    selectedId === ""
                      ? "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold border border-brand-200/60 dark:border-brand-800/40"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <span className="truncate text-left">-- Pilih Cabang --</span>
                  {selectedId === "" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-brand-600 dark:text-brand-400 shrink-0 ml-2"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>

                {filteredBranches.map((b) => {
                  const isSelected = b.id === selectedId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectBranch(b.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold border border-brand-200/60 dark:border-brand-800/40"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 text-left">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">
                          🏫
                        </span>
                        <span className="truncate font-semibold text-slate-900 dark:text-white">
                          {b.name}
                        </span>
                      </div>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-brand-600 dark:text-brand-400 shrink-0 ml-2"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}

                {filteredBranches.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 text-center font-medium">
                    Cabang tidak ditemukan.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
