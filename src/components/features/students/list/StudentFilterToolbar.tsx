"use client";

// Dipisahkan dari StudentClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, RefObject, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface StudentFilterToolbarProps {
  activeTab: string;
  dropdownRef: RefObject<HTMLDivElement | null>;
  genderDropdownRef: RefObject<HTMLDivElement | null>;
  genderOptions: { value: string; label: string; }[];
  isGenderOpen: boolean;
  isLevelOpen: boolean;
  isStatusOpen: boolean;
  labels: any[];
  levelSearch: string;
  searchQuery: string;
  selectedGender: string;
  selectedLabelId: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  setIsGenderOpen: Dispatch<SetStateAction<boolean>>;
  setIsLevelOpen: Dispatch<SetStateAction<boolean>>;
  setIsStatusOpen: Dispatch<SetStateAction<boolean>>;
  setLevelSearch: Dispatch<SetStateAction<string>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedGender: Dispatch<SetStateAction<string>>;
  setSelectedLabelId: Dispatch<SetStateAction<string>>;
  statusDropdownRef: RefObject<HTMLDivElement | null>;
  statusOptions: { value: string; label: string; }[];
}

export function StudentFilterToolbar({
  activeTab,
  dropdownRef,
  genderDropdownRef,
  genderOptions,
  isGenderOpen,
  isLevelOpen,
  isStatusOpen,
  labels,
  levelSearch,
  searchQuery,
  selectedGender,
  selectedLabelId,
  setActiveTab,
  setIsGenderOpen,
  setIsLevelOpen,
  setIsStatusOpen,
  setLevelSearch,
  setSearchQuery,
  setSelectedGender,
  setSelectedLabelId,
  statusDropdownRef,
  statusOptions,
}: StudentFilterToolbarProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm space-y-3.5">
      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Icons.search
            className="h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors h-11"
          placeholder="Cari nama siswa..."
          aria-label="Cari nama siswa"
        />
      </div>

      {/* Grid Filters: Level, Gender & Status Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Level Dropdown (Custom) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              if (!isLevelOpen) setLevelSearch("");
              setIsLevelOpen(!isLevelOpen);
            }}
            className={`w-full flex items-center rounded-xl border bg-slate-50 dark:bg-zinc-800 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer h-11 text-left ${
              isLevelOpen
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "border-slate-200 dark:border-zinc-700"
            }`}
          >
            <span className="truncate">
              {selectedLabelId
                ? (() => {
                    const l = labels.find((x) => x.id === selectedLabelId);
                    return l
                      ? `${l.main_level} - ${l.sub_level}`
                      : "Semua Level / Tingkat";
                  })()
                : "Semua Level / Tingkat"}
            </span>
          </button>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icons.settings
              className="h-4 w-4 text-brand-500"
              aria-hidden="true"
            />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isLevelOpen ? "rotate-180 text-brand-500" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Floating Menu Popover */}
          {isLevelOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
              <div className="p-1">
                <input
                  type="text"
                  value={levelSearch}
                  onChange={(e) => setLevelSearch(e.target.value)}
                  placeholder="Cari level..."
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLabelId("");
                    setIsLevelOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    selectedLabelId === ""
                      ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50"
                      : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`truncate text-left font-semibold ${
                      selectedLabelId === ""
                        ? "text-brand-700 dark:text-brand-300"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    Semua Level / Tingkat
                  </span>
                  {selectedLabelId === "" && (
                    <svg
                      className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                {labels
                  .filter((l) =>
                    levelSearch.trim()
                      ? `${l.main_level} - ${l.sub_level}`
                          .toLowerCase()
                          .includes(levelSearch.trim().toLowerCase())
                      : true,
                  )
                  .map((label) => {
                    const isSelected = label.id === selectedLabelId;
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => {
                          setSelectedLabelId(label.id);
                          setIsLevelOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50"
                            : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`truncate text-left font-semibold ${
                            isSelected
                              ? "text-brand-700 dark:text-brand-300"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {label.main_level} - {label.sub_level}
                        </span>
                        {isSelected && (
                          <svg
                            className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}

                {labels.every(
                  (l) =>
                    levelSearch.trim() &&
                    !`${l.main_level} - ${l.sub_level}`
                      .toLowerCase()
                      .includes(levelSearch.trim().toLowerCase()),
                ) && (
                  <p className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center font-medium">
                    Level tidak ditemukan.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Gender Dropdown (Custom, selaras dengan Level) */}
        <div className="relative" ref={genderDropdownRef}>
          <button
            type="button"
            onClick={() => setIsGenderOpen(!isGenderOpen)}
            aria-haspopup="listbox"
            aria-expanded={isGenderOpen}
            aria-label="Filter jenis kelamin"
            className={`w-full flex items-center rounded-xl border bg-slate-50 dark:bg-zinc-800 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer h-11 text-left ${
              isGenderOpen
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "border-slate-200 dark:border-zinc-700"
            }`}
          >
            <span className="truncate">
              {genderOptions.find((o) => o.value === selectedGender)?.label ??
                "Semua Jenis Kelamin"}
            </span>
          </button>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icons.users
              className="h-4 w-4 text-brand-500"
              aria-hidden="true"
            />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isGenderOpen ? "rotate-180 text-brand-500" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Floating Menu Popover */}
          {isGenderOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
              <div className="max-h-52 overflow-y-auto space-y-1">
                {genderOptions.map((option) => {
                  const isSelected = option.value === selectedGender;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSelectedGender(option.value);
                        setIsGenderOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50"
                          : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span
                        className={`truncate text-left font-semibold ${
                          isSelected
                            ? "text-brand-700 dark:text-brand-300"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {option.label}
                      </span>
                      {isSelected && (
                        <svg
                          className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Status Dropdown (Custom, selaras dengan Level) */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            aria-haspopup="listbox"
            aria-expanded={isStatusOpen}
            aria-label="Filter status siswa"
            className={`w-full flex items-center rounded-xl border bg-slate-50 dark:bg-zinc-800 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer h-11 text-left ${
              isStatusOpen
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "border-slate-200 dark:border-zinc-700"
            }`}
          >
            <span className="truncate">
              {statusOptions.find((o) => o.value === activeTab)?.label ??
                "Semua Siswa"}
            </span>
          </button>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icons.filter
              className="h-4 w-4 text-brand-500"
              aria-hidden="true"
            />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isStatusOpen ? "rotate-180 text-brand-500" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Floating Menu Popover */}
          {isStatusOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
              <div className="max-h-52 overflow-y-auto space-y-1">
                {statusOptions.map((option) => {
                  const isSelected = option.value === activeTab;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setActiveTab(option.value);
                        setIsStatusOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50"
                          : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span
                        className={`truncate text-left font-semibold ${
                          isSelected
                            ? "text-brand-700 dark:text-brand-300"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {option.label}
                      </span>
                      {isSelected && (
                        <svg
                          className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
