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
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Akses Dibatasi
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Halaman ini hanya dapat diakses oleh Super Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex flex-wrap items-center gap-x-2">
            📝 Template Ucapan Ulang Tahun
          </h2>
          <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
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
