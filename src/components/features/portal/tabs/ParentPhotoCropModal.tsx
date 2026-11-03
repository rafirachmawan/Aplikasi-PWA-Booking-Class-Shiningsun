"use client";

// Dipisahkan dari ParentDashboardClient.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface ParentPhotoCropModalProps {
  cropOffset: { x: number; y: number; };
  cropZoom: number;
  handleDragEnd: () => void;
  handleDragMove: (clientX: number, clientY: number) => void;
  handleDragStart: (clientX: number, clientY: number) => void;
  handleSaveCrop: () => Promise<void>;
  isUploadingPhoto: boolean;
  rawImageSrc: string;
  setCropZoom: Dispatch<SetStateAction<number>>;
  setShowCropModal: Dispatch<SetStateAction<boolean>>;
}

export function ParentPhotoCropModal({
  cropOffset,
  cropZoom,
  handleDragEnd,
  handleDragMove,
  handleDragStart,
  handleSaveCrop,
  isUploadingPhoto,
  rawImageSrc,
  setCropZoom,
  setShowCropModal,
}: ParentPhotoCropModalProps) {
  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-zinc-900 text-white rounded-2xl shadow-2xl border border-zinc-800 p-5 sm:p-7 max-w-md w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-white">
            Atur dan Potong Foto Profil
          </h3>
          <button
            type="button"
            onClick={() => setShowCropModal(false)}
            aria-label="Tutup"
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        {/* Instruction */}
        <p className="text-xs text-zinc-300 text-center">
          Geser posisi foto dan atur perbesaran (zoom) agar sesuai dalam
          bingkai lingkaran.
        </p>

        {/* Interactive Preview Container (260x260px) */}
        <div className="flex justify-center my-2">
          <div
            className="relative w-65 h-65 rounded-full overflow-hidden border-4 border-brand-600 bg-black cursor-grab active:cursor-grabbing select-none touch-none"
            onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 1) {
                handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={handleDragEnd}
          >
            {rawImageSrc && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={rawImageSrc}
                alt="Preview Crop"
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                  left: "50%",
                  top: "50%",
                  width: "100%",
                  height: "auto",
                }}
              />
            )}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none"></div>
          </div>
        </div>

        {/* Zoom Slider Control */}
        <div className="space-y-2 bg-zinc-800/70 p-3 rounded-2xl border border-zinc-700/60">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
            <span>Perbesaran (Zoom):</span>
            <span className="text-brand-400 tabular-nums">
              {Math.round(cropZoom * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCropZoom((z) => Math.max(1, z - 0.2))}
              aria-label="Perkecil"
              className="w-8 h-8 rounded-xl bg-zinc-700 hover:bg-zinc-600 font-bold text-white shrink-0 active:translate-y-px transition-colors cursor-pointer"
            >
              -
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={cropZoom}
              aria-label="Perbesaran foto"
              onChange={(e) => setCropZoom(parseFloat(e.target.value))}
              className="w-full accent-brand-500 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setCropZoom((z) => Math.min(3, z + 0.2))}
              aria-label="Perbesar"
              className="w-8 h-8 rounded-xl bg-zinc-700 hover:bg-zinc-600 font-bold text-white shrink-0 active:translate-y-px transition-colors cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowCropModal(false)}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer active:translate-y-px"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isUploadingPhoto}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer active:translate-y-px flex items-center justify-center gap-2"
          >
            {isUploadingPhoto ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>Simpan Foto</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
