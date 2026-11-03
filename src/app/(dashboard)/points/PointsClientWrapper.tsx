"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "@/components/ui/icons";
import {
  redeemStudentPoints,
  addManualStudentPoints,
  getModuleLockPasswords,
} from "@/lib/actions";
import { PointHistoryModal } from "../../../components/features/points/PointHistoryModal";
import { PointsLockModal } from "../../../components/features/points/PointsLockModal";
import { ManualBonusPointsModal } from "../../../components/features/points/ManualBonusPointsModal";
import { RedeemPointsModal } from "../../../components/features/points/RedeemPointsModal";
import { PointsHistoryTab } from "../../../components/features/points/PointsHistoryTab";
import { PointsRedeemTab } from "../../../components/features/points/PointsRedeemTab";

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

      // Update local state smoothly (rumus sama dengan server: net = max(0, gross - redeemed))
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === selectedStudentForRedeem.id) {
            const baseGross =
              s.gross_points ?? (s.points || 0) + (s.redeemed_points || 0);
            const newRedeemed = (s.redeemed_points || 0) + pointsNum;
            const newNet = Math.max(0, baseGross - newRedeemed);
            return {
              ...s,
              gross_points: baseGross,
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

      // Update local state smoothly (rumus sama dengan server: net = max(0, gross - redeemed))
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === selectedStudentForAdd.id) {
            const baseGross =
              s.gross_points ?? (s.points || 0) + (s.redeemed_points || 0);
            const newRedeemed = (s.redeemed_points || 0) - pointsNum;
            const newNet = Math.max(0, baseGross - newRedeemed);
            return {
              ...s,
              gross_points: baseGross,
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
    <div className="space-y-6 sm:space-y-8">
      {/* Judul halaman: hero biru solid selaras dashboard Hallo, stats netral di body putih. */}
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-white/85">
            {activeBranchName ? `Cabang ${activeBranchName}` : "Poin siswa"}
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Poin Kehadiran dan Hadiah
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
            Kelola poin kehadiran (+1 tiap hadir), tambah poin manual
            (lomba/prestasi), dan potong poin saat siswa menukar hadiah.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-zinc-800 border-t border-white/20 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {totalStudents}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
              Siswa Aktif
            </div>
          </div>
          <div className="p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {totalNetPoints}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
              Total Poin Tersedia
            </div>
          </div>
          <div className="p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {totalRedeemedPoints}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
              Total Poin Ditukar
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setSelectedTab("leaderboard")}
          className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
            selectedTab === "leaderboard"
              ? "bg-brand-600 text-white"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          <span>
            <span className="hidden sm:inline">Leaderboard</span> Poin
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("redeem")}
          className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
            selectedTab === "redeem"
              ? "bg-brand-600 text-white"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          <span>
            Kelola <span className="hidden sm:inline">dan Tukar</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("history")}
          className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
            selectedTab === "history"
              ? "bg-brand-600 text-white"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          <span>
            Riwayat <span className="hidden sm:inline">Poin</span> (
            {redemptions.length})
          </span>
        </button>
      </div>

      {/* Tab 1: Leaderboard */}
      {selectedTab === "leaderboard" && (
        <>
          {/* Search Bar */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm">
            <div className="relative w-full">
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
                placeholder="Cari nama siswa di leaderboard..."
                aria-label="Cari nama siswa di leaderboard"
              />
            </div>
          </div>

          {/* Top 3 Podium */}
          {leaderboardStudents.length >= 3 && !searchQuery && (
            <div className="grid grid-cols-3 gap-3 px-2">
              {/* 2nd Place */}
              <div className="flex flex-col items-center pt-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-slate-600 dark:text-zinc-200">
                  2
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-2 text-center leading-tight line-clamp-2">
                  {leaderboardStudents[1]?.nickname ||
                    leaderboardStudents[1]?.name}
                </h4>
                <span className="mt-1 inline-flex items-center bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-200 tabular-nums">
                  {leaderboardStudents[1]?.points || 0}
                </span>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-brand-600 flex items-center justify-center text-3xl sm:text-4xl font-bold text-white relative">
                  1
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-2 text-center leading-tight line-clamp-2">
                  {leaderboardStudents[0]?.nickname ||
                    leaderboardStudents[0]?.name}
                </h4>
                <span className="mt-1 inline-flex items-center bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  {leaderboardStudents[0]?.points || 0} Poin
                </span>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center pt-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xl sm:text-2xl font-bold text-slate-600 dark:text-zinc-200">
                  3
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-2 text-center leading-tight line-clamp-2">
                  {leaderboardStudents[2]?.nickname ||
                    leaderboardStudents[2]?.name}
                </h4>
                <span className="mt-1 inline-flex items-center bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-200 tabular-nums">
                  {leaderboardStudents[2]?.points || 0}
                </span>
              </div>
            </div>
          )}

          {/* Full Leaderboard List */}
          <div className="space-y-2.5">
            {leaderboardStudents.length === 0 ? (
              <div className="py-14 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                  Tidak ada siswa ditemukan.
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
                  Coba kata kunci pencarian lain.
                </p>
              </div>
            ) : (
              leaderboardStudents.map((student, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;

                return (
                  <div
                    key={student.id}
                    className={`bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm overflow-hidden ${
                      isTop3
                        ? "border-amber-200 dark:border-amber-800/50"
                        : "border-slate-200 dark:border-zinc-800"
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
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-sm sm:text-base font-bold shrink-0 tabular-nums ${
                            rank === 1
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                          }`}
                        >
                          {rank}
                        </div>

                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                              {student.name}
                            </h4>
                            {student.nickname && (
                              <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">
                                ({student.nickname})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
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
                            <span className="text-slate-300 dark:text-zinc-700">
                              ·
                            </span>
                            <span className="tabular-nums">
                              Poin Pertemuan: {student.gross_points || 0}
                              {student.redeemed_points > 0 && (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  {" "}
                                  (Ditukar: {student.redeemed_points})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Points Showcase Badge */}
                      <div
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold tabular-nums ${
                          isTop3
                            ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700"
                        }`}
                      >
                        {student.points || 0}
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
        <PointsRedeemTab
          handleAddPointsClick={handleAddPointsClick}
          handleOpenRedeemModal={handleOpenRedeemModal}
          redeemFilteredStudents={redeemFilteredStudents}
          redemptions={redemptions}
          searchQuery={searchQuery}
          setIsHistoryModalOpen={setIsHistoryModalOpen}
          setSearchQuery={setSearchQuery}
          setSelectedStudentForHistory={setSelectedStudentForHistory}
        />
      )}

      {/* Tab 3: Riwayat Penukaran, Extra & Kehadiran */}
      {selectedTab === "history" && (
        <PointsHistoryTab
          activeStudents={activeStudents}
          combinedHistory={combinedHistory}
          historyStudentRef={historyStudentRef}
          historyStudentSearch={historyStudentSearch}
          historyTypeFilter={historyTypeFilter}
          isHistoryStudentOpen={isHistoryStudentOpen}
          searchQuery={searchQuery}
          selectedHistoryStudent={selectedHistoryStudent}
          setHistoryStudentSearch={setHistoryStudentSearch}
          setHistoryTypeFilter={setHistoryTypeFilter}
          setIsHistoryStudentOpen={setIsHistoryStudentOpen}
          setSearchQuery={setSearchQuery}
          setSelectedHistoryStudent={setSelectedHistoryStudent}
        />
      )}

      {/* Modal 1: ACC Potong Poin Hadiah */}
      {selectedStudentForRedeem && (
        <RedeemPointsModal
          deductPoints={deductPoints}
          errorMsg={errorMsg}
          handleConfirmRedeem={handleConfirmRedeem}
          isSubmitting={isSubmitting}
          rewardNote={rewardNote}
          selectedStudentForRedeem={selectedStudentForRedeem}
          setDeductPoints={setDeductPoints}
          setRewardNote={setRewardNote}
          setSelectedStudentForRedeem={setSelectedStudentForRedeem}
          successMsg={successMsg}
        />
      )}

      {/* Modal 2: Tambah Poin Manual (Bonus / Lomba) */}
      {selectedStudentForAdd && (
        <ManualBonusPointsModal
          addErrorMsg={addErrorMsg}
          addNote={addNote}
          addPointsVal={addPointsVal}
          addSuccessMsg={addSuccessMsg}
          filteredModalStudents={filteredModalStudents}
          handleConfirmAddPoints={handleConfirmAddPoints}
          isStudentDropdownOpen={isStudentDropdownOpen}
          isSubmittingAdd={isSubmittingAdd}
          selectedStudentForAdd={selectedStudentForAdd}
          setAddNote={setAddNote}
          setAddPointsVal={setAddPointsVal}
          setIsStudentDropdownOpen={setIsStudentDropdownOpen}
          setSelectedStudentForAdd={setSelectedStudentForAdd}
          setStudentSearchInModal={setStudentSearchInModal}
          studentSearchInModal={studentSearchInModal}
          studentSearchInputRef={studentSearchInputRef}
        />
      )}

      {/* Modal Lock Akses Tambah Poin */}
      {showAddLockModal && (
        <PointsLockModal
          handleUnlockAddPoints={handleUnlockAddPoints}
          lockError={lockError}
          lockPassword={lockPassword}
          setLockError={setLockError}
          setLockPassword={setLockPassword}
          setShowAddLockModal={setShowAddLockModal}
        />
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
          // Absen (ijin/izin/sakit/libur) = 0 poin, hadir = +1.
          const attendanceOnly = studentAttendance.map((item) => ({
            ...item,
            category: "attendance",
            displayPoints: item.is_absent ? 0 : 1,
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
            <PointHistoryModal
              attendanceOnly={attendanceOnly}
              bonusManualOnly={bonusManualOnly}
              redeemOnly={redeemOnly}
              selectedStudentForHistory={selectedStudentForHistory}
              setIsHistoryModalOpen={setIsHistoryModalOpen}
            />
          );
        })()}
    </div>
  );
}
