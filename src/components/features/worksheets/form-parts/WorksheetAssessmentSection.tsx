"use client";

// Dipisahkan dari WorksheetFormModal.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, RefObject, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

type AttendanceStatus =
    | "HADIR"
    | "IJIN"
    | "SAKIT"
    | "LIBUR"
    | "LIBUR_HARI_BESAR";

export interface WorksheetAssessmentSectionProps {
  absenceReason: string;
  addHasilItem: () => void;
  addKegiatanItem: () => void;
  afirmasiSearch: string;
  afirmasiSearchInputRef: RefObject<HTMLInputElement | null>;
  alasanSearch: string;
  alasanSearchInputRef: RefObject<HTMLInputElement | null>;
  attendanceStatus: AttendanceStatus;
  catatanGuru: any;
  currentReasonTemplates: any[];
  filteredAfirmasiOptions: { id: any; num: string; label: any; text: any; }[];
  filteredAvailableLevels: { id: string; main_level: string; sub_level: string; hex_color?: string; }[];
  filteredKegiatanOptions: { id: any; num: string; label: any; }[];
  filteredMateriTemplates: any[];
  filteredPemahamanOptions: { id: any; num: string; label: any; desc: any; }[];
  filteredReasonOptions: any[];
  filteredRumahOptions: { id: any; num: string; label: any; }[];
  handleAbsenceReasonChange: (reason: string) => void;
  handleAfirmasiChange: (newAfId: string) => void;
  handleHasilChange: (idx: number, val: string) => void;
  handleKegiatanChange: (idx: number, val: string) => void;
  handlePemahamanChange: (newPemId: string) => void;
  hasilBelajarItems: string[];
  isAbsent: boolean;
  kegiatanItems: string[];
  kegiatanSearch: string;
  kegiatanSearchInputRef: RefObject<HTMLInputElement | null>;
  levelSearch: string;
  levelSearchInputRef: RefObject<HTMLInputElement | null>;
  materi: any;
  materiSearch: string;
  materiSearchInputRef: RefObject<HTMLInputElement | null>;
  openDropdown: string | null;
  pemahamanSearch: string;
  pemahamanSearchInputRef: RefObject<HTMLInputElement | null>;
  rekomendasiRumah: any;
  removeHasilItem: (idx: number) => void;
  removeKegiatanItem: (idx: number) => void;
  rumahSearch: string;
  rumahSearchInputRef: RefObject<HTMLInputElement | null>;
  selectedAfirmasi: { id: any; num: string; label: any; text: any; } | undefined;
  selectedKegiatan: { id: any; num: string; label: any; } | undefined;
  selectedLevelId: string;
  selectedLevelObj: { id: string; main_level: string; sub_level: string; hex_color?: string; } | null;
  selectedPemahaman: { id: any; num: string; label: any; desc: any; } | undefined;
  selectedRumah: { id: any; num: string; label: any; } | undefined;
  selectedStudentLabel: any;
  setAfirmasiSearch: Dispatch<SetStateAction<string>>;
  setAlasanSearch: Dispatch<SetStateAction<string>>;
  setCatatanGuru: Dispatch<any>;
  setKegiatanItems: Dispatch<SetStateAction<string[]>>;
  setKegiatanSearch: Dispatch<SetStateAction<string>>;
  setLevelSearch: Dispatch<SetStateAction<string>>;
  setMateri: Dispatch<any>;
  setMateriSearch: Dispatch<SetStateAction<string>>;
  setOpenDropdown: Dispatch<SetStateAction<string | null>>;
  setPemahamanSearch: Dispatch<SetStateAction<string>>;
  setRekomendasiRumah: Dispatch<any>;
  setRumahSearch: Dispatch<SetStateAction<string>>;
  setSelectedLevelId: Dispatch<SetStateAction<string>>;
  setSmartKegiatanId: Dispatch<SetStateAction<string>>;
  setSmartMateriText: Dispatch<SetStateAction<string>>;
  setSmartRumahId: Dispatch<SetStateAction<string>>;
  smartAfirmasiId: string;
  smartKegiatanId: string;
  smartMateriText: string;
  smartPemahamanId: string;
  smartRumahId: string;
}

export function WorksheetAssessmentSection({
  absenceReason,
  addHasilItem,
  addKegiatanItem,
  afirmasiSearch,
  afirmasiSearchInputRef,
  alasanSearch,
  alasanSearchInputRef,
  attendanceStatus,
  catatanGuru,
  currentReasonTemplates,
  filteredAfirmasiOptions,
  filteredAvailableLevels,
  filteredKegiatanOptions,
  filteredMateriTemplates,
  filteredPemahamanOptions,
  filteredReasonOptions,
  filteredRumahOptions,
  handleAbsenceReasonChange,
  handleAfirmasiChange,
  handleHasilChange,
  handleKegiatanChange,
  handlePemahamanChange,
  hasilBelajarItems,
  isAbsent,
  kegiatanItems,
  kegiatanSearch,
  kegiatanSearchInputRef,
  levelSearch,
  levelSearchInputRef,
  materi,
  materiSearch,
  materiSearchInputRef,
  openDropdown,
  pemahamanSearch,
  pemahamanSearchInputRef,
  rekomendasiRumah,
  removeHasilItem,
  removeKegiatanItem,
  rumahSearch,
  rumahSearchInputRef,
  selectedAfirmasi,
  selectedKegiatan,
  selectedLevelId,
  selectedLevelObj,
  selectedPemahaman,
  selectedRumah,
  selectedStudentLabel,
  setAfirmasiSearch,
  setAlasanSearch,
  setCatatanGuru,
  setKegiatanItems,
  setKegiatanSearch,
  setLevelSearch,
  setMateri,
  setMateriSearch,
  setOpenDropdown,
  setPemahamanSearch,
  setRekomendasiRumah,
  setRumahSearch,
  setSelectedLevelId,
  setSmartKegiatanId,
  setSmartMateriText,
  setSmartRumahId,
  smartAfirmasiId,
  smartKegiatanId,
  smartMateriText,
  smartPemahamanId,
  smartRumahId,
}: WorksheetAssessmentSectionProps) {
  return (
    <div className="rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/40 dark:bg-sky-950/20 p-3.5 sm:p-4 space-y-3.5 sm:space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-extrabold shrink-0">
            2
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            📋 Data Perkembangan & Catatan Evaluasi
          </span>
        </div>
        <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full shrink-0">
          ⚡ Template + Isian
        </span>
      </div>

      {/* Lock Notice Banner when Absent */}
      {isAbsent && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <span className="text-xl shrink-0">🔒</span>
          <div>
            <span className="font-extrabold block text-xs text-amber-900 dark:text-amber-100">
              Siswa Tidak Hadir (
              {attendanceStatus === "IJIN"
                ? "Ijin"
                : attendanceStatus === "SAKIT"
                  ? "Sakit"
                  : "Libur Hari Besar"}
              )
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-300 block mt-0.5">
              Materi dan penilaian perkembangan dikunci otomatis.
            </span>
          </div>
        </div>
      )}

      {/* Absence Reason Dropdown (options from Template Penilaian) */}
      {isAbsent && (
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            💬 Alasan Ketidakhadiran (Template Penilaian)
          </label>
          <div className="relative">
            <button
              type="button"
              disabled={currentReasonTemplates.length === 0}
              onClick={() =>
                setOpenDropdown(
                  openDropdown === "alasan" ? null : "alasan",
                )
              }
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-slate-800 text-amber-950 dark:text-amber-200 text-xs font-semibold shadow-xs hover:border-amber-400 cursor-pointer text-left disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="truncate">
                {absenceReason || "-- Pilih Alasan --"}
              </span>
              <Icons.chevronDown
                className={`w-3.5 h-3.5 text-amber-600 shrink-0 transition-transform duration-200 ${openDropdown === "alasan" ? "rotate-180" : ""}`}
              />
            </button>

            {openDropdown === "alasan" && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search input for Alasan */}
                <div className="p-1">
                  <input
                    ref={alasanSearchInputRef}
                    type="text"
                    value={alasanSearch}
                    onChange={(e) => setAlasanSearch(e.target.value)}
                    placeholder="🔍 Cari opsi alasan..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredReasonOptions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      Tidak ada opsi alasan yang cocok.
                    </div>
                  ) : (
                    filteredReasonOptions.map((t) => {
                      const isSel = absenceReason === t.title;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            handleAbsenceReasonChange(t.title);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                            isSel
                              ? "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          }`}
                        >
                          <span className="wrap-break-word whitespace-normal leading-snug">
                            {t.title}
                          </span>
                          {isSel && (
                            <span className="text-amber-600 shrink-0 text-xs font-bold mt-0.5">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          {currentReasonTemplates.length === 0 && (
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">
              Belum ada opsi alasan untuk kategori ini — tambahkan di menu
              Template Penilaian (kategori Alasan Ijin / Sakit / Libur).
            </span>
          )}
        </div>
      )}

      <div
        className={`space-y-3.5 sm:space-y-4 transition-opacity duration-200 ${isAbsent ? "opacity-50 pointer-events-none" : ""}`}
      >
        {/* 1. Materi yang Diajarkan (Unified Dropdown + Input) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-sky-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>1. Materi yang Diajarkan</span>
            </label>
            {selectedLevelObj && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                style={{
                  borderColor: `${selectedLevelObj.hex_color || "#0284c7"}80`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                  style={{
                    backgroundColor:
                      selectedLevelObj.hex_color || "#0284c7",
                  }}
                />
                Level: {selectedLevelObj.main_level}{" "}
                {selectedLevelObj.sub_level}
              </span>
            )}

            {/* Current Student Level Indicator */}
            {selectedStudentLabel && (
              <div className="text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  📚 Siswa Level:
                </span>{" "}
                <span className="font-bold text-sky-700 dark:text-sky-400">
                  {selectedStudentLabel.main_level} -{" "}
                  {selectedStudentLabel.sub_level}
                </span>
              </div>
            )}
          </div>

          {/* Level Filter Selector Bar (Custom Color Dropdown) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-sky-50/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-sky-200/80 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-200">
              <span>🎯 Pilih Level Materi:</span>
            </div>

            <div className="relative">
              <button
                type="button"
                disabled={isAbsent}
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === "level" ? null : "level",
                  )
                }
                className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-xs font-extrabold shadow-xs hover:border-sky-400 cursor-pointer min-w-52.5 text-left"
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  {selectedLevelObj ? (
                    <>
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10"
                        style={{
                          backgroundColor:
                            selectedLevelObj.hex_color || "#0284c7",
                        }}
                      />
                      <span className="text-slate-900 dark:text-slate-100 font-extrabold truncate">
                        {selectedLevelObj.main_level}{" "}
                        {selectedLevelObj.sub_level}
                      </span>
                    </>
                  ) : selectedLevelId === "ALL" ? (
                    <>
                      <span className="w-3 h-3 rounded-full shrink-0 bg-sky-500 shadow-xs" />
                      <span className="text-sky-900 dark:text-sky-200 font-extrabold">
                        🌐 Semua Level
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-400 animate-pulse shadow-xs" />
                      <span className="text-amber-800 dark:text-amber-300 font-extrabold italic">
                        -- Pilih Level Materi --
                      </span>
                    </>
                  )}
                </div>
                <Icons.chevronDown
                  className={`w-3.5 h-3.5 text-sky-600 shrink-0 transition-transform duration-200 ${
                    openDropdown === "level" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openDropdown === "level" && (
                <div className="absolute top-full right-0 mt-1.5 z-50 w-full sm:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Search input for Level */}
                  <div className="p-1">
                    <input
                      ref={levelSearchInputRef}
                      type="text"
                      value={levelSearch}
                      onChange={(e) => setLevelSearch(e.target.value)}
                      placeholder="🔍 Cari level..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>

                  {/* Scrollable Container showing ~8-10 items */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {/* Option: Semua Level */}
                    {(!levelSearch.trim() ||
                      "semua level".includes(
                        levelSearch.toLowerCase(),
                      )) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLevelId("ALL");
                          setOpenDropdown(null);
                          setLevelSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          selectedLevelId === "ALL"
                            ? "bg-sky-50 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 font-extrabold border border-sky-200 dark:border-sky-800"
                            : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-sky-500 shadow-xs flex items-center justify-center text-[9px] text-white">
                            🌐
                          </span>
                          Semua Level
                        </span>
                        {selectedLevelId === "ALL" && (
                          <span className="text-sky-600 font-extrabold">
                            ✓
                          </span>
                        )}
                      </button>
                    )}

                    {/* Available Levels List with Hex Colors */}
                    {filteredAvailableLevels.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-400 italic">
                        Level tidak ditemukan.
                      </div>
                    ) : (
                      filteredAvailableLevels.map((lvl) => {
                        const isSel = selectedLevelId === lvl.id;
                        const color = lvl.hex_color || "#0284c7";
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => {
                              setSelectedLevelId(lvl.id);
                              setOpenDropdown(null);
                              setLevelSearch("");
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                              isSel
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold border border-slate-300 dark:border-slate-700 shadow-2xs"
                                : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                            }`}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10"
                                style={{ backgroundColor: color }}
                              />
                              <span className="truncate font-extrabold text-slate-900 dark:text-slate-100">
                                {lvl.main_level} {lvl.sub_level}
                              </span>
                            </span>
                            {isSel && (
                              <span className="font-extrabold text-xs text-sky-600 dark:text-sky-400">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dropdown Template Materi (Hanya muncul saat Level sudah dipilih) */}
          {!selectedLevelId ? (
            <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
              <span className="text-base shrink-0">💡</span>
              <span>
                Silakan <strong>Pilih Level Materi</strong> terlebih
                dahulu di atas untuk menampilkan pilihan materi/soal yang
                sesuai.
              </span>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                disabled={isAbsent}
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === "materi" ? null : "materi",
                  )
                }
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-slate-800 text-sky-950 dark:text-sky-200 text-xs font-semibold shadow-xs hover:border-sky-400 cursor-pointer text-left"
              >
                <span className="truncate">
                  {smartMateriText
                    ? `📚 ${smartMateriText}`
                    : "-- Pilih Materi --"}
                </span>
                <Icons.chevronDown
                  className={`w-3.5 h-3.5 text-sky-600 shrink-0 transition-transform duration-200 ${openDropdown === "materi" ? "rotate-180" : ""}`}
                />
              </button>

              {openDropdown === "materi" && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Search input for Materi */}
                  <div className="p-1">
                    <input
                      ref={materiSearchInputRef}
                      type="text"
                      value={materiSearch}
                      onChange={(e) => setMateriSearch(e.target.value)}
                      placeholder="🔍 Cari template materi..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredMateriTemplates.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400 italic space-y-1">
                        <div>Tidak ada materi untuk level ini.</div>
                        <button
                          type="button"
                          onClick={() => setSelectedLevelId("ALL")}
                          className="text-sky-600 dark:text-sky-400 font-bold underline cursor-pointer hover:text-sky-700"
                        >
                          Tampilkan Semua Level
                        </button>
                      </div>
                    ) : (
                      filteredMateriTemplates.map((t) => {
                        const isSel = smartMateriText === t.title;
                        const tplLabel = Array.isArray(t.label)
                          ? t.label[0]
                          : t.label;
                        const shouldSwitchLevel =
                          selectedStudentLabel &&
                          tplLabel &&
                          tplLabel.id !== selectedStudentLabel.id;

                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSmartMateriText(t.title);
                              setMateri(t.title);
                              setOpenDropdown(null);

                              // If student level differs from material level, ask to switch
                              if (
                                shouldSwitchLevel &&
                                selectedStudentLabel &&
                                tplLabel
                              ) {
                                if (
                                  confirm(
                                    `Materi ini untuk level ${tplLabel.main_level} - ${tplLabel.sub_level}, ` +
                                      `tetapi siswa berada di level ${selectedStudentLabel.main_level} - ${selectedStudentLabel.sub_level}. ` +
                                      `Ganti level materi ke level siswa?`,
                                  )
                                ) {
                                  setSelectedLevelId(
                                    selectedStudentLabel.id,
                                  );
                                }
                              }
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                              isSel
                                ? "bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-extrabold"
                                : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                            }`}
                          >
                            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                              <span className="wrap-break-word whitespace-normal leading-snug">
                                📚 {t.title}
                              </span>
                              {tplLabel && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                                    style={{
                                      backgroundColor:
                                        tplLabel.hex_color || "#0284c7",
                                    }}
                                  />
                                  Level: {tplLabel.main_level}{" "}
                                  {tplLabel.sub_level}
                                </span>
                              )}
                              {shouldSwitchLevel && (
                                <div className="mt-1 flex items-center gap-1 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold">
                                    👉 Switch to:
                                  </span>
                                  <span className="font-bold text-sky-700 dark:text-sky-400">
                                    {selectedStudentLabel.main_level} -{" "}
                                    {selectedStudentLabel.sub_level}
                                  </span>
                                </div>
                              )}
                            </div>
                            {isSel && (
                              <span className="text-sky-600 shrink-0 text-xs font-bold mt-0.5">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Direct Text Input for Materi */}
          <input
            type="text"
            value={materi}
            disabled={isAbsent}
            onChange={(e) => {
              setMateri(e.target.value);
              setSmartMateriText(e.target.value);
            }}
            placeholder="Atau tulis materi manual di sini..."
            className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 ${
              isAbsent
                ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-bold cursor-not-allowed"
                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            }`}
          />
        </div>

        {/* 2. Hari ini Ananda... (Kegiatan di Kelas) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              2. Hari ini Ananda (Kegiatan di Kelas)
            </label>
            {!isAbsent && (
              <button
                type="button"
                onClick={addKegiatanItem}
                className="text-[11px] sm:text-xs font-bold text-sky-700 dark:text-sky-300 hover:text-sky-900 flex items-center gap-1 bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Icons.add className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Isi Manual +</span>
              </button>
            )}
          </div>

          {/* Dropdown Pilihan Jenis Kegiatan */}
          <div className="relative">
            <button
              type="button"
              disabled={isAbsent}
              onClick={() =>
                setOpenDropdown(
                  openDropdown === "kegiatan" ? null : "kegiatan",
                )
              }
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold shadow-xs hover:border-slate-400 cursor-pointer text-left"
            >
              <span className="line-clamp-1 leading-snug">
                {selectedKegiatan
                  ? `${selectedKegiatan.num}. ${selectedKegiatan.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                  : "-- Pilih Kegiatan --"}
              </span>
              <Icons.chevronDown
                className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-200 ${openDropdown === "kegiatan" ? "rotate-180" : ""}`}
              />
            </button>

            {openDropdown === "kegiatan" && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search input for Kegiatan */}
                <div className="p-1">
                  <input
                    ref={kegiatanSearchInputRef}
                    type="text"
                    value={kegiatanSearch}
                    onChange={(e) => setKegiatanSearch(e.target.value)}
                    placeholder="🔍 Cari opsi kegiatan..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredKegiatanOptions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      Tidak ada opsi kegiatan yang cocok.
                    </div>
                  ) : (
                    filteredKegiatanOptions.map((opt) => {
                      const isSel = smartKegiatanId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSmartKegiatanId(opt.id);
                            const cleanLabel = opt.label.replace(
                              /^(1|2|3|4)\.\s*/,
                              "",
                            );
                            const currentMateri =
                              materi || smartMateriText || "";
                            const newItem = currentMateri
                              ? `${cleanLabel} ${currentMateri}`
                              : cleanLabel;
                            setKegiatanItems([newItem]);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                            isSel
                              ? "bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-extrabold"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          }`}
                        >
                          <span className="wrap-break-word whitespace-normal leading-snug">
                            {opt.num}.{" "}
                            {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                          </span>
                          {isSel && (
                            <span className="text-brand-600 shrink-0 text-xs font-bold mt-0.5">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Points List Input */}
          <div className="space-y-2 pt-0.5">
            {kegiatanItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sky-600 dark:text-sky-400 font-bold text-sm shrink-0 w-3.5 text-center">
                  •
                </span>
                <input
                  type="text"
                  value={item}
                  disabled={isAbsent}
                  onChange={(e) =>
                    handleKegiatanChange(idx, e.target.value)
                  }
                  placeholder={`Poin ${idx + 1}: Cth: Menulis angka`}
                  className={`flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 ${
                    isAbsent
                      ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  }`}
                />
                {!isAbsent && kegiatanItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeKegiatanItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Hapus Poin"
                  >
                    <Icons.close className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. Pemahaman & Hasil Belajar Ananda */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/90 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              3. Pemahaman & Hasil Belajar Anak
            </label>
            {!isAbsent && (
              <button
                type="button"
                onClick={addHasilItem}
                className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Icons.add className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Isi Manual +</span>
              </button>
            )}
          </div>

          {/* Dropdown Pemahaman / Hasil Evaluasi 1/2/3/4 */}
          <div className="relative">
            <button
              type="button"
              disabled={isAbsent}
              onClick={() =>
                setOpenDropdown(
                  openDropdown === "pemahaman" ? null : "pemahaman",
                )
              }
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-slate-800 text-emerald-950 dark:text-emerald-200 text-xs font-semibold shadow-xs hover:border-emerald-400 cursor-pointer text-left"
            >
              <span className="line-clamp-1 leading-snug">
                {selectedPemahaman
                  ? `${selectedPemahaman.num}. ${selectedPemahaman.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                  : "-- Pilih Pemahaman --"}
              </span>
              <Icons.chevronDown
                className={`w-3.5 h-3.5 text-emerald-600 shrink-0 transition-transform duration-200 ${openDropdown === "pemahaman" ? "rotate-180" : ""}`}
              />
            </button>

            {openDropdown === "pemahaman" && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search input for Pemahaman */}
                <div className="p-1">
                  <input
                    ref={pemahamanSearchInputRef}
                    type="text"
                    value={pemahamanSearch}
                    onChange={(e) => setPemahamanSearch(e.target.value)}
                    placeholder="🔍 Cari opsi pemahaman..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredPemahamanOptions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      Tidak ada opsi pemahaman yang cocok.
                    </div>
                  ) : (
                    filteredPemahamanOptions.map((opt) => {
                      const isSel = smartPemahamanId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            handlePemahamanChange(opt.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                            isSel
                              ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-extrabold"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          }`}
                        >
                          <span className="wrap-break-word whitespace-normal leading-snug">
                            {opt.num}.{" "}
                            {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                          </span>
                          {isSel && (
                            <span className="text-emerald-600 shrink-0 text-xs font-bold mt-0.5">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Points List Input for Hasil Belajar */}
          <div className="space-y-2 pt-0.5">
            {hasilBelajarItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0 w-3.5 text-center">
                  •
                </span>
                <input
                  type="text"
                  value={item}
                  disabled={isAbsent}
                  onChange={(e) => handleHasilChange(idx, e.target.value)}
                  placeholder={`Poin ${idx + 1}: Cth: Sudah bisa menghitung mandiri`}
                  className={`flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 ${
                    isAbsent
                      ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  }`}
                />
                {!isAbsent && hasilBelajarItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHasilItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Hapus Poin"
                  >
                    <Icons.close className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Rekomendasi Kegiatan di Rumah */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-amber-200/90 dark:border-slate-800 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            4. Rekomendasi Kegiatan di Rumah
          </label>

          {/* Dropdown Rekomendasi Rumah */}
          <div className="relative">
            <button
              type="button"
              disabled={isAbsent}
              onClick={() =>
                setOpenDropdown(openDropdown === "rumah" ? null : "rumah")
              }
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-slate-800 text-amber-950 dark:text-amber-200 text-xs font-semibold shadow-xs hover:border-amber-400 cursor-pointer text-left"
            >
              <span className="line-clamp-1 leading-snug">
                {selectedRumah
                  ? `${selectedRumah.num}. ${selectedRumah.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                  : "-- Pilih Rekomendasi --"}
              </span>
              <Icons.chevronDown
                className={`w-3.5 h-3.5 text-amber-600 shrink-0 transition-transform duration-200 ${openDropdown === "rumah" ? "rotate-180" : ""}`}
              />
            </button>

            {openDropdown === "rumah" && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search input for Rekomendasi Rumah */}
                <div className="p-1">
                  <input
                    ref={rumahSearchInputRef}
                    type="text"
                    value={rumahSearch}
                    onChange={(e) => setRumahSearch(e.target.value)}
                    placeholder="🔍 Cari opsi rekomendasi..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredRumahOptions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      Tidak ada opsi rekomendasi yang cocok.
                    </div>
                  ) : (
                    filteredRumahOptions.map((opt) => {
                      const isSel = smartRumahId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSmartRumahId(opt.id);
                            const cleanLabel = opt.label.replace(
                              /^(1|2|3|4)\.\s*/,
                              "",
                            );
                            setRekomendasiRumah(
                              `Untuk di rumah Ananda bisa ${cleanLabel.toLowerCase()}`,
                            );
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                            isSel
                              ? "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          }`}
                        >
                          <span className="wrap-break-word whitespace-normal leading-snug">
                            {opt.num}.{" "}
                            {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                          </span>
                          {isSel && (
                            <span className="text-amber-600 shrink-0 text-xs font-bold mt-0.5">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Direct Text Input for Rumah */}
          <input
            type="text"
            value={rekomendasiRumah}
            disabled={isAbsent}
            onChange={(e) => setRekomendasiRumah(e.target.value)}
            placeholder="Contoh: Mengulang materi hari ini di rumah"
            className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400 ${
              isAbsent
                ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium cursor-not-allowed"
                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            }`}
          />
        </div>

        {/* 5. Afirmasi Positif & Catatan Guru */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-sky-200/90 dark:border-slate-800 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            5. Afirmasi Positif & Catatan Guru untuk Orang Tua
          </label>

          {/* Dropdown Afirmasi Positif */}
          <div className="relative">
            <button
              type="button"
              disabled={isAbsent}
              onClick={() =>
                setOpenDropdown(
                  openDropdown === "afirmasi" ? null : "afirmasi",
                )
              }
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50/50 dark:bg-slate-800 text-sky-950 dark:text-sky-200 text-xs font-semibold shadow-xs hover:border-sky-400 cursor-pointer text-left"
            >
              <span className="line-clamp-1 leading-snug">
                {selectedAfirmasi
                  ? `${selectedAfirmasi.num}. ${selectedAfirmasi.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                  : "-- Pilih Afirmasi --"}
              </span>
              <Icons.chevronDown
                className={`w-3.5 h-3.5 text-sky-600 shrink-0 transition-transform duration-200 ${openDropdown === "afirmasi" ? "rotate-180" : ""}`}
              />
            </button>

            {openDropdown === "afirmasi" && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search input for Afirmasi */}
                <div className="p-1">
                  <input
                    ref={afirmasiSearchInputRef}
                    type="text"
                    value={afirmasiSearch}
                    onChange={(e) => setAfirmasiSearch(e.target.value)}
                    placeholder="🔍 Cari opsi afirmasi..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredAfirmasiOptions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      Tidak ada opsi afirmasi yang cocok.
                    </div>
                  ) : (
                    filteredAfirmasiOptions.map((opt) => {
                      const isSel = smartAfirmasiId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            handleAfirmasiChange(opt.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                            isSel
                              ? "bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-extrabold"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          }`}
                        >
                          <span className="wrap-break-word whitespace-normal leading-snug">
                            {opt.num}.{" "}
                            {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                          </span>
                          {isSel && (
                            <span className="text-sky-600 shrink-0 text-xs font-bold mt-0.5">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Direct Textarea Input for Catatan Guru */}
          <textarea
            rows={2}
            value={catatanGuru}
            disabled={isAbsent}
            onChange={(e) => setCatatanGuru(e.target.value)}
            placeholder="Tuliskan apresiasi, saran, atau pesan untuk orang tua..."
            className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 ${
              isAbsent
                ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium cursor-not-allowed"
                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
