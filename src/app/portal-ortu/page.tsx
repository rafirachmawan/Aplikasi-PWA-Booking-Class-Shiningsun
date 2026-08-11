"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { verifyParentAccess } from "@/lib/actions";
import { InstallPWAButton } from "@/components/features/auth/InstallPWAButton";

export default function ParentLoginPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPin, setShowPin] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setErrorMsg("Masukkan Nama Siswa terlebih dahulu.");
      return;
    }
    if (!pin.trim()) {
      setErrorMsg("Masukkan PIN Akses terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      await verifyParentAccess(studentName, pin);
      router.push("/portal-ortu/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal masuk. Periksa nama siswa dan PIN.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 overflow-x-hidden font-sans">
      
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative flex-col justify-between p-12 overflow-hidden bg-[#0A0F1C] border-r border-slate-800/50">
        
        {/* Animated Mesh Gradient Background (Brand Blue Theme) */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute -top-1/4 -left-1/4 w-[85%] h-[85%] rounded-full bg-brand-600/35 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-1/3 -right-1/4 w-[75%] h-[75%] rounded-full bg-blue-500/25 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute -bottom-1/4 left-1/4 w-[90%] h-[90%] rounded-full bg-indigo-500/25 blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        </div>
        
        {/* Abstract Grid Overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        {/* Top - Logo & Brand */}
        <div className="relative z-10 animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
              <Image src="/logo.png" alt="Logo" width={38} height={38} className="object-contain" priority />
            </div>
            <div>
              <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight block">
                ShiningSun
              </span>
              <span className="text-xs font-bold text-brand-400 tracking-wider uppercase">
                Preschool & Academy
              </span>
            </div>
          </div>
        </div>

        {/* Center - Hero Header */}
        <div className="relative z-10 space-y-6 my-auto py-8 animate-in fade-in slide-in-from-left-8 duration-1000 delay-300">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            👨‍👩‍👧 Portal Mandiri Orang Tua
          </div>

          <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
            Pantau Perkembangan & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-400">
              Jadwal Kelas Anak
            </span>
          </h1>

          <p className="text-slate-300/80 text-lg max-w-lg leading-relaxed font-light">
            Akses informasi jadwal mendatang, riwayat sesi kelas, dan unduh laporan perkembangan evaluasi anak Anda secara real-time.
          </p>

          {/* Detailed Feature Cards on Left Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <div className="text-xl">📅</div>
              <h4 className="text-xs font-bold text-white">Jadwal Kelas</h4>
              <p className="text-[11px] text-slate-400">Sesi mendatang & riwayat kehadiran</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <div className="text-xl">📄</div>
              <h4 className="text-xs font-bold text-white">Laporan Perkembangan</h4>
              <p className="text-[11px] text-slate-400">Modul & catatan guru via Drive</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <div className="text-xl">🔑</div>
              <h4 className="text-xs font-bold text-white">PIN Instan</h4>
              <p className="text-[11px] text-slate-400">Tanpa ribet daftar akun baru</p>
            </div>
          </div>
        </div>

        {/* Bottom - Copyright */}
        <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <p className="text-white/40 text-sm font-medium">&copy; 2026 ShiningSun. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Form Container (Full Height & Clean Spacing with Safe Area Padding) */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-8 lg:p-12 pb-5 sm:pb-8 lg:pb-12 bg-slate-900 lg:bg-white dark:lg:bg-[#0B1120] relative z-10 min-h-screen">
        
        {/* Animated Mesh background for Mobile */}
        <div className="lg:hidden absolute inset-0 w-full h-full -z-10 overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-[140%] h-[80%] rounded-full bg-brand-600/35 blur-[90px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-1/2 -right-1/4 w-[120%] h-[70%] rounded-full bg-indigo-500/25 blur-[80px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-25 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        </div>

        <div className="w-full max-w-[420px] mx-auto my-auto py-2 sm:py-4">
          
          {/* Header - Brand & Title */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left mb-6">
            
            {/* Logo Icon Box (Mobile Only) */}
            <div className="h-16 w-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 mb-3.5 lg:hidden">
              <Image src="/logo.png" alt="ShiningSun Logo" width={40} height={40} className="object-contain" priority />
            </div>

            {/* Portal Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-500/20 lg:bg-brand-50 dark:lg:bg-brand-950/50 border border-brand-500/30 lg:border-brand-200 dark:lg:border-brand-800 text-brand-300 lg:text-brand-600 dark:lg:text-brand-400 text-xs font-bold mb-3">
              👨‍👩‍👧 Portal Orang Tua & Siswa
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white lg:text-slate-900 lg:dark:text-white tracking-tight">
              Selamat Datang Orang Tua
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 lg:text-slate-500 lg:dark:text-slate-400">
              Masukkan Nama Siswa & PIN Akses untuk melihat laporan
            </p>
          </div>

          {/* Login Card Container */}
          <div className="bg-white/90 dark:bg-slate-900/90 lg:bg-white dark:lg:bg-slate-900 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 space-y-5">
            
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-[13px] font-medium flex gap-2.5 animate-in fade-in zoom-in-95">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Student Name Input */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-xl blur opacity-0 group-hover:opacity-15 transition duration-500 pointer-events-none"></div>
                <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900 min-h-[50px]">
                  <div className="pl-3.5 pr-1 text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="relative flex-1">
                    <input
                      id="studentName"
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="peer block w-full bg-transparent pr-4 pt-5 pb-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-none placeholder-transparent"
                      placeholder="Nama Siswa"
                    />
                    <label 
                      htmlFor="studentName" 
                      className="absolute left-0 top-1.5 text-slate-400 text-[11px] font-semibold transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:text-[11px] peer-focus:top-1.5 peer-focus:text-brand-500 dark:peer-focus:text-brand-400 pointer-events-none"
                    >
                      Nama Siswa / Panggilan
                    </label>
                  </div>
                </div>
              </div>

              {/* PIN Input */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-xl blur opacity-0 group-hover:opacity-15 transition duration-500 pointer-events-none"></div>
                <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900 min-h-[50px]">
                  <div className="pl-3.5 pr-1 text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div className="relative flex-1">
                    <input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      maxLength={10}
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="peer block w-full bg-transparent pr-10 pt-5 pb-2 text-sm font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none placeholder-transparent"
                      placeholder="PIN"
                    />
                    <label 
                      htmlFor="pin" 
                      className="absolute left-0 top-1.5 text-slate-400 text-[11px] font-semibold transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:text-[11px] peer-focus:top-1.5 peer-focus:text-brand-500 dark:peer-focus:text-brand-400 pointer-events-none tracking-normal"
                    >
                      PIN Akses Orang Tua
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 transition-colors rounded-lg flex items-center justify-center min-h-[36px] min-w-[36px]"
                  >
                    {showPin ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full group overflow-hidden rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 min-h-[48px]"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-brand-400 via-brand-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      Masuk Portal Orang Tua
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </>
                  )}
                </span>
              </button>

              {/* Info Note & Switch Link */}
              <div className="pt-1 text-center space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Belum memiliki PIN anak? Hubungi pihak admin sekolah.
                </p>
                <div>
                  <a
                    href="/login"
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors underline inline-flex items-center gap-1"
                  >
                    ← Kembali ke Login Admin & Staf
                  </a>
                </div>
              </div>
            </form>

            {/* Mobile Feature Highlights Inside Card */}
            <div className="lg:hidden border-t border-slate-100 dark:border-slate-800/80 pt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <span className="text-base block mb-0.5">📅</span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">Jadwal Kelas</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <span className="text-base block mb-0.5">📄</span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">Laporan Perkembangan</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <span className="text-base block mb-0.5">🔑</span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">Akses PIN</span>
              </div>
            </div>

          </div>

          {/* Footer Install PWA Button & Copyright */}
          <div className="text-center pt-3 space-y-4">
            <InstallPWAButton />
            <p className="text-white/60 lg:text-slate-400 dark:lg:text-slate-500 text-[11px] font-medium tracking-wide pt-1 pb-1">
              &copy; 2026 ShiningSun. All rights reserved.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
