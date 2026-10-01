"use client";

import { useMemo, useState } from "react";
import type {
  StudentReportRow,
  StudentScheduleWorksheetRow,
} from "@/lib/studentReportTypes";
import { formatNumericDate } from "@/lib/dateUtils";
import { ScheduleReportTab } from "./ScheduleReportTab";

function csvEscape(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function ReportClient({
  initialData,
  scheduleData = [],
  fromDate,
}: {
  initialData: StudentReportRow[];
  scheduleData?: StudentScheduleWorksheetRow[];
  fromDate: string;
}) {
  const [activeTab, setActiveTab] = useState<"ringkasan" | "jadwal">("ringkasan");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const branches = useMemo(
    () => Array.from(new Set(initialData.map((r) => r.branch_name))).sort(),
    [initialData],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of initialData) map[r.branch_name] = (map[r.branch_name] || 0) + 1;
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [initialData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialData.filter((r) => {
      if (branchFilter && r.branch_name !== branchFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.nickname || "").toLowerCase().includes(q) ||
        r.label_name.toLowerCase().includes(q) ||
        (r.school || "").toLowerCase().includes(q)
      );
    });
  }, [initialData, search, branchFilter]);

  function handleDownloadCsv() {
    const header = [
      "Nama",
      "Panggilan",
      "Jenis Kelamin",
      "Tgl Lahir",
      "Cabang",
      "Label/Level",
      "Tgl Daftar",
      "Tgl Registrasi",
      "HP",
      "Sekolah",
    ];
    const lines = filtered.map((r) =>
      [
        csvEscape(r.name),
        csvEscape(r.nickname || ""),
        csvEscape(r.gender || ""),
        csvEscape(formatNumericDate(r.date_of_birth)),
        csvEscape(r.branch_name),
        csvEscape(r.label_name),
        csvEscape(formatNumericDate(r.registration_date)),
        csvEscape(r.registered_at ? formatNumericDate(r.registered_at) : ""),
        csvEscape(r.phone || ""),
        csvEscape(r.school || ""),
      ].join(";"),
    );
    const csv = "\uFEFF" + [header.join(";"), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Siswa_REGISTERED_${filtered.length}_siswa.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1.5 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("ringkasan")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            activeTab === "ringkasan"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          Ringkasan Siswa ({initialData.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("jadwal")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            activeTab === "jadwal"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          Per Jadwal + Isian ({scheduleData.length})
        </button>
      </div>

      {activeTab === "jadwal" ? (
        <ScheduleReportTab initialData={scheduleData} fromDate={fromDate} />
      ) : (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total siswa
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {initialData.length}
          </p>
          <p className="text-[11px] text-slate-500">
            REGISTERED semua tanggal daftar
          </p>
        </div>
        {counts.map(([name, total]) => (
          <div
            key={name}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
              {name}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {total}
            </p>
            <p className="text-[11px] text-slate-500">siswa</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / panggilan / label / sekolah..."
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
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/60 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                <th className="px-4 py-3 font-semibold">No</th>
                <th className="px-4 py-3 font-semibold">Nama / Panggilan</th>
                <th className="px-4 py-3 font-semibold">Cabang</th>
                <th className="px-4 py-3 font-semibold">Label</th>
                <th className="px-4 py-3 font-semibold">Tgl Daftar</th>
                <th className="px-4 py-3 font-semibold">HP / Sekolah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {filtered.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {r.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[r.nickname, r.gender, formatNumericDate(r.date_of_birth)]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-zinc-300">
                    {r.branch_name}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-zinc-300">
                    {r.label_name}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                    {formatNumericDate(r.registration_date)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-zinc-300">
                    <p>{r.phone || "-"}</p>
                    <p className="text-xs text-slate-500">{r.school || ""}</p>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Tidak ada data siswa REGISTERED.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
