"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { login } from "@/lib/authActions";
import { InstallPWAButton } from "@/components/features/auth/InstallPWAButton";

const QUICK_ACCOUNTS = [
  { label: "-- Pilih Akun Cepat --", email: "", icon: "✨", role: "Pilih Akun" },
  { label: "Superadmin", email: "superadmin@shiningsun.com", icon: "👑", role: "Akses Penuh (All Access)" },
  { label: "Cabang Ngunut", email: "ngunut@shiningsun.com", icon: "🏫", role: "Admin Cabang Ngunut" },
  { label: "Cabang Balesono", email: "balesono@shiningsun.com", icon: "🏫", role: "Admin Cabang Balesono" },
  { label: "Cabang Gragalan", email: "gragalan@shiningsun.com", icon: "🏫", role: "Admin Cabang Gragalan" }
];

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Compute selected quick account value (defaults to "" if manual email typed)
  const selectedQuickAccount = QUICK_ACCOUNTS.some(acc => acc.email === email && acc.email !== "") ? email : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const emailVal = email.trim();
    const passwordVal = password;

    if (!emailVal) {
      setErrorMsg("Alamat email tidak boleh kosong. Silakan pilih akun atau isi email secara manual.");
      setIsSubmitting(false);
      return;
    }

    if (!passwordVal) {
      setErrorMsg("Kata sandi tidak boleh kosong.");
      setIsSubmitting(false);
      return;
    }

    const formatAuthError = (msg: string) => {
      if (!msg) return "Gagal masuk. Periksa kembali email dan password Anda.";
      if (msg.includes("Invalid login credentials")) {
        return "Email atau Password yang Anda masukkan salah. Silakan periksa kembali.";
      }
      if (msg.includes("Email not confirmed")) {
        return "Email akun ini belum dikonfirmasi di Supabase.";
      }
      if (msg.includes("too many requests") || msg.includes("Rate limit")) {
        return "Terlalu banyak percobaan login. Silakan tunggu beberapa saat.";
      }
      return msg;
    };

    try {
      // Set remember_me cookie directly on client
      document.cookie = `remember_me=${rememberMe ? 'true' : 'false'}; path=/; ${rememberMe ? 'max-age=31536000;' : ''} SameSite=Lax`;
      
      // Clear stale superadmin branch selection cookie
      document.cookie = `superadmin_branch_id=; path=/; max-age=0; SameSite=Lax`;

      // Perform client-side login directly on mobile browser to set cookies in document.cookie
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.signInWithPassword({
        email: emailVal,
        password: passwordVal,
      });

      if (error) {
        // Fallback to Server Action login if client login encountered an error
        const res = await login(emailVal, passwordVal, rememberMe);
        if (res && !res.success) {
          setErrorMsg(formatAuthError(res.error || error.message));
          setIsSubmitting(false);
          return;
        }
      }

      // Hard redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error: any) {
      setErrorMsg(formatAuthError(error.message));
      setIsSubmitting(false);
    }
  };

  const [resetMsg, setResetMsg] = useState("");

  const handleResetPWA = async () => {
    setIsSubmitting(true);
    setResetMsg("Membersihkan cache dan memori HP...");

    // 1. Unregister Service Workers
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister().catch(() => {});
        }
      }
    } catch (e) {}

    // 2. Clear Cache Storage
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key).catch(() => {});
        }
      }
    } catch (e) {}

    // 3. Clear LocalStorage & SessionStorage
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (e) {}

    // 4. Clear Cookies
    try {
      if (typeof document !== 'undefined') {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
        });
      }
    } catch (e) {}

    setResetMsg("Cache berhasil dibersihkan! Memuat ulang...");

    // 5. Hard reload using window.location.href with cache-buster
    setTimeout(() => {
      window.location.href = window.location.pathname + "?reset=" + Date.now();
    }, 400);
  };

  return (
    <div className="relative">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xl shadow-slate-900/10 border border-slate-100 dark:border-slate-800">
        
        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-5">
          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-medium flex gap-2 animate-in fade-in zoom-in-95">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {/* Quick Account Custom Dropdown */}
            <div className="relative">
              <label 
                className="block text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                Pilih Akun Cepat
              </label>
              
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`relative w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 rounded-xl border ${
                  isDropdownOpen 
                    ? "border-brand-500 ring-2 ring-brand-500/30 bg-white dark:bg-slate-900" 
                    : "border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                } transition-all min-h-[44px] sm:min-h-[48px] px-3.5 text-left cursor-pointer shadow-xs`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">
                    {QUICK_ACCOUNTS.find(a => a.email === email)?.icon || "✨"}
                  </span>
                  <span className={`text-xs sm:text-sm font-medium truncate ${
                    email ? "text-slate-900 dark:text-white font-semibold" : "text-slate-500 dark:text-slate-400"
                  }`}>
                    {QUICK_ACCOUNTS.find(a => a.email === email)?.label || "-- Pilih Akun Cepat --"}
                  </span>
                </div>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${
                    isDropdownOpen ? "rotate-180 text-brand-500" : ""
                  }`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* Floating Menu Popover */}
              {isDropdownOpen && (
                <>
                  {/* Invisible Backdrop */}
                  <div 
                    className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-xs" 
                    onClick={() => setIsDropdownOpen(false)} 
                  />
                  
                  {/* Menu Popover Container */}
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    {QUICK_ACCOUNTS.map((acc, idx) => {
                      const isSelected = (acc.email === email && acc.email !== "") || (!email && idx === 0);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (acc.email) {
                              setEmail(acc.email);
                            } else {
                              setEmail("");
                            }
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                            isSelected
                              ? "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold border border-brand-200/60 dark:border-brand-800/40"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">{acc.icon}</span>
                            <div className="text-left min-w-0">
                              <p className="truncate font-semibold text-slate-900 dark:text-white leading-snug">
                                {acc.label}
                              </p>
                              {acc.role && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                                  {acc.role}
                                </p>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600 dark:text-brand-400 shrink-0 ml-2">
                              <path d="M20 6 9 17l-5-5"/>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Email Input */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-xl blur opacity-0 group-hover:opacity-15 transition duration-500 pointer-events-none"></div>
              <div className="relative bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900 min-h-[44px]">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="peer block w-full bg-transparent px-3.5 pt-4 pb-1.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none placeholder-transparent"
                  placeholder="admin@shiningsun.com"
                />
                <label 
                  htmlFor="email" 
                  className="absolute left-3.5 top-1 text-slate-400 text-[10px] sm:text-[11px] font-medium transition-all peer-placeholder-shown:text-xs sm:peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-[10px] sm:peer-focus:text-[11px] peer-focus:top-1 peer-focus:text-brand-500 dark:peer-focus:text-brand-400 pointer-events-none"
                >
                  Alamat Email
                </label>
              </div>
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-xl blur opacity-0 group-hover:opacity-15 transition duration-500 pointer-events-none"></div>
              <div className="relative bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900 min-h-[44px]">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer block w-full bg-transparent pl-3.5 pr-10 pt-4 pb-1.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none placeholder-transparent"
                  placeholder="••••••••"
                />
                <label 
                  htmlFor="password" 
                  className="absolute left-3.5 top-1 text-slate-400 text-[10px] sm:text-[11px] font-medium transition-all peer-placeholder-shown:text-xs sm:peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-[10px] sm:peer-focus:text-[11px] peer-focus:top-1 peer-focus:text-brand-500 dark:peer-focus:text-brand-400 pointer-events-none"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 transition-colors rounded-lg flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
                />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Ingat Saya
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="relative w-full group overflow-hidden rounded-xl bg-brand-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 min-h-[44px] cursor-pointer"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-brand-400 via-brand-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <span className="relative flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  Masuk ke Dashboard Admin
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </>
              )}
            </span>
          </button>

          {/* Separator */}
          <div className="relative my-3 sm:my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] sm:text-[11px] uppercase tracking-wider">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-bold">Akses Orang Tua / Siswa</span>
            </div>
          </div>

          {/* Parent / Student Portal Card */}
          <a
            href="/portal-ortu"
            className="w-full flex items-center gap-3 p-3 rounded-xl sm:rounded-2xl bg-brand-50/80 dark:bg-brand-950/30 border border-brand-200/80 dark:border-brand-900/60 hover:bg-brand-100/60 dark:hover:bg-brand-900/40 text-slate-800 dark:text-white transition-all group shadow-xs"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-brand-600 text-white flex items-center justify-center text-base sm:text-lg shadow-sm shrink-0 font-bold group-hover:scale-105 transition-transform">
              👨‍👩‍👧
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Portal Orang Tua & Siswa
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Cek Jadwal Kelas & Laporan Perkembangan Siswa
              </p>
            </div>
          </a>

          {/* Footer: Install PWA + Reset Cache */}
          <div className="flex flex-col items-center gap-1.5 pt-0.5">
            <InstallPWAButton />
            {resetMsg && (
              <p className="text-[11px] text-center text-brand-600 dark:text-brand-400 font-medium animate-pulse py-0.5">
                {resetMsg}
              </p>
            )}
            <button
              type="button"
              onClick={handleResetPWA}
              disabled={isSubmitting}
              className="text-[10px] sm:text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline text-center transition-colors py-0.5 disabled:opacity-50 cursor-pointer"
            >
              Terjadi masalah di HP ini? Klik untuk Reset Cache Aplikasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
