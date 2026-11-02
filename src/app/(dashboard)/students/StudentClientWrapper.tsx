"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { StudentRegistrationForm } from "@/components/features/students/StudentRegistrationForm";
import { StudentFeedbackModal } from "@/components/features/students/StudentFeedbackModal";
import {
  deleteStudent,
  updateStudentStatus,
  getPaginatedStudents,
} from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatNumericDate } from "@/lib/dateUtils";

const PAGE_SIZE = 10;

interface PaginationState {
  students: any[];
  totalFiltered: number;
  totalPages: number;
  page: number;
  pageSize: number;
  counts: {
    all: number;
    reguler: number;
    cg: number;
    inactive: number;
  };
}

export function StudentClientWrapper({
  initialStudents,
  initialPagination,
  labels,
  activeBranchName,
}: {
  initialStudents: any[];
  initialPagination?: PaginationState;
  labels: any[];
  activeBranchName?: string | null;
}) {
  const router = useRouter();
  const listTopRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [levelSearch, setLevelSearch] = useState("");

  const [selectedGender, setSelectedGender] = useState("");
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const genderDropdownRef = useRef<HTMLDivElement>(null);

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination & On-Demand Fetch State
  const [displayedStudents, setDisplayedStudents] = useState<any[]>(
    initialPagination?.students || initialStudents || [],
  );
  const [currentPage, setCurrentPage] = useState<number>(
    initialPagination?.page || 1,
  );
  const [totalPages, setTotalPages] = useState<number>(
    initialPagination?.totalPages || 1,
  );
  const [totalFiltered, setTotalFiltered] = useState<number>(
    initialPagination?.totalFiltered ?? (initialStudents?.length || 0),
  );
  const [counts, setCounts] = useState(
    initialPagination?.counts || {
      all: initialStudents?.length || 0,
      reguler: (initialStudents || []).filter((s) => s.status === "REGISTERED")
        .length,
      cg: (initialStudents || []).filter((s) => s.status === "CG").length,
      inactive: (initialStudents || []).filter((s) => s.status === "INACTIVE")
        .length,
    },
  );
  const [isPageLoading, setIsPageLoading] = useState(false);
  const fetchReqIdRef = useRef(0);
  const isFirstRenderRef = useRef(true);

  // Sinkronkan ulang jika props server berubah (misal saat Superadmin ganti cabang)
  useEffect(() => {
    if (initialPagination) {
      setDisplayedStudents(initialPagination.students);
      setCurrentPage(initialPagination.page);
      setTotalPages(initialPagination.totalPages);
      setTotalFiltered(initialPagination.totalFiltered);
      setCounts(initialPagination.counts);
    }
  }, [initialPagination]);

  const scrollToTopOfList = useCallback(() => {
    if (typeof window !== "undefined") {
      if (listTopRef.current) {
        const rect = listTopRef.current.getBoundingClientRect();
        const targetY = Math.max(0, window.scrollY + rect.top - 16);
        window.scrollTo({ top: targetY, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, []);

  const fetchPageData = useCallback(
    async (
      targetPage: number,
      overrides?: {
        search?: string;
        labelId?: string;
        gender?: string;
        statusTab?: string;
      },
    ) => {
      const reqId = ++fetchReqIdRef.current;
      setIsPageLoading(true);
      try {
        const res = await getPaginatedStudents({
          page: targetPage,
          pageSize: PAGE_SIZE,
          search: overrides?.search !== undefined ? overrides.search : searchQuery,
          labelId:
            overrides?.labelId !== undefined
              ? overrides.labelId
              : selectedLabelId,
          gender:
            overrides?.gender !== undefined ? overrides.gender : selectedGender,
          statusTab:
            overrides?.statusTab !== undefined ? overrides.statusTab : activeTab,
        });
        if (reqId !== fetchReqIdRef.current) return;
        setDisplayedStudents(res.students);
        setCurrentPage(res.page);
        setTotalPages(res.totalPages);
        setTotalFiltered(res.totalFiltered);
        setCounts(res.counts);
      } catch (err) {
        console.error("Error fetching paginated students:", err);
      } finally {
        if (reqId === fetchReqIdRef.current) {
          setIsPageLoading(false);
        }
      }
    },
    [searchQuery, selectedLabelId, selectedGender, activeTab],
  );

  // Debounce saat user mengetik pencarian atau mengubah filter -> reset ke halaman 1 & fetch
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchPageData(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedLabelId, selectedGender, activeTab, fetchPageData]);

  const handlePageChange = async (newPage: number) => {
    if (
      newPage < 1 ||
      newPage > totalPages ||
      newPage === currentPage ||
      isPageLoading
    ) {
      return;
    }
    scrollToTopOfList();
    await fetchPageData(newPage);
    scrollToTopOfList();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLevelOpen(false);
      }
      if (
        genderDropdownRef.current &&
        !genderDropdownRef.current.contains(event.target as Node)
      ) {
        setIsGenderOpen(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // State for Edit
  const [editingStudent, setEditingStudent] = useState<any>(null);

  // State for Feedback Modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] =
    useState<any>(null);

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "delete" | "toggle";
    studentId: string;
    studentName: string;
    newStatus?: string;
  }>({
    isOpen: false,
    type: "delete",
    studentId: "",
    studentName: "",
  });
  const [modalError, setModalError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const allCount = counts.all;
  const regulerCount = counts.reguler;
  const cgCount = counts.cg;
  const inactiveCount = counts.inactive;

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      studentId: id,
      studentName: name,
    });
    setModalError("");
  };

  const handleToggleActive = (
    id: string,
    name: string,
    currentStatus: string,
  ) => {
    const isInactive = currentStatus === "INACTIVE";
    const newStatus = isInactive ? "REGISTERED" : "INACTIVE";

    setConfirmModal({
      isOpen: true,
      type: "toggle",
      studentId: id,
      studentName: name,
      newStatus,
    });
    setModalError("");
  };

  const handleExecuteAction = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setModalError("");
    try {
      if (confirmModal.type === "delete") {
        await deleteStudent(confirmModal.studentId);
      } else if (confirmModal.type === "toggle" && confirmModal.newStatus) {
        await updateStudentStatus(
          confirmModal.studentId,
          confirmModal.newStatus,
        );
      }
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      await fetchPageData(currentPage);
      router.refresh();
    } catch (error: any) {
      setModalError(error.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Hitung nomor halaman yang ditampilkan pada bar pagination Desktop
  const getVisiblePageNumbers = (): Array<number | string> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: Array<number | string> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push("...");
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  // Hitung nomor halaman yang ringkas khusus layar Mobile (maks 5 tombol angka)
  const getMobilePageNumbers = (): Array<number | string> => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage, "...", totalPages];
  };

  const startRow =
    totalFiltered === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, totalFiltered);

  return (
    <div ref={listTopRef} className="space-y-6 sm:space-y-8">
      {isProcessing && <LoadingSpinner usePortal={true} />}

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() =>
                !isProcessing &&
                setConfirmModal((prev) => ({ ...prev, isOpen: false }))
              }
            />
            <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 overflow-hidden">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                  confirmModal.type === "delete"
                    ? "bg-red-50 dark:bg-red-500/15"
                    : "bg-brand-50 dark:bg-brand-500/15"
                }`}
              >
                {confirmModal.type === "delete" ? (
                  <Icons.trash className="w-6 h-6 text-red-600 dark:text-red-400" />
                ) : (
                  <Icons.settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                {confirmModal.type === "delete"
                  ? "Hapus Data Siswa?"
                  : confirmModal.newStatus === "INACTIVE"
                    ? "Nonaktifkan Siswa?"
                    : "Aktifkan Siswa?"}
              </h3>

              <p className="text-sm text-slate-500 dark:text-zinc-400 text-center mt-2 leading-relaxed">
                {confirmModal.type === "delete" ? (
                  <>
                    Apakah Anda yakin ingin menghapus data siswa{" "}
                    <strong className="text-slate-700 dark:text-zinc-200">
                      "{confirmModal.studentName}"
                    </strong>{" "}
                    secara permanen? Data yang dihapus tidak dapat dikembalikan.
                  </>
                ) : confirmModal.newStatus === "INACTIVE" ? (
                  <>
                    Apakah Anda yakin ingin menonaktifkan siswa{" "}
                    <strong className="text-slate-700 dark:text-zinc-200">
                      "{confirmModal.studentName}"
                    </strong>
                    ? Data siswa akan dipindah ke tab Nonaktif.
                  </>
                ) : (
                  <>
                    Apakah Anda yakin ingin mengaktifkan kembali siswa{" "}
                    <strong className="text-slate-700 dark:text-zinc-200">
                      "{confirmModal.studentName}"
                    </strong>{" "}
                    sebagai siswa Reguler?
                  </>
                )}
              </p>

              {modalError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-3 text-center font-medium bg-red-50 dark:bg-red-500/10 p-2.5 rounded-xl border border-red-200 dark:border-red-800/50">
                  {modalError}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteAction}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-px ${
                    confirmModal.type === "delete"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-brand-600 hover:bg-brand-700"
                  }`}
                >
                  {isProcessing
                    ? "Memproses..."
                    : confirmModal.type === "delete"
                      ? "Ya, Hapus"
                      : "Ya, Lanjutkan"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Judul halaman: hero biru solid selaras dashboard Hallo. */}
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/85">
              {activeBranchName ? `Cabang ${activeBranchName}` : "Data siswa"}
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Kelola Siswa
            </h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
              Kelola data siswa, tingkat level, dan status percobaan gratis
              (CG).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-brand-700 hover:bg-blue-50 active:translate-y-px px-5 py-3 text-sm font-semibold shrink-0 w-full sm:w-auto transition-colors cursor-pointer"
          >
            <Icons.add className="h-5 w-5" aria-hidden="true" />
            Pendaftaran Baru
          </button>
        </div>
      </div>

      {/* Toolbar / Search / Filters */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm space-y-3.5">
        {/* Search */}
        <div className="relative">
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
            placeholder="Cari nama siswa..."
            aria-label="Cari nama siswa"
          />
        </div>

        {/* Grid Filters: Level, Gender & Status Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Level Dropdown (Custom) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (!isLevelOpen) setLevelSearch("");
                setIsLevelOpen(!isLevelOpen);
              }}
              className={`w-full flex items-center rounded-xl border bg-slate-50 dark:bg-zinc-800 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer h-11 text-left ${
                isLevelOpen
                  ? "border-brand-500 ring-2 ring-brand-500/20"
                  : "border-slate-200 dark:border-zinc-700"
              }`}
            >
              <span className="truncate">
                {selectedLabelId
                  ? (() => {
                      const l = labels.find((x) => x.id === selectedLabelId);
                      return l
                        ? `${l.main_level} - ${l.sub_level}`
                        : "Semua Level / Tingkat";
                    })()
                  : "Semua Level / Tingkat"}
              </span>
            </button>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Icons.settings
                className="h-4 w-4 text-brand-500"
                aria-hidden="true"
              />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                  isLevelOpen ? "rotate-180 text-brand-500" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {/* Floating Menu Popover */}
            {isLevelOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
                <div className="p-1">
                  <input
                    type="text"
                    value={levelSearch}
                    onChange={(e) => setLevelSearch(e.target.value)}
                    placeholder="Cari level..."
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLabelId("");
                      setIsLevelOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      selectedLabelId === ""
                        ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50"
                        : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`truncate text-left font-semibold ${
                        selectedLabelId === ""
                          ? "text-brand-700 dark:text-brand-300"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      Semua Level / Tingkat
                    </span>
                    {selectedLabelId === "" && (
                      <svg
                        className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  {labels
                    .filter((l) =>
                      levelSearch.trim()
                        ? `${l.main_level} - ${l.sub_level}`
                            .toLowerCase()
                            .includes(levelSearch.trim().toLowerCase())
                        : true,
                    )
                    .map((label) => {
                      const isSelected = label.id === selectedLabelId;
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => {
                            setSelectedLabelId(label.id);
                            setIsLevelOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50"
                              : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span
                            className={`truncate text-left font-semibold ${
                              isSelected
                                ? "text-brand-700 dark:text-brand-300"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {label.main_level} - {label.sub_level}
                          </span>
                          {isSelected && (
                            <svg
                              className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                  {labels.every(
                    (l) =>
                      levelSearch.trim() &&
                      !`${l.main_level} - ${l.sub_level}`
                        .toLowerCase()
                        .includes(levelSearch.trim().toLowerCase()),
                  ) && (
                    <p className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center font-medium">
                      Level tidak ditemukan.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Gender Dropdown */}
          <div className="relative">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              aria-label="Filter jenis kelamin"
              className="appearance-none block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors cursor-pointer h-11 leading-tight truncate"
            >
              <option value="">Semua Jenis Kelamin</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
              <option value="unset">Belum Ada (Kosong)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Icons.users
                className="h-4 w-4 text-brand-500"
                aria-hidden="true"
              />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              aria-label="Filter status siswa"
              className="appearance-none block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors cursor-pointer h-11 leading-tight truncate"
            >
              <option value="all">Semua Siswa ({allCount})</option>
              <option value="reguler">Reguler ({regulerCount})</option>
              <option value="cg">Coba Gratis ({cgCount})</option>
              <option value="inactive">Nonaktif ({inactiveCount})</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Icons.filter
                className="h-4 w-4 text-brand-500"
                aria-hidden="true"
              />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table (Sembunyi di Mobile) */}
      <div className="hidden sm:block bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden relative">
        {isPageLoading && (
          <div className="absolute inset-0 z-20 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 shadow-md border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200">
              <span className="h-4 w-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
              Memuat halaman {currentPage}...
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-800/60">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 dark:text-white sm:pl-6"
                >
                  Nama Lengkap
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white"
                >
                  Tingkat Level
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white"
                >
                  Poin Kehadiran
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white"
                >
                  Tgl Lahir & Usia
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white"
                >
                  Tgl Masuk
                </th>
                <th
                  scope="col"
                  className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-slate-900 dark:text-white sm:pr-6"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      Belum ada data siswa untuk kategori ini.
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
                      Ubah filter atau daftarkan siswa baru.
                    </p>
                  </td>
                </tr>
              ) : (
                displayedStudents.map((person) => {
                  const labelObj = Array.isArray(person.label)
                    ? person.label[0]
                    : person.label;

                  // Hitung umur secara instan untuk display
                  const bDate = new Date(person.date_of_birth);
                  const tDate = new Date();
                  let y = tDate.getFullYear() - bDate.getFullYear();
                  let m = tDate.getMonth() - bDate.getMonth();
                  if (m < 0 || (m === 0 && tDate.getDate() < bDate.getDate())) {
                    y--;
                    m += 12;
                  }
                  if (tDate.getDate() < bDate.getDate()) {
                    m--;
                    if (m < 0) {
                      m += 12;
                    }
                  }
                  const ageText =
                    y === 0 && m === 0 ? "Baru lahir" : `${y} Thn ${m} Bln`;

                  return (
                    <tr
                      key={person.id}
                      className="transition-all hover:brightness-95 dark:hover:brightness-110"
                      style={
                        labelObj
                          ? {
                              backgroundColor: `${labelObj.hex_color}10`,
                              borderLeft: `4px solid ${labelObj.hex_color}`,
                            }
                          : {}
                      }
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 dark:text-white sm:pl-6">
                        <div className="flex items-center gap-2">
                          <span>{person.name}</span>
                          {person.nickname ? (
                            <span className="text-slate-400 dark:text-slate-500">
                              ({person.nickname})
                            </span>
                          ) : null}
                          {person.gender === "Perempuan" ? (
                            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold bg-pink-600 text-white">
                              P
                            </span>
                          ) : person.gender === "Laki-laki" ? (
                            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white">
                              L
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                              Belum ada
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            person.status === "REGISTERED"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                              : person.status === "CG"
                                ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                                : "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-500/20"
                          }`}
                        >
                          {person.status === "REGISTERED"
                            ? "Reguler"
                            : person.status === "CG"
                              ? "CG"
                              : "Nonaktif"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {labelObj ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: labelObj.hex_color,
                              }}
                            ></div>
                            {labelObj.main_level} - {labelObj.sub_level}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-amber-700 dark:text-amber-300">
                        <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-lg text-xs tabular-nums">
                          {person.points || 0} Poin
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                        <div>{formatNumericDate(person.date_of_birth)}</div>
                        <div className="text-xs text-slate-400 font-semibold">
                          {ageText}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {formatNumericDate(person.registration_date)}
                      </td>
                      <td className="whitespace-nowrap py-3 pl-3 pr-4 sm:pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStudentForFeedback(person);
                              setFeedbackModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200/60 transition-colors dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25 dark:ring-brand-800/50 cursor-pointer"
                          >
                            Feedback
                          </button>
                          <button
                            onClick={() =>
                              handleToggleActive(
                                person.id,
                                person.name,
                                person.status,
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ring-1 cursor-pointer ${
                              person.status === "INACTIVE"
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:ring-emerald-800/50"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 ring-slate-200/60 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:ring-zinc-700"
                            }`}
                          >
                            {person.status === "INACTIVE"
                              ? "Aktifkan"
                              : "Nonaktifkan"}
                            <span className="sr-only">, {person.name}</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingStudent(person);
                              setIsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200/60 transition-colors dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25 dark:ring-brand-800/50 cursor-pointer"
                          >
                            Edit
                            <span className="sr-only">, {person.name}</span>
                          </button>
                          <button
                            onClick={() => handleDelete(person.id, person.name)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200/60 transition-colors dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25 dark:ring-red-800/50 cursor-pointer"
                          >
                            Hapus
                            <span className="sr-only">, {person.name}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination Footer */}
        {totalFiltered > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/80 px-4 py-3.5 sm:px-6">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
              Menampilkan{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {startRow}–{endRow}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {totalFiltered}
              </span>{" "}
              siswa{" "}
              <span className="text-slate-400 dark:text-zinc-500">
                (Halaman {currentPage} dari {totalPages})
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPageLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ‹ Sebelumnya
              </button>
              {getVisiblePageNumbers().map((item, idx) =>
                typeof item === "string" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1 text-xs font-semibold text-slate-400 dark:text-zinc-500"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePageChange(item)}
                    disabled={isPageLoading}
                    className={`min-w-8 h-8 px-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      item === currentPage
                        ? "bg-brand-600 text-white shadow-sm"
                        : "border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPageLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Selanjutnya ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card Layout (Sembunyi di Desktop) */}
      <div className="block sm:hidden space-y-3 relative pb-6">
        {isPageLoading && (
          <div className="sticky top-16 z-20 flex justify-center py-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-800 shadow-md border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
              Memuat halaman {currentPage}...
            </div>
          </div>
        )}
        {displayedStudents.length === 0 ? (
          <div className="py-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
              Belum ada data siswa untuk kategori ini.
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
              Ubah filter atau daftarkan siswa baru.
            </p>
          </div>
        ) : (
          displayedStudents.map((person) => {
            const labelObj = Array.isArray(person.label)
              ? person.label[0]
              : person.label;

            const bDate = new Date(person.date_of_birth);
            const tDate = new Date();
            let y = tDate.getFullYear() - bDate.getFullYear();
            let m = tDate.getMonth() - bDate.getMonth();
            if (m < 0 || (m === 0 && tDate.getDate() < bDate.getDate())) {
              y--;
              m += 12;
            }
            if (tDate.getDate() < bDate.getDate()) {
              m--;
              if (m < 0) {
                m += 12;
              }
            }
            const ageText =
              y === 0 && m === 0 ? "Baru lahir" : `${y} Thn ${m} Bln`;

            return (
              <div
                key={person.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-4 relative overflow-hidden"
                style={
                  labelObj
                    ? { borderLeft: `4px solid ${labelObj.hex_color}` }
                    : {}
                }
              >
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex-1 pr-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5 flex-wrap">
                      <span>{person.name}</span>
                      {person.nickname ? (
                        <span className="font-normal text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          ( {person.nickname} )
                        </span>
                      ) : null}
                      {person.gender === "Perempuan" ? (
                        <span className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[9px] font-bold bg-pink-600 text-white">
                          P
                        </span>
                      ) : person.gender === "Laki-laki" ? (
                        <span className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white">
                          L
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Belum ada
                        </span>
                      )}
                      <span className="font-normal text-slate-900 dark:text-white whitespace-nowrap">
                        ( {ageText} )
                      </span>
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                      {labelObj ? (
                        <span className="flex items-center gap-1.5 font-medium">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: labelObj.hex_color }}
                          ></span>
                          {labelObj.main_level} - {labelObj.sub_level}
                        </span>
                      ) : (
                        <span>Tidak ada tingkat</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${
                      person.status === "REGISTERED"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20"
                        : person.status === "CG"
                          ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20"
                          : "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-500/20"
                    }`}
                  >
                    {person.status === "REGISTERED"
                      ? "Reguler"
                      : person.status === "CG"
                        ? "CG"
                        : "Nonaktif"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-zinc-400 mb-4 relative z-10 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-0.5">
                      Tgl Lahir
                    </span>
                    <span className="block font-medium text-slate-700 dark:text-zinc-200">
                      {formatNumericDate(person.date_of_birth)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-0.5">
                      Tgl Masuk
                    </span>
                    <span className="block font-medium text-slate-700 dark:text-zinc-200">
                      {formatNumericDate(person.registration_date)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-0.5">
                      Poin
                    </span>
                    <span className="block font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                      {person.points || 0} Poin
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 relative z-10 border-t border-slate-200 dark:border-zinc-800 pt-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentForFeedback(person);
                      setFeedbackModalOpen(true);
                    }}
                    className="flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25 transition-colors text-center ring-1 ring-brand-200/50 dark:ring-brand-800/50 min-h-11 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Feedback
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleActive(person.id, person.name, person.status)
                    }
                    className={`flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl transition-colors text-center ring-1 min-h-11 flex items-center justify-center cursor-pointer ${
                      person.status === "INACTIVE"
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200/50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:ring-emerald-800/50"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 ring-slate-200/50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:ring-zinc-700"
                    }`}
                  >
                    {person.status === "INACTIVE" ? "Aktifkan" : "Nonaktifkan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudent(person);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 active:translate-y-px transition-colors text-center min-h-11 flex items-center justify-center cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(person.id, person.name)}
                    className="flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 active:translate-y-px transition-colors text-center min-h-11 flex items-center justify-center cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination Footer */}
        {totalFiltered > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm space-y-3.5">
            {/* Info Bar */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Menampilkan{" "}
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {startRow}–{endRow}
                </span>{" "}
                dari{" "}
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {totalFiltered}
                </span>{" "}
                siswa
              </p>
              <span className="inline-flex items-center rounded-lg bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200/60 dark:ring-brand-800/50 tabular-nums">
                Hal. {currentPage} / {totalPages}
              </span>
            </div>

            {/* Compact Page Numbers for Mobile */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {getMobilePageNumbers().map((item, idx) =>
                  typeof item === "string" ? (
                    <span
                      key={`mob-ellipsis-${idx}`}
                      className="px-1.5 text-xs font-semibold text-slate-400 dark:text-zinc-500"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={`mob-page-${item}`}
                      type="button"
                      onClick={() => handlePageChange(item)}
                      disabled={isPageLoading}
                      className={`min-w-9 h-9 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer tabular-nums ${
                        item === currentPage
                          ? "bg-brand-600 text-white shadow-sm shadow-brand-500/25 ring-2 ring-brand-600/20"
                          : "border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
            )}

            {/* Prev / Next Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPageLoading}
                className="min-h-11 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>Sebelumnya</span>
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPageLoading}
                className="min-h-11 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-500/20 active:scale-[0.99] disabled:opacity-40 disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Selanjutnya</span>
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pendaftaran Form Modal */}
      {(isModalOpen || editingStudent) && (
        <StudentRegistrationForm
          labels={labels}
          initialData={editingStudent}
          onClose={() => {
            setIsModalOpen(false);
            setEditingStudent(null);
          }}
          onSuccess={() => {
            setEditingStudent(null);
            fetchPageData(currentPage);
            router.refresh();
          }}
        />
      )}

      {/* Student Feedback Modal */}
      {feedbackModalOpen && selectedStudentForFeedback && (
        <StudentFeedbackModal
          studentId={selectedStudentForFeedback.id}
          studentName={selectedStudentForFeedback.name}
          isOpen={feedbackModalOpen}
          onClose={() => {
            setFeedbackModalOpen(false);
            setSelectedStudentForFeedback(null);
          }}
        />
      )}
    </div>
  );
}
