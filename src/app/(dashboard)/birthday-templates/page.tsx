import { getCurrentUserRole } from "@/lib/actions";
import { BirthdayTemplateManager } from "@/components/features/admin/BirthdayTemplateManager";

export const dynamic = "force-dynamic";

export default async function BirthdayTemplatePage() {
  const role = await getCurrentUserRole();

  // Only superadmin can access this page
  if (role !== "SUPERADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Akses Dibatasi
          </h2>
          <p className="text-slate-600 dark:text-zinc-400">
            Halaman ini hanya dapat diakses oleh Super Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Judul halaman: satu kartu putih seperti halaman lain. Tanpa blok biru. */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            Portal orang tua
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Template Ucapan Ulang Tahun
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
            Kelola dan edit template ucapan ulang tahun untuk portal orang tua.
            Template akan otomatis digunakan saat siswa punya ulang tahun.
          </p>
        </div>
      </div>

      {/* Template Editor */}
      <BirthdayTemplateManager />
    </div>
  );
}
