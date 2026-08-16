"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "@/components/ui/icons";
import {
  redeemStudentPoints,
  addManualStudentPoints,
  getModuleLockPasswords,
} from "@/lib/actions";
import { formatShortDate } from "@/lib/dateUtils";

interface PointsClientWrapperProps {
  students: any[];
  activeBranchName?: string | null;
  initialRedemptions?: any[];
  initialAttendanceHistory?: any[];
}

export function PointsClientWrapper({
  students: initialStudents,
  activeBranchName,
  initialRedemptions = [],
  initialAttendanceHistory = [],
}: PointsClientWrapperProps) {
  const [students, setStudents] = useState(initialStudents);
  const [redemptions, setRedemptions] = useState(initialRedemptions);
  const [attendanceHistory, setAttendanceHistory] = useState(
    initialAttendanceHistory,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<
    "leaderboard" | "redeem" | "history"
  >("leaderboard");
  const [selectedHistoryStudent, setSelectedHistoryStudent] =
    useState<string>("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<
    "all" | "attendance" | "extra" | "redeem"
  >("all");

  // Lock protection state for "+ Tambah Poin" action
  const [showAddLockModal, setShowAddLockModal] = useState(false);
  const [pendingAddStudent, setPendingAddStudent] = useState<any>(null);
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState("");

  // Modal State for Admin ACC Potong Poin
  const [selectedStudentForRedeem, setSelectedStudentForRedeem] = useState<
    any | null
  >(null);
  const [deductPoints, setDeductPoints] = useState<number | "">(1);
  const [rewardNote, setRewardNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State for Admin Tambah Poin Manual (Bonus / Lomba)
  const [selectedStudentForAdd, setSelectedStudentForAdd] = useState<
    any | null
  >(null);

  // Modal State for History View
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<
    any | null
  >(null);

  const [addPointsVal, setAddPointsVal] = useState<number | "">(1);
  const [addNote, setAddNote] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addErrorMsg, setAddErrorMsg] = useState("");
  const [addSuccessMsg, setAddSuccessMsg] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearchInModal, setStudentSearchInModal] = useState("");
  const studentSearchInputRef = useRef<HTMLInputElement>(null);

  // Custom Searchable Dropdown state for History Student Filter
  const [isHistoryStudentOpen, setIsHistoryStudentOpen] = useState(false);
  const [historyStudentSearch, setHistoryStudentSearch] = useState("");
  const historyStudentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStudentDropdownOpen) {
      setTimeout(() => {
        studentSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isStudentDropdownOpen]);

  // Close history student dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        historyStudentRef.current &&
        !historyStudentRef.current.contains(e.target as Node)
      ) {
        setIsHistoryStudentOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Active students list (exclude INACTIVE and CG)
  const activeStudents = useMemo(
    () => students.filter((s) => s.status !== "INACTIVE" && s.status !== "CG"),
    [students],
  );

  const filteredModalStudents = useMemo(() => {
    let result = activeStudents;

    // Filter based on search query
    if (studentSearchInModal.trim()) {
      const q = studentSearchInModal.toLowerCase();
      result = activeStudents.filter(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          (st.nickname && st.nickname.toLowerCase().includes(q)),
      );
    }

    // Sort alphabetically by name (ABC) - primary sort
    // If names are same, sort by nickname as fallback
    return result.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, "id");
      if (nameCompare !== 0) return nameCompare;

      // If names are equal, compare nicknames
      const nickA = a.nickname || "";
      const nickB = b.nickname || "";
      return nickA.localeCompare(nickB, "id");
    });
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
  const totalNetPoints = activeStudents.reduce(
    (sum, s) => sum + (s.points || 0),
    0,
  );
  const totalRedeemedPoints = activeStudents.reduce(
    (sum, s) => sum + Math.max(0, s.redeemed_points || 0),
    0,
  );

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

  const combinedHistory = useMemo(() => {
    const list: any[] = [];

    // 1. Attendance history (Poin Pertemuan)
    if (historyTypeFilter === "all" || historyTypeFilter === "attendance") {
      attendanceHistory.forEach((item: any) => {
        const isAbsent = item.is_absent;
        list.push({
          id: `att_${item.id}`,
          raw_id: item.id,
          kind: "attendance",
          created_at: item.created_at,
          student_id: item.student_id,
          student: item.student,
          title: item.title || "Lembar Perkembangan Siswa",
          note: item.materi
            ? `Materi: ${item.materi}`
            : isAbsent
              ? "Status: Tidak Hadir / Libur"
              : "Presensi Pertemuan Kelas (+1 Poin Pertemuan)",
          is_absent: isAbsent,
          badgeLabel: isAbsent ? "Absensi (Libur/Izin)" : "Poin Pertemuan",
          displayPoints: isAbsent ? "0 Poin" : "+1 Poin",
        });
      });
    }

    // 2. Extra bonus & redemption history (Poin Extra & Point Ditukar)
    redemptions.forEach((item: any) => {
      const isBonus = item.points_deducted < 0;
      const pts = Math.abs(item.points_deducted);

      if (
        historyTypeFilter === "all" ||
        (historyTypeFilter === "extra" && isBonus) ||
        (historyTypeFilter === "redeem" && !isBonus)
      ) {
        list.push({
          id: `red_${item.id}`,
          raw_id: item.id,
          kind: "extra_redeem",
          created_at: item.created_at,
          student_id: item.student_id,
          student: item.student,
          title: isBonus
            ? "Poin Extra (Bonus / Lomba)"
            : "Point Ditukar (Hadiah)",
          note:
            item.reward_note ||
            (isBonus ? "Poin Extra Manual" : "Point Ditukar (Hadiah)"),
          is_bonus: isBonus,
          badgeLabel: isBonus ? "Poin Extra" : "Point Ditukar",
          displayPoints: isBonus ? `+${pts} Poin` : `-${pts} Poin`,
        });
      }
    });

    // Sort descending by created_at date
    list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Filter by selected student dropdown
    let result = list;
    if (selectedHistoryStudent) {
      result = result.filter(
        (item) => item.student_id === selectedHistoryStudent,
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const sName = item.student?.name?.toLowerCase() || "";
        const sNick = item.student?.nickname?.toLowerCase() || "";
        const note = item.note?.toLowerCase() || "";
        const title = item.title?.toLowerCase() || "";
        return (
          sName.includes(q) ||
          sNick.includes(q) ||
          note.includes(q) ||
          title.includes(q)
        );
      });
    }

    return result;
  }, [
    attendanceHistory,
    redemptions,
    historyTypeFilter,
    selectedHistoryStudent,
    searchQuery,
  ]);

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
        `Poin tidak cukup! Siswa hanya memiliki ${selectedStudentForRedeem.points || 0} poin tersisa.`,
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
            const newNet = Math.max(
              0,
              (s.gross_points || s.points || 0) - newRedeemed,
            );
            return {
              ...s,
              redeemed_points: newRedeemed,
              points: newNet,
            };
          }
          return s;
        }),
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

      setSuccessMsg(
        `Berhasil memotong ${pointsNum} poin dari ${selectedStudentForRedeem.nickname || selectedStudentForRedeem.name}!`,
      );
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

  const handleAddPointsClick = async (student?: any) => {
    try {
      const passwords = await getModuleLockPasswords();
      const expectedPassword = passwords["/points"];
      if (expectedPassword === "") {
        handleOpenAddModal(student);
        return;
      }
    } catch {}

    setPendingAddStudent(student || activeStudents[0] || null);
    setLockPassword("");
    setLockError("");
    setShowAddLockModal(true);
  };

  const handleUnlockAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const passwords = await getModuleLockPasswords();
      const expectedPassword = passwords["/points"] ?? "123";
      if (lockPassword === expectedPassword) {
        setShowAddLockModal(false);
        handleOpenAddModal(pendingAddStudent);
      } else {
        setLockError(
          "Password salah! Silakan periksa kembali atau hubungi SuperAdmin.",
        );
      }
    } catch {
      if (lockPassword === "123") {
        setShowAddLockModal(false);
        handleOpenAddModal(pendingAddStudent);
      } else {
        setLockError(
          "Password salah! Silakan periksa kembali atau hubungi SuperAdmin.",
        );
      }
    }
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
        }),
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
        `Berhasil menambahkan +${pointsNum} poin bonus ke ${selectedStudentForAdd.nickname || selectedStudentForAdd.name}!`,
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

        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex flex-wrap items-center gap-x-2">
            <span>⭐ Poin Kehadiran & Hadiah</span>
            {activeBranchName && (
              <span className="text-sky-100 font-normal text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
                ({activeBranchName})
              </span>
            )}
          </h2>
          <p className="text-sky-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
            Kelola poin kehadiran (+1 tiap hadir), tambah poin manual
            (lomba/prestasi), dan potong poin saat siswa menukar hadiah.
          </p>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/20">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {totalStudents}
            </div>
            <div className="text-[11px] sm:text-xs text-sky-100 font-semibold mt-0.5">
              Siswa Aktif
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/20">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {totalNetPoints}
            </div>
            <div className="text-[11px] sm:text-xs text-sky-100 font-semibold mt-0.5">
              Total Poin Tersedia
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/20">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {totalRedeemedPoints}
            </div>
            <div className="text-[11px] sm:text-xs text-sky-100 font-semibold mt-0.5">
              Total Poin Ditukar
            </div>
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
          <span>
            🏆 <span className="hidden sm:inline">Leaderboard</span> Poin
          </span>
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
          <span>
            🎁 Kelola <span className="hidden sm:inline">& Point Ditukar</span>
          </span>
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
          <span>
            📜 Riwayat <span className="hidden sm:inline">Poin & Hadiah</span> (
            {redemptions.length})
          </span>
        </button>
      </div>

      {/* Tab 1: Leaderboard */}
      {selectedTab === "leaderboard" && (
        <>
          {/* Search Bar */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Icons.search
                  className="h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all h-[44px]"
                placeholder="Cari nama siswa di leaderboard..."
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
                  {leaderboardStudents[1]?.nickname ||
                    leaderboardStudents[1]?.name}
                </h4>
                <span className="mt-1 inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
                  ⭐ {leaderboardStudents[1]?.points || 0}
                </span>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-xl border-2 border-amber-300 relative">
                  👑
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-black text-amber-900 border-2 border-white shadow-sm">
                    1
                  </div>
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-2 text-center leading-tight line-clamp-2">
                  {leaderboardStudents[0]?.nickname ||
                    leaderboardStudents[0]?.name}
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
                  {leaderboardStudents[2]?.nickname ||
                    leaderboardStudents[2]?.name}
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
                const medalEmoji =
                  rank === 1
                    ? "🥇"
                    : rank === 2
                      ? "🥈"
                      : rank === 3
                        ? "🥉"
                        : null;

                return (
                  <div
                    key={student.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                      isTop3
                        ? "border-amber-200 dark:border-amber-800/60"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                    style={
                      student.label
                        ? { borderLeft: `4px solid ${student.label.hex_color}` }
                        : {}
                    }
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
                                  style={{
                                    backgroundColor: student.label.hex_color,
                                  }}
                                />
                                {student.label.main_level} -{" "}
                                {student.label.sub_level}
                              </span>
                            ) : (
                              <span>Belum ada level</span>
                            )}
                            <span className="text-slate-300 dark:text-slate-700">
                              ·
                            </span>
                            <span>
                              Poin Pertemuan: {student.gross_points || 0}
                            </span>
                            {student.redeemed_points > 0 && (
                              <>
                                <span className="text-slate-300 dark:text-slate-700">
                                  ·
                                </span>
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  Ditukar: {student.redeemed_points}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Points Showcase Badge */}
                      <div
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold ${
                          isTop3
                            ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        ⭐ {student.points || 0}
                        <span className="hidden sm:inline text-[10px] font-bold opacity-70">
                          Poin
                        </span>
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
          {/* Search Box */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Icons.search
                  className="h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
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

          {/* Information Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-400/5 to-amber-500/10 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xl shrink-0 border border-amber-200 dark:border-amber-800">
              💡
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                Fitur Kelola Poin Siswa (Tambah Extra / Point Ditukar)
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                Anda dapat menambahkan poin tambahan (lomba, event, prestasi)
                menggunakan tombol <strong>&quot;+ Tambah Poin&quot;</strong>{" "}
                atau memotong poin saat siswa menukar hadiah fisik menggunakan
                tombol <strong>&quot;🎁 Point Ditukar&quot;</strong>.
              </p>
            </div>
          </div>

          {/* Student Grid for Redemption / Bonus */}
          {redeemFilteredStudents.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-4xl mb-3">🔍</div>
              Tidak ada siswa ditemukan dengan kata kunci &quot;{searchQuery}
              &quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {redeemFilteredStudents.map((student) => {
                const hasPoints = (student.points || 0) > 0;
                const meetingPoints = student.gross_points || 0;

                const studentRedemptions = redemptions.filter(
                  (r) => r.student_id === student.id,
                );
                let extraPoints = studentRedemptions
                  .filter((r) => (r.points_deducted || 0) < 0)
                  .reduce(
                    (sum, r) => sum + Math.abs(r.points_deducted || 0),
                    0,
                  );
                let redeemedPoints = studentRedemptions
                  .filter((r) => (r.points_deducted || 0) > 0)
                  .reduce((sum, r) => sum + (r.points_deducted || 0), 0);

                if (
                  studentRedemptions.length === 0 &&
                  student.redeemed_points
                ) {
                  if (student.redeemed_points < 0) {
                    extraPoints = Math.abs(student.redeemed_points);
                  } else if (student.redeemed_points > 0) {
                    redeemedPoints = student.redeemed_points;
                  }
                }

                return (
                  <div
                    key={student.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between"
                    style={
                      student.label
                        ? { borderTop: `4px solid ${student.label.hex_color}` }
                        : {}
                    }
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                            {student.name}
                          </h4>
                          {student.nickname && (
                            <span className="text-xs text-slate-400">
                              ({student.nickname})
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-xl text-xs font-black border border-amber-200 dark:border-amber-800">
                          ⭐ {student.points || 0} Poin
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Poin Pertemuan:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {meetingPoints} Pertemuan
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Poin Extra:</span>
                          <span
                            className={`font-semibold ${extraPoints > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}
                          >
                            {extraPoints > 0
                              ? `+${extraPoints} Poin`
                              : "0 Poin"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Poin Ditukar:</span>
                          <span
                            className={`font-semibold ${redeemedPoints > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500"}`}
                          >
                            {redeemedPoints > 0
                              ? `-${redeemedPoints} Poin`
                              : "0 Poin"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tri-action Buttons: Add Points, History, Redeem */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {/* Tombol + Tambah Poin */}
                      <button
                        type="button"
                        onClick={() => handleAddPointsClick(student)}
                        className="w-full py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Icons.add className="w-3.5 h-3.5" />
                        <span>+ Tambah Poin</span>
                      </button>

                      {/* Tombol Lihat Riwayat Siswa */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentForHistory(student);
                          setIsHistoryModalOpen(true);
                        }}
                        className="w-full py-2 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        <span>Riwayat</span>
                      </button>

                      {/* Tombol Point Ditukar */}
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
                        <span>🎁 Point Ditukar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Riwayat Penukaran, Extra & Kehadiran */}
      {selectedTab === "history" && (
        <div className="space-y-6">
          {/* Controls: Student Dropdown Filter & Search Bar */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Custom Searchable Student Filter Dropdown */}
              <div className="relative" ref={historyStudentRef}>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  👤 Filter Siswa:
                </label>
                <button
                  type="button"
                  onClick={() => setIsHistoryStudentOpen(!isHistoryStudentOpen)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between gap-2 h-[44px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-amber-500 font-bold">👤</span>
                    <span className="truncate">
                      {selectedHistoryStudent
                        ? activeStudents.find(
                            (s) => s.id === selectedHistoryStudent,
                          )?.name || "Siswa Terpilih"
                        : `-- Semua Siswa (${activeStudents.length}) --`}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs shrink-0">
                    {isHistoryStudentOpen ? "▲" : "▼"}
                  </span>
                </button>

                {/* Popover Menu */}
                {isHistoryStudentOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 max-h-72 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    {/* Popover Search */}
                    <div className="relative mb-2 shrink-0">
                      <Icons.search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={historyStudentSearch}
                        onChange={(e) =>
                          setHistoryStudentSearch(e.target.value)
                        }
                        placeholder="Cari siswa..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-none focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    {/* Popover Student List */}
                    <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHistoryStudent("");
                          setIsHistoryStudentOpen(false);
                          setHistoryStudentSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                          !selectedHistoryStudent
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span>✨ Semua Siswa ({activeStudents.length})</span>
                        {!selectedHistoryStudent && <span>✓</span>}
                      </button>

                      {[...activeStudents]
                        .filter((st) => {
                          if (!historyStudentSearch.trim()) return true;
                          const q = historyStudentSearch.toLowerCase();
                          return (
                            st.name.toLowerCase().includes(q) ||
                            (st.nickname &&
                              st.nickname.toLowerCase().includes(q))
                          );
                        })
                        .sort((a, b) => {
                          const nameCompare = a.name.localeCompare(
                            b.name,
                            "id",
                          );
                          if (nameCompare !== 0) return nameCompare;

                          // If names are equal, compare nicknames
                          const nickA = a.nickname || "";
                          const nickB = b.nickname || "";
                          return nickA.localeCompare(nickB, "id");
                        })
                        .map((st) => {
                          const isSelected = selectedHistoryStudent === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setSelectedHistoryStudent(st.id);
                                setIsHistoryStudentOpen(false);
                                setHistoryStudentSearch("");
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              <div className="truncate pr-2">
                                <span className="font-bold">{st.name}</span>
                                {st.nickname && (
                                  <span className="text-slate-400 text-[11px] ml-1">
                                    ({st.nickname})
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <span className="text-amber-600 font-black">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Text Search Bar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  🔍 Pencarian Kata Kunci:
                </label>
                <div className="relative w-full">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Icons.search
                      className="h-4 w-4 text-slate-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all h-[44px]"
                    placeholder="Cari materi, keterangan..."
                  />
                </div>
              </div>
            </div>

            {/* Category Segmented Control Layout: Separate Extra and Redeem */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                🏷️ Kategori Riwayat:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter("all")}
                  className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center truncate ${
                    historyTypeFilter === "all"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>Semua</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter("attendance")}
                  className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center truncate ${
                    historyTypeFilter === "attendance"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                  }`}
                >
                  <span>📅 Pertemuan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter("extra")}
                  className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center truncate ${
                    historyTypeFilter === "extra"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  }`}
                >
                  <span>🏆 Poin Extra</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter("redeem")}
                  className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center truncate ${
                    historyTypeFilter === "redeem"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  }`}
                >
                  <span>🎁 Point Ditukar</span>
                </button>
              </div>
            </div>
          </div>

          {/* History List Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  📜 Log Riwayat Aktivitas Poin
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedHistoryStudent
                    ? "Menampilkan riwayat aktivitas untuk siswa terpilih"
                    : "Catatan presensi kelas, poin extra manual, dan penukaran hadiah"}
                </p>
              </div>
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                {combinedHistory.length} Record
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {combinedHistory.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  <div className="text-3xl mb-2">📜</div>
                  {searchQuery || selectedHistoryStudent
                    ? "Tidak ada data riwayat sesuai filter yang dipilih."
                    : "Belum ada riwayat aktivitas poin."}
                </div>
              ) : (
                combinedHistory.map((item) => {
                  const isAttendance = item.kind === "attendance";
                  const isBonus = item.is_bonus;
                  const isAbsent = item.is_absent;

                  return (
                    <div
                      key={item.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                            isAttendance
                              ? isAbsent
                                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                : "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                              : isBonus
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {isAttendance
                            ? isAbsent
                              ? "⏸️"
                              : "📅"
                            : isBonus
                              ? "🏆"
                              : "🎁"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.student?.name || "Siswa"}
                            </h4>
                            {item.student?.nickname && (
                              <span className="text-xs text-slate-400">
                                ({item.student.nickname})
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isAttendance
                                  ? isAbsent
                                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                    : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                                  : isBonus
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {item.badgeLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                            {item.note}
                          </p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {item.created_at
                              ? formatShortDate(item.created_at)
                              : "-"}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border ${
                            isAttendance
                              ? isAbsent
                                ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                              : isBonus
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {item.displayPoints}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
                    ACC / Point Ditukar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfirmasi penukaran poin siswa untuk hadiah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  !isSubmitting && setSelectedStudentForRedeem(null)
                }
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
                  Jumlah Point Ditukar <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedStudentForRedeem.points || 0}
                  required
                  value={deductPoints}
                  onChange={(e) =>
                    setDeductPoints(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  placeholder="Contoh: 5"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan Hadiah / Barang{" "}
                  <span className="text-slate-400 font-normal">(Opsional)</span>
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
                  {isSubmitting ? "Memproses..." : "Konfirmasi Point Ditukar"}
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
                  <p className="text-xs text-slate-500">
                    Berikan tambahan poin prestasi atau lomba
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  !isSubmittingAdd && setSelectedStudentForAdd(null)
                }
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
                    {selectedStudentForAdd.name}{" "}
                    {selectedStudentForAdd.nickname
                      ? `(${selectedStudentForAdd.nickname})`
                      : ""}
                  </span>
                  <span className="shrink-0 text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    ⭐ {selectedStudentForAdd.points || 0} Poin
                  </span>
                </div>
                <Icons.chevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isStudentDropdownOpen ? "rotate-180" : ""}`}
                />
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
                            {isSel && (
                              <span className="text-emerald-600 text-xs font-bold">
                                ✓
                              </span>
                            )}
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
                    onChange={(e) =>
                      setAddPointsVal(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
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
                  Keterangan / Alasan Penambahan{" "}
                  <span className="text-red-500">*</span>
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

      {/* Modal Lock Akses Tambah Poin */}
      {showAddLockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowAddLockModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl shadow-sm">
              🔒
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Akses Tambah Poin Dikunci
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Fitur Tambah Poin Manual dilindungi SuperAdmin. Masukkan
                password PIN untuk membuka fitur ini.
              </p>
            </div>

            <form onSubmit={handleUnlockAddPoints} className="space-y-4 pt-1">
              <div>
                <input
                  type="password"
                  autoFocus
                  required
                  value={lockPassword}
                  onChange={(e) => {
                    setLockPassword(e.target.value);
                    setLockError("");
                  }}
                  placeholder="Masukkan password PIN..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
                {lockError && (
                  <p className="text-xs text-red-500 font-semibold mt-2 animate-in fade-in">
                    {lockError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddLockModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm"
                >
                  Buka Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lihat Riwayat Point Siswa */}
      {isHistoryModalOpen &&
        selectedStudentForHistory &&
        (() => {
          const studentRedemptions = redemptions.filter(
            (h: any) => h.student_id === selectedStudentForHistory.id,
          );
          const studentAttendance = attendanceHistory.filter(
            (h: any) => h.student_id === selectedStudentForHistory.id,
          );

          // Pisahkan data: attendance, bonus_manual, redeem
          const attendanceOnly = studentAttendance.map((item) => ({
            ...item,
            category: "attendance",
            displayPoints: item.points_deducted || 1,
            description:
              item.title || (item.is_absent ? "Tidak Hadir" : "Hadir"),
          }));

          const bonusManualOnly = studentRedemptions
            .filter((r: any) => r.points_deducted < 0)
            .map((item) => ({
              ...item,
              category: "bonus",
              displayPoints: Math.abs(item.points_deducted),
              description: item.reward_note,
            }));

          const redeemOnly = studentRedemptions
            .filter((r: any) => r.points_deducted > 0)
            .map((item) => ({
              ...item,
              category: "redeem",
              displayPoints: item.points_deducted,
              description: item.reward_note,
            }));

          // Gabungkan semua untuk tampilan chronologis
          const allHistoryCombined = [
            ...attendanceOnly.map((i) => ({ ...i, dateLabel: i.created_at })),
            ...bonusManualOnly.map((i) => ({ ...i, dateLabel: i.created_at })),
            ...redeemOnly.map((i) => ({ ...i, dateLabel: i.created_at })),
          ].sort(
            (a, b) =>
              new Date(a.dateLabel).getTime() - new Date(b.dateLabel).getTime(),
          );

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setIsHistoryModalOpen(false)}
              />
              <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-5 text-white shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold flex items-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        Riwayat Point {selectedStudentForHistory.name}
                      </h3>
                      <p className="text-xs text-sky-100 mt-0.5">
                        {selectedStudentForHistory.nickname
                          ? `(${selectedStudentForHistory.nickname})`
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsHistoryModalOpen(false)}
                      className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-96 p-4 space-y-4">
                  {/* Point Masuk: Kehadiran Otomatis */}
                  <div>
                    <h4 className="text-xs font-bold text-sky-700 dark:text-sky-300 mb-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-[10px] font-black">
                        OTOMATIS
                      </span>
                      Kehadiran dari Lembar Perkembangan
                    </h4>
                    <div className="space-y-2">
                      {attendanceOnly.length > 0 ? (
                        attendanceOnly.map((historyItem: any) => (
                          <div
                            key={historyItem.id}
                            className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-xl p-3"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                                    📅 Kehadiran
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                                  {historyItem.description}
                                </p>
                                <p className="text-[10px] text-sky-700 dark:text-sky-300 mt-1">
                                  {new Date(
                                    historyItem.created_at,
                                  ).toLocaleDateString("id-ID", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                              <span className="text-sm font-black text-sky-700 dark:text-sky-300 whitespace-nowrap ml-2">
                                +{Math.abs(historyItem.displayPoints)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          Belum ada riwayat kehadiran
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-700 my-4" />

                  {/* Point Masuk: Bonus Manual */}
                  <div>
                    <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 text-[10px] font-black">
                        MANUAL
                      </span>
                      Bonus Poin Input Manual
                    </h4>
                    <div className="space-y-2">
                      {bonusManualOnly.length > 0 ? (
                        bonusManualOnly.map((historyItem: any) => (
                          <div
                            key={historyItem.id}
                            className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300">
                                    ⭐ Bonus
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-yellow-900 dark:text-yellow-200">
                                  {historyItem.description}
                                </p>
                                <p className="text-[10px] text-yellow-700 dark:text-yellow-300 mt-1">
                                  {new Date(
                                    historyItem.created_at,
                                  ).toLocaleDateString("id-ID", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                              <span className="text-sm font-black text-yellow-700 dark:text-yellow-300 whitespace-nowrap ml-2">
                                +{Math.abs(historyItem.displayPoints)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          Belum ada bonus poin manual
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-700 my-4" />

                  {/* Point Keluar: Tukar Hadiah */}
                  <div>
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                        KELUAR
                      </span>
                      Point Ditukar Hadiah
                    </h4>
                    <div className="space-y-2">
                      {redeemOnly.length > 0 ? (
                        redeemOnly.map((historyItem: any) => (
                          <div
                            key={historyItem.id}
                            className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                    🎁 Ditukar
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                                  {historyItem.description}
                                </p>
                                <p className="text-[10px] text-rose-700 dark:text-rose-300 mt-1">
                                  {new Date(
                                    historyItem.created_at,
                                  ).toLocaleDateString("id-ID", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                              <span className="text-sm font-black text-rose-700 dark:text-rose-300 whitespace-nowrap ml-2">
                                -{Math.abs(historyItem.displayPoints)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          Belum ada riwayat penukaran
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                  <button
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
