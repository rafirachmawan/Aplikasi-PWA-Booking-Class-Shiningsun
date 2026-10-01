"use client";

import { useMemo, useState } from "react";
import type { StudentScheduleWorksheetRow } from "@/lib/studentReportTypes";
import { formatNumericDate } from "@/lib/dateUtils";

function csvEscape(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function ScheduleReportTab({
  initialData,
  fromDate,
}: {
  initialData: StudentScheduleWorksheetRow[];
  fromDate: string;
}) {
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const branches = useMemo(
    () => Array.from(new Set(initialData.map((r) => r.branch_name))).sort(),
    [initialData],
  );

  const summary = useMemo(() => {
    let filled = 0;
    let extra = 0;
    for (const r of initialData) {
      if (r.luar_jadwal) extra += 1;
      else if (r.status === "Terisi") filled += 1;
    }
    return {
      total: initialData.length,
      filled,
      extra,
      empty: initialData.length - filled - extra,
    };
  }, [initialData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialData.filter((r) => {
      if (branchFilter && r.branch_name !== branchFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.student_name.toLowerCase().includes(q) ||
        (r.nickname || "").toLowerCase().includes(q) ||
        r.materi.toLowerCase().includes(q) ||
        r.kegiatan.toLowerCase().includes(q) ||
        r.hasil_belajar.toLowerCase().includes(q) ||
        r.class_name.toLowerCase().includes(q)
      );
    });
  }, [initialData, search, branchFilter, statusFilter]);

  function handleDownloadCsv() {
    const header = [
      "Tanggal Jadwal",
      "Jam",
      "Kelas",
      "Siswa",
      "Panggilan",
      "Cabang",
      "Label",
      "Status Isian",
      "Keterangan",
      "Materi",
      "Kegiatan",
      "Hasil Belajar",
      "Catatan Guru",
      "Rekomendasi Rumah",
    ];
    const lines = filtered.map((r) =>
      [
        csvEscape(formatNumericDate(r.schedule_date)),
        csvEscape(r.schedule_time),
        csvEscape(r.class_name),
        csvEscape(r.student_name),
        csvEscape(r.nickname || ""),
        csvEscape(r.branch_name),
        csvEscape(r.label_name),
        csvEscape(r.status),
        csvEscape(r.luar_jadwal ? "Di luar jadwal" : ""),
        csvEscape(r.materi),
        csvEscape(r.kegiatan),
        csvEscape(r.hasil_belajar),
        csvEscape(r.catatan_guru),
        csvEscape(r.rekomendasi_rumah),
      ].join(";"),
    );
    const csv = "\uFEFF" + [header.join(";"), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Perkembangan_PerJadwal_sejak_${fromDate}_${filtered.length}_jadwal.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total baris
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {summary.total}
          </p>
          <p className="text-[11px] text-slate-500">
            sejak {formatNumericDate(fromDate)}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Terisi jadwal
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.filled}
          </p>
          <p className="text-[11px] text-slate-500">isian cocok tanggal</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Di luar jadwal
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {summary.extra}
          </p>
          <p className="text-[11px] text-slate-500">isian tanpa jadwal cocok</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Belum diisi
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.empty}
          </p>
          <p className="text-[11px] text-slate-500">perlu dilengkapi guru</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari siswa / materi / kegiatan / hasil belajar..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Semua cabang</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Terisi + Kosong</option>
            <option value="Terisi">Terisi saja</option>
            <option value="Kosong">Kosong saja</option>
          </select>
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={filtered.length === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors shadow-sm disabled:opacity-50"
          >
            Unduh CSV ({filtered.length})
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/60 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                <th className="px-4 py-3 font-semibold">No</th>
                <th className="px-4 py-3 font-semibold">Jadwal</th>
                <th className="px-4 py-3 font-semibold">Siswa / Cabang</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Isian Laporan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filtered.map((r, i) => (
                <tr key={r.key} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 align-top">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatNumericDate(r.schedule_date)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.schedule_time} • {r.class_name}
                    </p>
                    {r.luar_jadwal && (
                      <span className="mt-1 inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                        Di luar jadwal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {r.student_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[r.nickname, r.branch_name, r.label_name]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        r.status === "Terisi"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[420px]">
                    {r.status === "Terisi" ? (
                      <div className="space-y-1.5 text-[13px] text-slate-700 dark:text-zinc-300">
                        {r.materi && (
                          <p>
                            <span className="font-semibold">Materi:</span> {r.materi}
                          </p>
                        )}
                        {r.kegiatan && (
                          <p>
                            <span className="font-semibold">Kegiatan:</span> {r.kegiatan}
                          </p>
                        )}
                        {r.hasil_belajar && (
                          <p>
                            <span className="font-semibold">Hasil:</span> {r.hasil_belajar}
                          </p>
                        )}
                        {r.catatan_guru && (
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold">Catatan guru:</span> {r.catatan_guru}
                          </p>
                        )}
                        {r.rekomendasi_rumah && (
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold">Rekomendasi:</span> {r.rekomendasi_rumah}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-slate-400">Belum ada isian</p>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Tidak ada jadwal sejak {formatNumericDate(fromDate)} untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
