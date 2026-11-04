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
import { StudentMobileList } from "../../../components/features/students/list/StudentMobileList";
import { StudentDesktopTable } from "../../../components/features/students/list/StudentDesktopTable";
import { StudentFilterToolbar } from "../../../components/features/students/list/StudentFilterToolbar";
import { StudentConfirmModal } from "../../../components/features/students/list/StudentConfirmModal";

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
  classes = [],
  activeBranchName,
  branches = [],
  isSuperadmin = false,
}: {
  initialStudents: any[];
  initialPagination?: PaginationState;
  labels: any[];
  classes?: any[];
  activeBranchName?: string | null;
  branches?: Array<{ id: string; name: string }>;
  isSuperadmin?: boolean;
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

  const genderOptions = [
    { value: "", label: "Semua Jenis Kelamin" },
    { value: "Laki-laki", label: "Laki-laki" },
    { value: "Perempuan", label: "Perempuan" },
    { value: "unset", label: "Belum Ada (Kosong)" },
  ];

  const statusOptions = [
    { value: "all", label: `Semua Siswa (${allCount})` },
    { value: "reguler", label: `Reguler (${regulerCount})` },
    { value: "cg", label: `Coba Gratis (${cgCount})` },
    { value: "inactive", label: `Nonaktif (${inactiveCount})` },
  ];

  return (
    <div ref={listTopRef} className="space-y-6 sm:space-y-8">
      {isProcessing && <LoadingSpinner usePortal={true} />}

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen &&
        createPortal(
          <StudentConfirmModal
            confirmModal={confirmModal}
            handleExecuteAction={handleExecuteAction}
            isProcessing={isProcessing}
            modalError={modalError}
            setConfirmModal={setConfirmModal}
          />,
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
      <StudentFilterToolbar
        activeTab={activeTab}
        dropdownRef={dropdownRef}
        genderDropdownRef={genderDropdownRef}
        genderOptions={genderOptions}
        isGenderOpen={isGenderOpen}
        isLevelOpen={isLevelOpen}
        isStatusOpen={isStatusOpen}
        labels={labels}
        levelSearch={levelSearch}
        searchQuery={searchQuery}
        selectedGender={selectedGender}
        selectedLabelId={selectedLabelId}
        setActiveTab={setActiveTab}
        setIsGenderOpen={setIsGenderOpen}
        setIsLevelOpen={setIsLevelOpen}
        setIsStatusOpen={setIsStatusOpen}
        setLevelSearch={setLevelSearch}
        setSearchQuery={setSearchQuery}
        setSelectedGender={setSelectedGender}
        setSelectedLabelId={setSelectedLabelId}
        statusDropdownRef={statusDropdownRef}
        statusOptions={statusOptions}
      />

      {/* Desktop Table (Sembunyi di Mobile) */}
      <StudentDesktopTable
        currentPage={currentPage}
        displayedStudents={displayedStudents}
        endRow={endRow}
        getVisiblePageNumbers={getVisiblePageNumbers}
        handleDelete={handleDelete}
        handlePageChange={handlePageChange}
        handleToggleActive={handleToggleActive}
        isPageLoading={isPageLoading}
        setEditingStudent={setEditingStudent}
        setFeedbackModalOpen={setFeedbackModalOpen}
        setIsModalOpen={setIsModalOpen}
        setSelectedStudentForFeedback={setSelectedStudentForFeedback}
        startRow={startRow}
        totalFiltered={totalFiltered}
        totalPages={totalPages}
      />

      {/* Mobile Card Layout (Sembunyi di Desktop) */}
      <StudentMobileList
        currentPage={currentPage}
        displayedStudents={displayedStudents}
        endRow={endRow}
        getMobilePageNumbers={getMobilePageNumbers}
        handleDelete={handleDelete}
        handlePageChange={handlePageChange}
        handleToggleActive={handleToggleActive}
        isPageLoading={isPageLoading}
        setEditingStudent={setEditingStudent}
        setFeedbackModalOpen={setFeedbackModalOpen}
        setIsModalOpen={setIsModalOpen}
        setSelectedStudentForFeedback={setSelectedStudentForFeedback}
        startRow={startRow}
        totalFiltered={totalFiltered}
        totalPages={totalPages}
      />

      {/* Pendaftaran Form Modal */}
      {(isModalOpen || editingStudent) && (
        <StudentRegistrationForm
          labels={labels}
          classes={classes}
          branches={branches}
          isSuperadmin={isSuperadmin}
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
