"use client";

import { useState, useMemo } from "react";
import { Icons } from "@/components/ui/icons";
import { redeemStudentPoints } from "@/lib/actions";
import { formatShortDate } from "@/lib/dateUtils";

interface PointsClientWrapperProps {
  students: any[];
  activeBranchName?: string | null;
  initialRedemptions?: any[];
}

export function PointsClientWrapper({
  students: initialStudents,
  activeBranchName,
  initialRedemptions = [],
}: PointsClientWrapperProps) {
  const [students, setStudents] = useState(initialStudents);
  const [redemptions, setRedemptions] = useState(initialRedemptions);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"leaderboard" | "redeem" | "history">("leaderboard");

  // Modal State for Admin ACC Potong Poin
  const [selectedStudentForRedeem, setSelectedStudentForRedeem] = useState<any | null>(null);
  const [deductPoints, setDeductPoints] = useState<number | "">(1);
  const [rewardNote, setRewardNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sort students by net points descending for leaderboard
  const leaderboardStudents = useMemo(() => {
    const filtered = students.filter((s) => {
      if (s.status === "INACTIVE") return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
      );
    });
    return [...filtered].sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [students, searchQuery]);

  const activeStudents = useMemo(() => students.filter((s) => s.status !== "INACTIVE"), [students]);
  const totalStudents = activeStudents.length;
  const totalNetPoints = activeStudents.reduce((sum, s) => sum + (s.points || 0), 0);
  const totalRedeemedPoints = activeStudents.reduce((sum, s) => sum + (s.redeemed_points || 0), 0);

  const redeemFilteredStudents = useMemo(() => {
    return activeStudents.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
      );
    });
  }, [activeStudents, searchQuery]);

  const handleOpenRedeemModal = (student: any) => {
    setSelectedStudentForRedeem(student);
    setDeductPoints(1);
    setRewardNote("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleConfirmRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForRedeem) return;

    const pointsNum = Number(deductPoints);
    if (!pointsNum || pointsNum <= 0) {
      setErrorMsg("Masukkan jumlah poin yang valid (> 0).");
      return;
    }

    if (pointsNum > (selectedStudentForRedeem.points || 0)) {
      setErrorMsg(
        `Poin tidak cukup! Siswa hanya memiliki ${selectedStudentForRedeem.points || 0} poin tersisa.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const newRedemption = await redeemStudentPoints({
        studentId: selectedStudentForRedeem.id,
        branchId: selectedStudentForRedeem.branch_id,
        pointsDeducted: pointsNum,
        rewardNote: rewardNote.trim() || "Penukaran Hadiah (ACC Admin)",
      });

      // Update local state smoothly
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === selectedStudentForRedeem.id) {
            const newRedeemed = (s.redeemed_points || 0) + pointsNum;
            const newNet = Math.max(0, (s.gross_points || s.points || 0) - newRedeemed);
            return {
              ...s,
              redeemed_points: newRedeemed,
              points: newNet,
            };
          }
          return s;
        })
      );

      setRedemptions((prev) => [
        {
          ...newRedemption,
          student: {
            name: selectedStudentForRedeem.name,
            nickname: selectedStudentForRedeem.nickname,
          },
        },
        ...prev,
      ]);

      setSuccessMsg(`Berhasil memotong ${pointsNum} poin dari ${selectedStudentForRedeem.nickname || selectedStudentForRedeem.name}!`);
      setTimeout(() => {
        setSelectedStudentForRedeem(null);
        setSuccessMsg("");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memotong poin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-sky-600 to-indigo-700 p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sky-400 opacity-20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex flex-wrap items-center gap-x-2">
              <span>⭐ Poin Kehadiran & Hadiah</span>
              {activeBranchName && (
                <span className="text-sky-100 font-normal text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
                  ({activeBranchName})
                </span>
              )}
            </h2>
            <p className="text-sky-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Kelola poin kehadiran siswa (+1 tiap hadir) dan lakukan penukaran poin saat siswa mengambil hadiah di admin.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/20">
            <div className="text-2xl sm:text-3xl font-black text-white">{totalStudents}</div>
            <div className="text-[11px] sm:text-xs text-sky-100 font-semibold mt-0.5">Siswa Aktif</div>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/20">
            <div className="text-2xl sm:text-3xl font-black text-white">{totalNetPoints}</div>
            <div className="text-[11px] sm:text-xs text-sky-100 font-semibold mt-0.5">Total Poin Tersedia</div>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/20">
            <div className="text-2xl sm:text-3xl font-black text-white">{totalRedeemedPoints}</div>
            <div className="text-[11px] sm:text-xs text-sky-100 font-semibold mt-0.5">Total Poin Ditukar</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => setSelectedTab("leaderboard")}
          className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
            selectedTab === "leaderboard"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <span>🏆 <span className="hidden sm:inline">Leaderboard</span> Poin</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("redeem")}
          className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
            selectedTab === "redeem"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <span>🎁 ACC / Tukar <span className="hidden sm:inline">Poin</span></span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("history")}
          className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
            selectedTab === "history"
              ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <span>📜 Riwayat <span className="hidden sm:inline">Penukaran</span> ({redemptions.length})</span>
        </button>
      </div>

      {/* Tab 1: Leaderboard */}
      {selectedTab === "leaderboard" && (
        <>
          {/* Search */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Icons.search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all h-[44px]"
                placeholder="Cari nama siswa..."
              />
            </div>
          </div>

          {/* Top 3 Podium */}
          {leaderboardStudents.length >= 3 && !searchQuery && (
            <div className="grid grid-cols-3 gap-3 px-2">
              {/* 2nd Place */}
              <div className="flex flex-col items-center pt-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-lg border-2 border-white dark:border-slate-700">
                  🥈
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-2 text-center leading-tight line-clamp-2">
                  {leaderboardStudents[1]?.nickname || leaderboardStudents[1]?.name}
                </h4>
                <span className="mt-1 inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
                  ⭐ {leaderboardStudents[1]?.points || 0}
                </span>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-xl border-2 border-amber-300 relative">
                  👑
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-black text-amber-900 border-2 border-white shadow-sm">1</div>
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-2 text-center leading-tight line-clamp-2">
                  {leaderboardStudents[0]?.nickname || leaderboardStudents[0]?.name}
                </h4>
                <span className="mt-1 inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full text-xs font-extrabold text-amber-700 dark:text-amber-300">
                  ⭐ {leaderboardStudents[0]?.points || 0} Poin
                </span>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center pt-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-lg border-2 border-white dark:border-slate-700">
                  🥉
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-2 text-center leading-tight line-clamp-2">
                  {leaderboardStudents[2]?.nickname || leaderboardStudents[2]?.name}
                </h4>
                <span className="mt-1 inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 px-2.5 py-1 rounded-full text-xs font-bold text-orange-700 dark:text-orange-300">
                  ⭐ {leaderboardStudents[2]?.points || 0}
                </span>
              </div>
            </div>
          )}

          {/* Full Leaderboard List */}
          <div className="space-y-2.5">
            {leaderboardStudents.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-2xl ring-1 ring-slate-900/5">
                <div className="text-4xl mb-3">🔍</div>
                Tidak ada siswa ditemukan.
              </div>
            ) : (
              leaderboardStudents.map((student, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const medalEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

                return (
                  <div
                    key={student.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                      isTop3
                        ? "border-amber-200 dark:border-amber-800/60"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                    style={student.label ? { borderLeft: `4px solid ${student.label.hex_color}` } : {}}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4">
                      {/* Rank */}
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-sm sm:text-base font-black shrink-0 ${
                          rank === 1
                            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md"
                            : rank === 2
                            ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm"
                            : rank === 3
                            ? "bg-gradient-to-br from-amber-700 to-amber-800 text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {medalEmoji || `#${rank}`}
                      </div>

                      {/* Student Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            {student.name}
                          </h4>
                          {student.nickname && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                              ({student.nickname})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          {student.label ? (
                            <span className="flex items-center gap-1 font-medium">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: student.label.hex_color }}
                              />
                              {student.label.main_level} - {student.label.sub_level}
                            </span>
                          ) : (
                            <span>Belum ada level</span>
                          )}
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span>Hadir: {student.gross_points || student.points || 0}</span>
                          {student.redeemed_points > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                Ditukar: {student.redeemed_points}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Points Display (Read-Only) */}
                      <div className="shrink-0">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-extrabold ${
                            isTop3
                              ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          ⭐ {student.points || 0}
                          <span className="hidden sm:inline text-[10px] font-bold opacity-70">Poin</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Tab 2: ACC / Tukar Poin Siswa */}
      {selectedTab === "redeem" && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Icons.search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all h-[44px]"
                placeholder="Cari nama atau nama panggilan siswa untuk penukaran poin..."
              />
            </div>
          </div>

          {/* Information Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-400/5 to-amber-500/10 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xl shrink-0 border border-amber-200 dark:border-amber-800">
              💡
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                Alur Penukaran Hadiah di Admin
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                Hadiah fisik tersedia langsung di cabang/admin. Orang tua yang ingin menukar hadiah bisa datang/menghubungi admin. 
                Admin cukup mengklik tombol <strong>"ACC / Potong Poin"</strong> pada siswa yang bersangkutan dan memasukkan nominal poin yang dipotong.
              </p>
            </div>
          </div>

          {/* Student Grid for Redemption */}
          {redeemFilteredStudents.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-4xl mb-3">🔍</div>
              Tidak ada siswa ditemukan dengan kata kunci &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {redeemFilteredStudents.map((student) => {
                const hasPoints = (student.points || 0) > 0;
                return (
                  <div
                    key={student.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between"
                    style={student.label ? { borderTop: `4px solid ${student.label.hex_color}` } : {}}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                            {student.name}
                          </h4>
                          {student.nickname && (
                            <span className="text-xs text-slate-400">({student.nickname})</span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-xl text-xs font-black border border-amber-200 dark:border-amber-800">
                          ⭐ {student.points || 0} Poin
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Total Kehadiran:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{student.gross_points || student.points || 0} Pertemuan (+{student.gross_points || student.points || 0} Poin)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sudah Ditukar:</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">-{student.redeemed_points || 0} Poin</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRedeemModal(student)}
                      disabled={!hasPoints}
                      className={`mt-4 w-full py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        hasPoints
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      🎁 ACC / Potong Poin Siswa
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Riwayat Penukaran */}
      {selectedTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              📜 Riwayat Penukaran / Pemotongan Poin oleh Admin
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Catatan riwayat saat admin meng-ACC penukaran hadiah siswa
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {redemptions.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Belum ada riwayat penukaran poin.
              </div>
            ) : (
              redemptions.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.student?.nickname || item.student?.name || "Siswa"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.reward_note || "Penukaran Hadiah"}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {item.created_at ? formatShortDate(item.created_at) : "-"}
                    </span>
                  </div>

                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-3 py-1.5 rounded-xl text-xs font-black border border-rose-200 dark:border-rose-800">
                      -{item.points_deducted} Poin
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal ACC Potong Poin */}
      {selectedStudentForRedeem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isSubmitting && setSelectedStudentForRedeem(null)}
          />

          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    ACC / Potong Poin Hadiah
                  </h3>
                  <p className="text-xs text-slate-500">Konfirmasi penukaran poin siswa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setSelectedStudentForRedeem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Student Info Box */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 mb-4 text-xs">
              <div className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                {selectedStudentForRedeem.name}
              </div>
              <div className="flex justify-between mt-1 text-amber-800 dark:text-amber-300">
                <span>Poin Tersedia Saat Ini:</span>
                <span className="font-black text-amber-700 dark:text-amber-300">
                  ⭐ {selectedStudentForRedeem.points || 0} Poin
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800">
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                ✅ {successMsg}
              </div>
            )}

            <form onSubmit={handleConfirmRedeem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Poin yang Dipotong / Ditukar <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedStudentForRedeem.points || 0}
                  required
                  value={deductPoints}
                  onChange={(e) => setDeductPoints(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Contoh: 5"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan Hadiah / Barang <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={rewardNote}
                  onChange={(e) => setRewardNote(e.target.value)}
                  placeholder="Contoh: Pensil Warna 12 Warna / Mainan Puzzle"
                  className="w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForRedeem(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi Potong Poin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
