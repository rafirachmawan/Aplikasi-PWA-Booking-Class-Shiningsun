"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { login } from "@/lib/authActions";
import { InstallPWAButton } from "@/components/features/auth/InstallPWAButton";

const QUICK_ACCOUNTS = [
  { label: "Pilih Akun Cepat...", email: "" },
  { label: "Superadmin — superadmin@shiningsun.com", email: "superadmin@shiningsun.com" },
  { label: "Cabang Ngunut — ngunut@shiningsun.com", email: "ngunut@shiningsun.com" },
  { label: "Cabang Balesono — balesono@shiningsun.com", email: "balesono@shiningsun.com" },
  { label: "Cabang Gragalan — gragalan@shiningsun.com", email: "gragalan@shiningsun.com" }
];

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
          setErrorMsg(res.error || error.message || "Gagal masuk. Periksa kembali email dan password Anda.");
          setIsSubmitting(false);
          return;
        }
      }

      // Hard redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error: any) {
      setErrorMsg(error.message || "Gagal masuk. Periksa kembali email dan password Anda.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 shadow-2xl shadow-brand-500/5 ring-1 ring-slate-900/5 dark:ring-white/10">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-medium flex gap-3 animate-in fade-in zoom-in-95">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errorMsg}
            </div>
          )}

          <div className="space-y-5">
            {/* Quick Account Dropdown */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative bg-slate-50 dark:bg-slate-800/80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500">
                <select
                  value={selectedQuickAccount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setEmail(val);
                    }
                  }}
                  className="block w-full appearance-none bg-transparent px-5 py-4 text-sm text-slate-900 dark:text-white focus:outline-none cursor-pointer truncate pr-10"
                >
                  {QUICK_ACCOUNTS.map((acc, idx) => (
                    <option key={idx} value={acc.email} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {acc.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900">
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
                  className="peer block w-full bg-transparent px-5 pt-6 pb-2 text-sm text-slate-900 dark:text-white focus:outline-none placeholder-transparent"
                  placeholder="admin@shiningsun.com"
                />
                <label 
                  htmlFor="email" 
                  className="absolute left-5 top-2 text-slate-400 text-xs font-medium transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:text-xs peer-focus:top-2 peer-focus:text-brand-500 dark:peer-focus:text-brand-400 pointer-events-none"
                >
                  Alamat Email
                </label>
              </div>
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/50 transition-all focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-900">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer block w-full bg-transparent pl-5 pr-12 pt-6 pb-2 text-sm text-slate-900 dark:text-white focus:outline-none placeholder-transparent"
                  placeholder="••••••••"
                />
                <label 
                  htmlFor="password" 
                  className="absolute left-5 top-2 text-slate-400 text-xs font-medium transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:text-xs peer-focus:top-2 peer-focus:text-brand-500 dark:peer-focus:text-brand-400 pointer-events-none"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 transition-colors rounded-xl"
                >
                  {showPassword ? (
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
                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Ingat Saya
                </span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="relative w-full group overflow-hidden rounded-2xl bg-brand-600 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-brand-400 via-brand-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk ke Dashboard
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </>
                )}
              </span>
            </button>
          </div>

          <div className="pt-2">
            <InstallPWAButton />
          </div>
        </form>
      </div>
    </div>
  );
}
