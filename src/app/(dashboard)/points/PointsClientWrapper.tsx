"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "@/components/ui/icons";
import { redeemStudentPoints, addManualStudentPoints } from "@/lib/actions";
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

  // Modal State for Admin Tambah Poin Manual (Bonus / Lomba)
  const [selectedStudentForAdd, setSelectedStudentForAdd] = useState<any | null>(null);
  const [addPointsVal, setAddPointsVal] = useState<number | "">(1);
  const [addNote, setAddNote] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addErrorMsg, setAddErrorMsg] = useState("");
  const [addSuccessMsg, setAddSuccessMsg] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearchInModal, setStudentSearchInModal] = useState("");
  const studentSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isStudentDropdownOpen) {
      setTimeout(() => {
        studentSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isStudentDropdownOpen]);

  // Active students list (exclude INACTIVE and CG)
  const activeStudents = useMemo(
    () => students.filter((s) => s.status !== "INACTIVE" && s.status !== "CG"),
    [students]
  );

  const filteredModalStudents = useMemo(() => {
    if (!studentSearchInModal.trim()) return activeStudents;
    const q = studentSearchInModal.toLowerCase();
    return activeStudents.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        (st.nickname && st.nickname.toLowerCase().includes(q))
    );
  }, [activeStudents, studentSearchInModal]);

  // Sort students by net points descending for leaderboard
  const leaderboardStudents = useMemo(() => {
    const filtered = activeStudents.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
      );
    });
    return [...filtered].sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [activeStudents, searchQuery]);

  const totalStudents = activeStudents.length;
  const totalNetPoints = activeStudents.reduce((sum, s) => sum + (s.points || 0), 0);
  const totalRedeemedPoints = activeStudents.reduce((sum, s) => sum + Math.max(0, s.redeemed_points || 0), 0);

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

  // Handlers for Redeem Modal
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

  // Handlers for Add Points Modal
  const handleOpenAddModal = (student?: any) => {
    const targetStudent = student || activeStudents[0] || null;
    setSelectedStudentForAdd(targetStudent);
    setAddPointsVal(1);
    setAddNote("");
    setAddErrorMsg("");
    setAddSuccessMsg("");
    setIsStudentDropdownOpen(false);
    setStudentSearchInModal("");
  };

  const handleConfirmAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForAdd) return;

    const pointsNum = Number(addPointsVal);
    if (!pointsNum || pointsNum <= 0) {
      setAddErrorMsg("Masukkan jumlah poin tambahan yang valid (> 0).");
      return;
    }

    setIsSubmittingAdd(true);
    setAddErrorMsg("");
    try {
      const newRecord = await addManualStudentPoints({
        studentId: selectedStudentForAdd.id,
        branchId: selectedStudentForAdd.branch_id,
        pointsAdded: pointsNum,
        note: addNote.trim() || "Bonus Poin Manual / Lomba",
      });

      // Update local state smoothly
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === selectedStudentForAdd.id) {
            const newRedeemed = (s.redeemed_points || 0) - pointsNum;
            const newNet = (s.gross_points || 0) - newRedeemed;
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
          ...newRecord,
          student: {
            name: selectedStudentForAdd.name,
            nickname: selectedStudentForAdd.nickname,
          },
        },
        ...prev,
      ]);

      setAddSuccessMsg(
        `Berhasil menambahkan +${pointsNum} poin bonus ke ${selectedStudentForAdd.nickname || selectedStudentForAdd.name}!`
      );
      setTimeout(() => {
        setSelectedStudentForAdd(null);
        setAddSuccessMsg("");
      }, 1500);
    } catch (err: any) {
      setAddErrorMsg(err.message || "Gagal menambah poin.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-sky-600 to-indigo-700 p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sky-400 opacity-20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
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
              Kelola poin kehadiran (+1 tiap hadir), tambah poin manual (lomba/prestasi), dan potong poin saat siswa menukar hadiah.
            </p>
          </div>

          {/* Quick Action: Tambah Poin Manual */}
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold px-4 py-3 rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 border border-emerald-300/40 hover:scale-105 active:scale-95 transition-all cursor-pointer text-xs sm:text-sm"
          >
            <Icons.add className="w-4 h-4 shrink-0" />
            <span>Tambah Poin Manual +</span>
          </button>
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
          <span>🎁 Kelola <span className="hidden sm:inline">& Potong Poin</span></span>
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
          <span>📜 Riwayat <span className="hidden sm:inline">Poin & Hadiah</span> ({redemptions.length})</span>
        </button>
      </div>

      {/* Tab 1: Leaderboard */}
      {selectedTab === "leaderboard" && (
        <>
          {/* Search & Actions Bar */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:flex-1">
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
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Icons.add className="w-3.5 h-3.5" />
              <span>Tambah Poin Manual (Lomba/Bonus)</span>
            </button>
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
                    <div className="flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
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
                      </div>

                      {/* Quick Action + Points */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(student)}
                          className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Tambah Poin Manual (Bonus/Lomba)"
                        >
                          <Icons.add className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">+ Poin</span>
                        </button>

                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold ${
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

      {/* Tab 2: Kelola & Potong Poin Siswa */}
      {selectedTab === "redeem" && (
        <div className="space-y-6">
          {/* Search Box & Add Button */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:flex-1">
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
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Icons.add className="w-3.5 h-3.5" />
              <span>Tambah Poin Manual +</span>
            </button>
          </div>

          {/* Information Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-400/5 to-amber-500/10 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xl shrink-0 border border-amber-200 dark:border-amber-800">
              💡
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                Fitur Kelola Poin Siswa (Tambah Bonus / Potong Hadiah)
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                Anda dapat menambahkan poin tambahan (lomba, event, prestasi) menggunakan tombol <strong>&quot;+ Tambah Poin&quot;</strong> atau memotong poin saat siswa menukar hadiah fisik menggunakan tombol <strong>&quot;🎁 Potong Poin&quot;</strong>.
              </p>
            </div>
          </div>

          {/* Student Grid for Redemption / Bonus */}
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
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{student.gross_points || student.points || 0} Pertemuan</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status Penukaran:</span>
                          <span className={`font-semibold ${student.redeemed_points > 0 ? 'text-rose-600 dark:text-rose-400' : student.redeemed_points < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                            {student.redeemed_points > 0 ? `-${student.redeemed_points} Poin Ditukar` : student.redeemed_points < 0 ? `+${Math.abs(student.redeemed_points)} Poin Bonus` : 'Belum Pernah Ditukar'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dual Action Buttons */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(student)}
                        className="w-full py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Icons.add className="w-3.5 h-3.5" />
                        <span>+ Tambah Poin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRedeemModal(student)}
                        disabled={!hasPoints}
                        className={`w-full py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          hasPoints
                            ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                        }`}
                      >
                        <span>🎁 Potong Poin</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Riwayat Penukaran & Bonus */}
      {selectedTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                📜 Riwayat Penukaran Hadiah & Bonus Poin Manual
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Catatan aktivitas pemotongan hadiah dan penambahan poin bonus/lomba oleh admin
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
            >
              <Icons.add className="w-3.5 h-3.5" />
              <span>Tambah Bonus +</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {redemptions.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Belum ada riwayat aktivitas poin.
              </div>
            ) : (
              redemptions.map((item) => {
                const isBonus = item.points_deducted < 0;
                const pointsAmount = Math.abs(item.points_deducted);

                return (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                          isBonus
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {isBonus ? "🏆" : "🎁"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.student?.nickname || item.student?.name || "Siswa"}
                          </h4>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isBonus
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {isBonus ? "Bonus Poin" : "Tukar Hadiah"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                          {item.reward_note || (isBonus ? "Bonus Poin Manual" : "Penukaran Hadiah")}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.created_at ? formatShortDate(item.created_at) : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border ${
                          isBonus
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {isBonus ? `+${pointsAmount} Poin` : `-${pointsAmount} Poin`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal 1: ACC Potong Poin Hadiah */}
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer"
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
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
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

      {/* Modal 2: Tambah Poin Manual (Bonus / Lomba) */}
      {selectedStudentForAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isSubmittingAdd && setSelectedStudentForAdd(null)}
          />

          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Tambah Poin Manual (Bonus / Lomba)
                  </h3>
                  <p className="text-xs text-slate-500">Berikan tambahan poin prestasi atau lomba</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingAdd && setSelectedStudentForAdd(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Custom Dropdown Student Picker */}
            <div className="relative mb-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Siswa <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold shadow-xs hover:border-emerald-500 cursor-pointer text-left transition-all"
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="truncate">
                    {selectedStudentForAdd.name} {selectedStudentForAdd.nickname ? `(${selectedStudentForAdd.nickname})` : ""}
                  </span>
                  <span className="shrink-0 text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    ⭐ {selectedStudentForAdd.points || 0} Poin
                  </span>
                </div>
                <Icons.chevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isStudentDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isStudentDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="sticky top-0 bg-white dark:bg-slate-900 pb-1 z-10">
                    <input
                      ref={studentSearchInputRef}
                      type="text"
                      value={studentSearchInModal}
                      onChange={(e) => setStudentSearchInModal(e.target.value)}
                      placeholder="🔍 Cari nama siswa dalam daftar..."
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      autoFocus
                    />
                  </div>

                  {filteredModalStudents.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Tidak ada siswa ditemukan.
                    </div>
                  ) : (
                    filteredModalStudents.map((st) => {
                      const isSel = selectedStudentForAdd.id === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentForAdd(st);
                            setIsStudentDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSel
                              ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          }`}
                        >
                          <span className="truncate">
                            {st.name} {st.nickname ? `(${st.nickname})` : ""}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              ⭐ {st.points || 0}
                            </span>
                            {isSel && <span className="text-emerald-600 text-xs font-bold">✓</span>}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {addErrorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800">
                ⚠️ {addErrorMsg}
              </div>
            )}

            {addSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                ✅ {addSuccessMsg}
              </div>
            )}

            <form onSubmit={handleConfirmAddPoints} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Poin Tambahan <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={addPointsVal}
                    onChange={(e) => setAddPointsVal(e.target.value ? Number(e.target.value) : "")}
                    placeholder="Contoh: 5"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {/* Preset point buttons */}
                  {[1, 2, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAddPointsVal(num)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        addPointsVal === num
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Alasan Penambahan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="Contoh: Juara 1 Lomba Mewarnai / Event Khusus"
                  className="w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForAdd(null)}
                  disabled={isSubmittingAdd}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSubmittingAdd ? "Memproses..." : "⭐ Tambah Poin Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
