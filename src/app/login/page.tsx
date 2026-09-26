import Image from "next/image";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { Icons } from "@/components/ui/icons";

/**
 * Login split: form kiri, panel brand kanan.
 * Satu color-block brand (bg-brand-950) yang disengaja, bukan theme-flip.
 * Shape lock: kartu 16px (rounded-2xl), kontrol 12px (rounded-xl), badge kecil 8px (rounded-lg).
 * Aksen tunggal: brand-600. Amber hanya untuk medali maskot (aset brand).
 */
export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] bg-zinc-100 font-sans text-slate-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[5fr_7fr]">
        {/* Kolom form: rata kiri, tanpa card-dalam-card, tanpa glow */}
        <div className="flex flex-col bg-white dark:bg-zinc-900">
          {/* Pita brand mobile/tablet: header yang ditumpuk lembar form ala bottom-sheet.
              Hanya tampil di bawah lg karena lg+ memakai panel brand kanan. */}
          <div className="anim-login-rise relative overflow-hidden rounded-b-2xl bg-brand-950 px-4 pt-5 pb-9 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] min-[380px]:px-5 sm:px-8 lg:hidden">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-brand-400/25 blur-[80px]" />
              {/* Kisi sinar matahari: motif brand, putar lambat, diam saat reduced-motion */}
              <svg
                aria-hidden="true"
                viewBox="0 0 100 100"
                fill="none"
                className="anim-sun-rotate absolute -top-20 -right-20 h-64 w-64 origin-center text-white/12 [transform-box:fill-box]"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="2 6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="1 7"
                />
              </svg>
            </div>
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1 ring-1 ring-white/20">
                <Image
                  src="/logo.png"
                  alt="Logo ShiningSun"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-base font-bold tracking-tight">
                  ShiningSun
                </p>
                <p className="truncate text-xs text-slate-300/80">
                  Sistem Penjadwalan Cabang
                </p>
              </div>
              <div className="shrink-0 rounded-full bg-amber-300 p-1 ring-1 ring-amber-200/60">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white p-1 min-[380px]:h-14 min-[380px]:w-14">
                  <Image
                    src="/logo.png"
                    alt="Maskot ShiningSun"
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>
            <p className="relative mt-3 text-[13px] font-semibold text-brand-100 min-[380px]:text-sm [@media(max-height:500px)]:hidden">
              Cerdas, Ceria, Kreatif dan Mandiri
            </p>
            {/* Tiga kapabilitas ringkas: grid 3 kolom bersekat hairline */}
            <div className="relative mt-3 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 [@media(max-height:500px)]:hidden">
              <div className="flex items-center gap-1.5 py-2.5 pr-2">
                <Icons.calendar className="h-3.5 w-3.5 shrink-0 text-brand-200" />
                <span className="text-[11px] leading-tight font-medium text-slate-200">
                  Jadwal real-time
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-2.5">
                <Icons.users className="h-3.5 w-3.5 shrink-0 text-brand-200" />
                <span className="text-[11px] leading-tight font-medium text-slate-200">
                  Data terpusat
                </span>
              </div>
              <div className="flex items-center gap-1.5 py-2.5 pl-2">
                <Icons.fileText className="h-3.5 w-3.5 shrink-0 text-brand-200" />
                <span className="text-[11px] leading-tight font-medium text-slate-200">
                  Booking cabang
                </span>
              </div>
            </div>
          </div>

          {/* Lembar form: menumpuk pita brand ala bottom-sheet di mobile,
              rata biasa di desktop. */}
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center bg-white px-4 py-6 min-[380px]:px-5 min-[380px]:py-8 sm:px-8 lg:px-12 lg:py-8 max-lg:anim-login-rise-late max-lg:relative max-lg:z-10 max-lg:-mt-5 max-lg:rounded-t-2xl max-lg:shadow-[0_-18px_36px_-28px_rgba(23,37,84,0.55)] dark:bg-zinc-900">
            <div className="mb-5 min-[380px]:mb-6">
              <h1 className="text-2xl font-bold tracking-tight min-[380px]:text-3xl">
                Selamat Datang
              </h1>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
                Masuk untuk mengelola jadwal, siswa, dan booking sesi cabang.
              </p>
            </div>

            <LoginForm />

            {/* Fallback for devices without JS */}
            <noscript>
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-center">
                <p className="mb-1 text-xs font-bold text-amber-600">
                  JavaScript tidak aktif di browser ini.
                </p>
                <a
                  href="/login-basic"
                  className="text-xs font-extrabold text-amber-700 underline"
                >
                  Klik di sini untuk Login Kompatibel
                </a>
              </div>
            </noscript>
          </div>

          {/* Footer form: hormati safe-area PWA di HP */}
          <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] min-[380px]:px-5 sm:px-8 lg:px-12">
            <p className="border-t border-slate-200 pt-4 text-xs text-slate-400 dark:border-zinc-800 dark:text-zinc-500">
              &copy; 2026 ShiningSun Preschool &amp; Academy
            </p>
          </div>
        </div>

        {/* Panel brand: satu-satunya color block di halaman */}
        <div className="relative hidden flex-col overflow-hidden bg-brand-950 p-10 text-white lg:flex xl:p-14">
          {/* Satu aksen radial statis di belakang medali (motif matahari brand).
              Bukan mesh-gradient ungu AI: hanya amber lembut, sekali render. */}
          <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-1/3 left-10 h-80 w-80 rounded-full bg-brand-400/20 blur-[110px]" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1 ring-1 ring-white/20">
                <Image
                  src="/logo.png"
                  alt="Logo ShiningSun"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xl font-bold tracking-tight">
                ShiningSun
              </span>
            </div>
          </div>

          <div className="relative mt-10 max-w-xl pb-10 xl:mt-14">
            <h2 className="text-4xl leading-[1.1] font-bold tracking-tight xl:text-5xl">
              Cerdas, Ceria,
              <br />
              Kreatif dan Mandiri
            </h2>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed font-light text-slate-300/90">
              Solusi komprehensif untuk mengelola jadwal kelas, data siswa, dan
              booking sesi cabang secara real-time.
            </p>

            {/* Tiga kapabilitas sebagai grup hairline, bukan kartu */}
            <div className="mt-8 divide-y divide-white/10 border-t border-white/10">
              <div className="flex items-center gap-3 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icons.calendar className="h-4 w-4 text-brand-200" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Jadwal kelas real-time</p>
                  <p className="truncate text-xs text-slate-300/70">
                    Semua cabang terpantau dalam satu dasbor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icons.users className="h-4 w-4 text-brand-200" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Data siswa terpusat</p>
                  <p className="truncate text-xs text-slate-300/70">
                    Pendaftaran, label, dan laporan perkembangan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icons.fileText className="h-4 w-4 text-brand-200" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Booking sesi cabang</p>
                  <p className="truncate text-xs text-slate-300/70">
                    Alokasi sesi antar cabang tanpa bentrok
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-auto pt-8">
            <p className="text-sm font-medium text-white/40">
              &copy; 2026 ShiningSun. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
