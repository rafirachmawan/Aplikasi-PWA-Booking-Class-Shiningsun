"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { StudentRegistrationForm } from "@/components/features/students/StudentRegistrationForm";
import { deleteStudent } from "@/lib/actions";

export function StudentClientWrapper({ initialStudents, labels }: { initialStudents: any[], labels: any[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // State for Edit
  const [editingStudent, setEditingStudent] = useState<any>(null);

  const regulerStudents = initialStudents.filter(s => s.status === 'REGISTERED');
  const cgStudents = initialStudents.filter(s => s.status === 'CG');

  const displayedStudents = 
    activeTab === "all" ? initialStudents :
    activeTab === "reguler" ? regulerStudents : cgStudents;

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus data siswa "${name}" secara permanen? Data yang sudah dihapus tidak dapat dikembalikan.`)) {
      try {
        await deleteStudent(id);
        router.refresh();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Buku Induk Siswa
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola data siswa, tingkat level, dan status percobaan gratis (CG).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icons.search className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-full border-0 py-2 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white"
              placeholder="Cari nama siswa..."
            />
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-x-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 shrink-0"
          >
            <Icons.add className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Pendaftaran Baru
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("all")}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${activeTab === "all" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}
            `}
          >
            Semua Siswa <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 py-0.5 px-2.5 text-xs">{initialStudents.length}</span>
          </button>
          <button
             onClick={() => setActiveTab("reguler")}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${activeTab === "reguler" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}
            `}
          >
            Reguler <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 py-0.5 px-2.5 text-xs">{regulerStudents.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("cg")}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${activeTab === "cg" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}
            `}
          >
            Coba Gratis (CG) <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 py-0.5 px-2.5 text-xs">{cgStudents.length}</span>
          </button>
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
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
                            : 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20'
                        }`}>
                          {person.status === 'REGISTERED' ? 'Reguler' : 'CG'}
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
                        <div>{new Date(person.date_of_birth).toLocaleDateString('id-ID')}</div>
                        <div className="text-xs text-slate-400 font-semibold">{ageText}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(person.registration_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-3">
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
