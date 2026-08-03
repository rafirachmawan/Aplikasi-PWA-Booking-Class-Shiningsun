"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { StudentRegistrationForm } from "@/components/features/students/StudentRegistrationForm";
import { deleteStudent, updateStudentStatus } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatNumericDate } from "@/lib/dateUtils";

export function StudentClientWrapper({ initialStudents, labels, activeBranchName }: { initialStudents: any[], labels: any[], activeBranchName?: string | null }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLevelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // State for Edit
  const [editingStudent, setEditingStudent] = useState<any>(null);

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'toggle';
    studentId: string;
    studentName: string;
    newStatus?: string;
  }>({
    isOpen: false,
    type: 'delete',
    studentId: '',
    studentName: '',
  });
  const [modalError, setModalError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter and sort students based on all states (search, level filter, active tab, and sort by label)
  const displayedStudents = initialStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLabel = selectedLabelId === "" || s.label_id === selectedLabelId;
    
    const matchesTab = activeTab === "all" || 
                       (activeTab === "reguler" && s.status === 'REGISTERED') ||
                       (activeTab === "cg" && s.status === 'CG') ||
                       (activeTab === "inactive" && s.status === 'INACTIVE');
                       
    return matchesSearch && matchesLabel && matchesTab;
  }).sort((a, b) => {
    // Put students with labels first
    if (a.label && !b.label) return -1;
    if (!a.label && b.label) return 1;
    if (!a.label && !b.label) {
      return a.name.localeCompare(b.name);
    }
    
    // Sort by main_level
    const mainCompare = a.label.main_level.localeCompare(b.label.main_level);
    if (mainCompare !== 0) return mainCompare;
    
    // Sort by sub_level
    const subCompare = a.label.sub_level.localeCompare(b.label.sub_level);
    if (subCompare !== 0) return subCompare;
    
    // Sort by name if levels are same
    return a.name.localeCompare(b.name);
  });

  // Calculate totals dynamically for tabs based on current search & level filters
  const regulerCount = initialStudents.filter(s => 
    s.status === 'REGISTERED' && 
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase()))) && 
    (selectedLabelId === "" || s.label_id === selectedLabelId)
  ).length;

  const cgCount = initialStudents.filter(s => 
    s.status === 'CG' && 
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase()))) && 
    (selectedLabelId === "" || s.label_id === selectedLabelId)
  ).length;

  const inactiveCount = initialStudents.filter(s => 
    s.status === 'INACTIVE' && 
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase()))) && 
    (selectedLabelId === "" || s.label_id === selectedLabelId)
  ).length;

  const allCount = initialStudents.filter(s => 
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase()))) && 
    (selectedLabelId === "" || s.label_id === selectedLabelId)
  ).length;

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      studentId: id,
      studentName: name
    });
    setModalError("");
  };

  const handleToggleActive = (id: string, name: string, currentStatus: string) => {
    const isInactive = currentStatus === 'INACTIVE';
    const newStatus = isInactive ? 'REGISTERED' : 'INACTIVE';
    
    setConfirmModal({
      isOpen: true,
      type: 'toggle',
      studentId: id,
      studentName: name,
      newStatus
    });
    setModalError("");
  };

  const handleExecuteAction = async () => {
    setIsProcessing(true);
    setModalError("");
    try {
      if (confirmModal.type === 'delete') {
        await deleteStudent(confirmModal.studentId);
      } else if (confirmModal.type === 'toggle' && confirmModal.newStatus) {
        await updateStudentStatus(confirmModal.studentId, confirmModal.newStatus);
      }
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      router.refresh();
    } catch (error: any) {
      setModalError(error.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {isProcessing && <LoadingSpinner usePortal={true} />}

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isProcessing && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              confirmModal.type === 'delete' ? 'bg-red-100 dark:bg-red-500/10' : 'bg-brand-100 dark:bg-brand-500/10'
            }`}>
              {confirmModal.type === 'delete' ? (
                <Icons.trash className="w-6 h-6 text-red-600 dark:text-red-400" />
              ) : (
                <Icons.settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              )}
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
              {confirmModal.type === 'delete' ? 'Hapus Data Siswa?' : confirmModal.newStatus === 'INACTIVE' ? 'Nonaktifkan Siswa?' : 'Aktifkan Siswa?'}
            </h3>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 leading-relaxed">
              {confirmModal.type === 'delete' ? (
                <>Apakah Anda yakin ingin menghapus data siswa <strong className="text-slate-700 dark:text-slate-300">"{confirmModal.studentName}"</strong> secara permanen? Data yang dihapus tidak dapat dikembalikan.</>
              ) : confirmModal.newStatus === 'INACTIVE' ? (
                <>Apakah Anda yakin ingin menonaktifkan siswa <strong className="text-slate-700 dark:text-slate-300">"{confirmModal.studentName}"</strong>? Data siswa akan dipindah ke tab Nonaktif.</>
              ) : (
                <>Apakah Anda yakin ingin mengaktifkan kembali siswa <strong className="text-slate-700 dark:text-slate-300">"{confirmModal.studentName}"</strong> sebagai siswa Reguler?</>
              )}
            </p>

            {modalError && (
              <p className="text-xs text-red-500 mt-3 text-center font-medium bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/50">
                {modalError}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteAction}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  confirmModal.type === 'delete' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {isProcessing ? "Memproses..." : (confirmModal.type === 'delete' ? 'Ya, Hapus' : 'Ya, Lanjutkan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Card - Unified Design */}
      <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex flex-wrap items-center gap-x-2">
              <span>Kelola Siswa</span>
              {activeBranchName && (
                <span className="text-brand-100 font-normal text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
                  ({activeBranchName})
                </span>
              )}
            </h2>
            <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Kelola data siswa, tingkat level, dan status percobaan gratis (CG).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-x-2 rounded-xl bg-white text-brand-700 px-5 py-3 text-sm font-bold shadow-md hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shrink-0 w-full sm:w-auto justify-center transition-all active:scale-95"
            style={{ color: '#1d4ed8', backgroundColor: 'white' }}
          >
            <Icons.add className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Pendaftaran Baru
          </button>
        </div>
      </div>
      
      {/* Toolbar / Search / Tabs */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icons.search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-200 bg-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white"
            placeholder="Cari nama siswa..."
          />
        </div>

        {/* Custom Level Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsLevelOpen(!isLevelOpen)}
            className="flex items-center justify-between w-full rounded-lg border-0 py-2.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-200 bg-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white text-left cursor-pointer"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Icons.settings className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </span>
            <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
              {selectedLabelId === "" 
                ? "✨ Semua Level / Tingkat" 
                : (() => {
                    const selectedLabel = labels.find(l => l.id === selectedLabelId);
                    return selectedLabel ? `${selectedLabel.main_level} - ${selectedLabel.sub_level}` : "✨ Semua Level / Tingkat";
                  })()
              }
            </span>
            <svg className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isLevelOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {isLevelOpen && (
            <div className="absolute z-50 mt-1.5 w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg max-h-[195px] overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedLabelId("");
                  setIsLevelOpen(false);
                }}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                  selectedLabelId === "" ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                ✨ Semua Level / Tingkat
              </button>
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => {
                    setSelectedLabelId(label.id);
                    setIsLevelOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                    selectedLabelId === label.id ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20" : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: label.hex_color }}></span>
                  {label.main_level} - {label.sub_level}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs — scrollable on mobile agar tidak kepotong */}
        <div className="-mb-5 sm:-mb-6 -mx-5 sm:mx-0 border-b border-slate-100 dark:border-slate-800">
          <nav
            className="flex overflow-x-auto px-5 sm:px-0 gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Tabs"
          >
            <button
              onClick={() => setActiveTab("all")}
              className={`
                shrink-0 whitespace-nowrap border-b-2 py-3.5 px-3 text-sm font-medium transition-colors
                ${activeTab === "all" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}
              `}
            >
              Semua Siswa <span className="ml-1.5 rounded-full bg-slate-100 dark:bg-slate-800 py-0.5 px-2 text-xs font-semibold">{allCount}</span>
            </button>
            <button
              onClick={() => setActiveTab("reguler")}
              className={`
                shrink-0 whitespace-nowrap border-b-2 py-3.5 px-3 text-sm font-medium transition-colors
                ${activeTab === "reguler" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}
              `}
            >
              Reguler <span className="ml-1.5 rounded-full bg-slate-100 dark:bg-slate-800 py-0.5 px-2 text-xs font-semibold">{regulerCount}</span>
            </button>
            <button
              onClick={() => setActiveTab("cg")}
              className={`
                shrink-0 whitespace-nowrap border-b-2 py-3.5 px-3 text-sm font-medium transition-colors
                ${activeTab === "cg" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}
              `}
            >
              <span className="hidden sm:inline">Coba Gratis (CG)</span>
              <span className="sm:hidden">Coba Gratis</span>
              <span className="ml-1.5 rounded-full bg-slate-100 dark:bg-slate-800 py-0.5 px-2 text-xs font-semibold">{cgCount}</span>
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`
                shrink-0 whitespace-nowrap border-b-2 py-3.5 px-3 text-sm font-medium transition-colors
                ${activeTab === "inactive" ? "border-red-500 text-red-600 dark:text-red-400" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}
              `}
            >
              Nonaktif <span className="ml-1.5 rounded-full bg-slate-100 dark:bg-slate-800 py-0.5 px-2 text-xs font-semibold">{inactiveCount}</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Desktop Table (Sembunyi di Mobile) */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 dark:text-white sm:pl-6">
                  Nama Lengkap
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Tingkat Level
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Tgl Lahir & Usia
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Tgl Masuk
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Belum ada data siswa untuk kategori ini.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((person) => {
                  // Hitung umur secara instan untuk display
                  const bDate = new Date(person.date_of_birth);
                  const tDate = new Date();
                  let y = tDate.getFullYear() - bDate.getFullYear();
                  let m = tDate.getMonth() - bDate.getMonth();
                  if (m < 0 || (m === 0 && tDate.getDate() < bDate.getDate())) { y--; m += 12; }
                  if (tDate.getDate() < bDate.getDate()) { m--; if (m < 0) { m += 12; } }
                  const ageText = y === 0 && m === 0 ? "Baru lahir" : `${y} Thn ${m} Bln`;

                  return (
                    <tr 
                      key={person.id} 
                      className="transition-all hover:brightness-95 dark:hover:brightness-110"
                      style={person.label ? { 
                        backgroundColor: `${person.label.hex_color}10`, // 10% opacity
                        borderLeft: `4px solid ${person.label.hex_color}` 
                      } : {}}
                    >
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 dark:text-white sm:pl-6">
                        {person.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          person.status === 'REGISTERED' 
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' 
                            : person.status === 'CG' 
                              ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20'
                              : 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-500/20'
                        }`}>
                          {person.status === 'REGISTERED' ? 'Reguler' : person.status === 'CG' ? 'CG' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {person.label ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: person.label.hex_color }}></div>
                            {person.label.main_level} - {person.label.sub_level}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                        <div>{formatNumericDate(person.date_of_birth)}</div>
                        <div className="text-xs text-slate-400 font-semibold">{ageText}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {formatNumericDate(person.registration_date)}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-3">
                        <button 
                          onClick={() => handleToggleActive(person.id, person.name, person.status)}
                          className={`${person.status === 'INACTIVE' ? 'text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                        >
                          {person.status === 'INACTIVE' ? 'Aktifkan' : 'Nonaktifkan'}<span className="sr-only">, {person.name}</span>
                        </button>
                        <button 
                          onClick={() => {
                            setEditingStudent(person);
                            setIsModalOpen(true);
                          }}
                          className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                          Edit<span className="sr-only">, {person.name}</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(person.id, person.name)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        >
                          Hapus<span className="sr-only">, {person.name}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout (Sembunyi di Desktop) */}
      <div className="block sm:hidden space-y-3">
        {displayedStudents.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-xl ring-1 ring-slate-900/5">
            Belum ada data siswa untuk kategori ini.
          </div>
        ) : (
          displayedStudents.map((person) => {
            const bDate = new Date(person.date_of_birth);
            const tDate = new Date();
            let y = tDate.getFullYear() - bDate.getFullYear();
            let m = tDate.getMonth() - bDate.getMonth();
            if (m < 0 || (m === 0 && tDate.getDate() < bDate.getDate())) { y--; m += 12; }
            if (tDate.getDate() < bDate.getDate()) { m--; if (m < 0) { m += 12; } }
            const ageText = y === 0 && m === 0 ? "Baru lahir" : `${y} Thn ${m} Bln`;

            return (
              <div 
                key={person.id}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm ring-1 ring-slate-900/5 p-4 relative overflow-hidden"
                style={person.label ? { borderLeft: `4px solid ${person.label.hex_color}` } : {}}
              >
                {person.label && (
                   <div className="absolute inset-0 w-full opacity-[0.03] pointer-events-none" style={{ backgroundColor: person.label.hex_color }}></div>
                )}
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex-1 pr-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {person.name} <span className="font-normal text-slate-900 dark:text-white whitespace-nowrap">( {ageText} )</span>
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                      {person.label ? (
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: person.label.hex_color }}></span>
                          {person.label.main_level} - {person.label.sub_level}
                        </span>
                      ) : (
                        <span>Tidak ada tingkat</span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${
                    person.status === 'REGISTERED' 
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' 
                      : person.status === 'CG' 
                        ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20'
                        : 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-500/20'
                  }`}>
                    {person.status === 'REGISTERED' ? 'Reguler' : person.status === 'CG' ? 'CG' : 'Nonaktif'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-4 relative z-10 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Tgl Lahir</span>
                    <span className="block font-medium text-slate-700 dark:text-slate-300">{formatNumericDate(person.date_of_birth)}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Tgl Masuk</span>
                    <span className="block font-medium text-slate-700 dark:text-slate-300">{formatNumericDate(person.registration_date)}</span>
                  </div>
                </div>

                <div className="flex gap-2 relative z-10 border-t border-slate-100 dark:border-slate-800 pt-3 flex-wrap">
                  <button 
                    onClick={() => handleToggleActive(person.id, person.name, person.status)}
                    className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-colors text-center ring-1 ${
                      person.status === 'INACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:ring-emerald-900/30'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 ring-slate-200/50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:ring-slate-700'
                    }`}
                  >
                    {person.status === 'INACTIVE' ? 'Aktifkan' : 'Nonaktifkan'}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingStudent(person);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 py-2 px-2 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors text-center ring-1 ring-brand-200/50 dark:ring-brand-900/30"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(person.id, person.name)}
                    className="flex-1 py-2 px-2 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors text-center ring-1 ring-red-200/50 dark:ring-red-900/30"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })
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
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
