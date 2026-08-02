"use client";

import { Icons } from "@/components/ui/icons";

interface NotificationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
}

export function NotificationStatusModal({
  isOpen,
  onClose,
  type,
  title,
  message,
}: NotificationStatusModalProps) {
  if (!isOpen) return null;

  const isSuccess = type === "success";
  const isError = type === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center">
        {/* Icon Header */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${
            isSuccess
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : isError
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          }`}
        >
          {isSuccess ? (
            <Icons.check className="w-7 h-7 stroke-[3]" />
          ) : isError ? (
            <Icons.close className="w-7 h-7 stroke-[2.5]" />
          ) : (
            <Icons.bell className="w-7 h-7" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-tight">
          {title}
        </h3>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
            isSuccess
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              : isError
              ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white"
              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          }`}
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}
