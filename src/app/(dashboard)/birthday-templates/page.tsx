import { getCurrentUserRole } from "@/lib/actions";
import { BirthdayTemplateManager } from "@/components/features/admin/BirthdayTemplateManager";

// Batch2 hemat: hapus force-dynamic redundan — tetap dynamic otomatis via cookies().
// Halaman jarang berubah → ISR 60 detik. Logika role check sama.
export const revalidate = 60;

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
      {/* Judul halaman: hero biru solid selaras dashboard Hallo. */}
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-white/85">
            Portal orang tua
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Template Ucapan Ulang Tahun
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
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
