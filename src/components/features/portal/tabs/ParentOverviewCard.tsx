"use client";

// Dipisahkan dari ParentDashboardClient.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import Image from "next/image";
import { Icons } from "@/components/ui/icons";

export interface ParentOverviewCardProps {
  dobInfo: { formatted: string; age: number; } | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handlePhotoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handlePhotoClick: () => void;
  isUploadingPhoto: boolean;
  netPoints: any;
  photoUrl: string;
  setShowPointsModal: Dispatch<SetStateAction<boolean>>;
  setShowScheduleModal: Dispatch<SetStateAction<boolean>>;
  student: any;
}

export function ParentOverviewCard({
  dobInfo,
  fileInputRef,
  handlePhotoChange,
  handlePhotoClick,
  isUploadingPhoto,
  netPoints,
  photoUrl,
  setShowPointsModal,
  setShowScheduleModal,
  student,
}: ParentOverviewCardProps) {
  return (
    <div className="rounded-2xl bg-brand-600 p-5 sm:p-7 text-white shadow-sm space-y-4">
      {/* Top: Photo + Name + Nickname + Branch */}
      <div className="flex items-center gap-3.5 sm:gap-5">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoChange}
          accept="image/*"
          className="hidden"
        />

        {/* Student Photo / Logo Box (Interactive Upload) */}
        <button
          type="button"
          onClick={handlePhotoClick}
          disabled={isUploadingPhoto}
          title="Klik untuk mengubah foto profil anak"
          aria-label="Ubah foto profil anak"
          className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1 shrink-0 flex items-center justify-center shadow-sm overflow-hidden cursor-pointer hover:opacity-95 active:translate-y-px transition-opacity"
        >
          {photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photoUrl}
              alt={student.name}
              width={80}
              height={80}
              decoding="async"
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <Image
              src="/logo.webp"
              alt="ShiningSun Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain p-1"
              priority
            />
          )}

          {/* Camera Overlay Icon */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Ubah
            </span>
          </div>

          {/* Mobile Camera Indicator Badge */}
          <div className="absolute bottom-0 right-0 bg-brand-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-lg sm:hidden">
            Ubah
          </div>

          {/* Uploading Spinner */}
          {isUploadingPhoto && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white rounded-xl">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight truncate">
            {student.name}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap text-xs mt-0.5">
            {student.nickname && (
              <span className="font-medium text-brand-100">
                Panggilan:{" "}
                <strong className="text-white font-bold">
                  &quot;{student.nickname}&quot;
                </strong>
              </span>
            )}
            {student.branch?.name && (
              <>
                {student.nickname && (
                  <span className="text-white/40">•</span>
                )}
                <span className="font-semibold text-brand-100">
                  {student.branch.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Info Grid — DOB, Usia, Jadwal */}
      {(student.date_of_birth || student.schedule_detail) && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 shadow-sm divide-y divide-slate-200 sm:divide-y-0 sm:divide-x sm:divide-slate-200">
          {student.date_of_birth && dobInfo && (
            <div className="flex items-start gap-2.5 text-[12px] pb-2 sm:pb-0">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                <Icons.gift className="w-4 h-4 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Tanggal Lahir
                </span>
                <span
                  className="font-bold text-slate-800 leading-snug block tabular-nums"
                  suppressHydrationWarning
                >
                  {dobInfo.formatted}
                  <span
                    className="text-slate-400 font-semibold ml-1.5 inline-block"
                    suppressHydrationWarning
                  >
                    ({dobInfo.age} thn)
                  </span>
                </span>
              </div>
            </div>
          )}
          {student.schedule_detail && (
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              title="Klik untuk melihat rincian jadwal kelas"
              className="flex items-start gap-2.5 text-[12px] pt-2.5 sm:pt-0 sm:pl-3 text-left w-full cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                <Icons.calendar className="w-4 h-4 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Jadwal Kelas
                  </span>
                  <span className="text-[10px] font-bold text-brand-600 group-hover:underline">
                    Lihat
                  </span>
                </div>
                <div className="space-y-1.5">
                  {student.schedule_detail
                    .split(", ")
                    .map((item: string, idx: number) => {
                      const spaceIdx = item.indexOf(" ");
                      const dayName =
                        spaceIdx !== -1
                          ? item.substring(0, spaceIdx)
                          : item;
                      const timeStr =
                        spaceIdx !== -1
                          ? item.substring(spaceIdx + 1)
                          : "";
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs font-bold text-slate-800"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                          <span className="w-16 shrink-0 text-slate-700">
                            {dayName}
                          </span>
                          {timeStr && (
                            <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md font-mono tracking-tight tabular-nums">
                              {timeStr}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Bottom: Level Badge + Status Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* PROMINENT LEVEL PILL */}
        <div className="bg-white text-slate-900 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: student.label?.hex_color || "#16a34a",
            }}
          />
          <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
            Level:
          </span>
          <span className="font-bold text-brand-700 uppercase tracking-wide">
            {student.label
              ? `${student.label.main_level} ${student.label.sub_level}`
              : "Belum Diatur"}
          </span>
        </div>

        {/* STATUS BADGE */}
        <span className="bg-white text-emerald-700 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>
            {student.status === "REGISTERED"
              ? "Siswa Reguler"
              : student.status === "CG"
                ? "Coba Gratis"
                : "Nonaktif"}
          </span>
        </span>
      </div>

      {/* Points Display — Inside Card with White Background (Clickable to view Point History) */}
      <button
        type="button"
        onClick={() => setShowPointsModal(true)}
        title="Klik untuk melihat riwayat poin"
        className="w-full bg-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-sm text-slate-900 cursor-pointer hover:bg-amber-50 active:translate-y-px transition-colors group text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-amber-400 text-white flex items-center justify-center shrink-0">
            <Icons.star className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Poin
              </span>
              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                Lihat Riwayat
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
                {netPoints}
              </span>
              <span className="text-sm font-bold text-slate-600">
                Poin
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(student.redeemed_points || 0) > 0 && (
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl tabular-nums">
              Ditukar:{" "}
              <strong className="text-rose-600 font-bold">
                {student.redeemed_points}
              </strong>
            </span>
          )}
          <Icons.chevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
        </div>
      </button>
    </div>
  );
}
