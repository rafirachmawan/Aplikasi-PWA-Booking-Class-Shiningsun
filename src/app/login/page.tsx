import Image from "next/image";
import { LoginForm } from "@/components/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-600 flex-col justify-between p-12 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-56 h-56 rounded-full bg-brand-700/40 blur-2xl" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-white/5 blur-xl" />

        {/* Top - Logo & Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">ShiningSun</span>
          </div>
        </div>

        {/* Center - Tagline */}
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Sistem Penjadwalan
            <br />
            <span className="text-brand-200">Cerdas & Mudah</span>
          </h1>
          <p className="text-brand-100/80 text-lg max-w-md">
            Kelola jadwal kelas, data siswa, dan booking sesi dalam satu platform yang terintegrasi.
          </p>
        </div>

        {/* Bottom - Footer */}
        <div className="relative z-10">
          <p className="text-white/70 text-sm">&copy; 2026 ShiningSun. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 bg-slate-50 dark:bg-slate-900 relative">
        {/* Mobile Header Decoration */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-64 bg-brand-600 rounded-b-[40px] -z-0">
          <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-brand-700/40 blur-2xl" />
        </div>

        <div className="mx-auto w-full max-w-[440px] relative z-10 mt-10 lg:mt-0">
          {/* Mobile Logo & Welcome (hidden on desktop) */}
          <div className="flex flex-col items-center mb-8 lg:hidden text-center -mt-20">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-white/30 mb-5">
              <Image src="/logo.png" alt="ShiningSun Logo" width={40} height={40} className="object-contain" priority />
            </div>
            <h2 className="text-3xl font-bold text-white">ShiningSun</h2>
            <p className="mt-2 text-brand-100 text-sm max-w-xs">Sistem penjadwalan cerdas & mudah untuk cabang Anda</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Selamat Datang</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Masuk ke sistem manajemen cabang Anda</p>
          </div>

          <div className="bg-white px-6 py-8 sm:py-10 shadow-xl shadow-slate-200/40 sm:rounded-3xl sm:px-10 dark:bg-slate-800 ring-1 ring-slate-900/5 dark:ring-slate-700/50 dark:shadow-none rounded-3xl">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
