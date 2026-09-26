"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { login } from "@/lib/authActions";
import { Icons } from "@/components/ui/icons";
import { InstallPWAButton } from "@/components/features/auth/InstallPWAButton";

const QUICK_ACCOUNTS = [
  {
    label: "-- Pilih Akun Cepat --",
    email: "",
    initial: "",
    badgeClass:
      "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
    role: "Pilih Akun",
  },
  {
    label: "Superadmin",
    email: "superadmin@shiningsun.com",
    initial: "S",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    role: "Akses Penuh (All Access)",
  },
  {
    label: "Cabang Ngunut",
    email: "ngunut@shiningsun.com",
    initial: "N",
    badgeClass: "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
    role: "Admin Cabang Ngunut",
  },
  {
    label: "Cabang Balesono",
    email: "balesono@shiningsun.com",
    initial: "B",
    badgeClass: "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
    role: "Admin Cabang Balesono",
  },
  {
    label: "Cabang Gragalan",
    email: "gragalan@shiningsun.com",
    initial: "G",
    badgeClass: "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
    role: "Admin Cabang Gragalan",
  },
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
  const selectedQuickAccount = QUICK_ACCOUNTS.some(
    (acc) => acc.email === email && acc.email !== "",
  )
    ? email
    : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const emailVal = email.trim();
    const passwordVal = password;

    if (!emailVal) {
      setErrorMsg(
        "Alamat email tidak boleh kosong. Silakan pilih akun atau isi email secara manual.",
      );
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
      document.cookie = `remember_me=${rememberMe ? "true" : "false"}; path=/; ${rememberMe ? "max-age=31536000;" : ""} SameSite=Lax`;

      // Clear stale superadmin branch selection cookie
      document.cookie = `superadmin_branch_id=; path=/; max-age=0; SameSite=Lax`;

      // Perform client-side login directly on mobile browser to set cookies in document.cookie
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister().catch(() => {});
        }
      }
    } catch (e) {}

    // 2. Clear Cache Storage
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key).catch(() => {});
        }
      }
    } catch (e) {}

    // 3. Clear LocalStorage & SessionStorage
    try {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (e) {}

    // 4. Clear Cookies
    try {
      if (typeof document !== "undefined") {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(
              /=.*/,
              "=;expires=" + new Date(0).toUTCString() + ";path=/",
            );
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
    <div className="relative" data-selected-quick-account={selectedQuickAccount}>
      {/* Form tanpa kartu: grup spasi + satu hairline antar blok */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {errorMsg && (
          <div
            role="alert"
            className="flex gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400"
          >
            <Icons.alertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Quick Account Custom Dropdown */}
          <div className="relative">
            <label
              htmlFor="quick-account-btn"
              className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-zinc-300"
            >
              Pilih Akun Cepat
            </label>

            <button
              id="quick-account-btn"
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              className={`flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-3.5 text-left transition-colors dark:bg-zinc-900 ${
                isDropdownOpen
                  ? "border-brand-600 ring-2 ring-brand-600/25"
                  : "border-slate-300 hover:border-slate-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {(() => {
                  const acc = QUICK_ACCOUNTS.find((a) => a.email === email);
                  return acc?.initial ? (
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${acc.badgeClass}`}
                    >
                      {acc.initial}
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/15">
                      <Icons.users className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                    </span>
                  );
                })()}
                <span
                  className={`truncate text-base font-medium sm:text-sm ${
                    email
                      ? "font-semibold text-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-zinc-400"
                  }`}
                >
                  {QUICK_ACCOUNTS.find((a) => a.email === email)?.label ||
                    "-- Pilih Akun Cepat --"}
                </span>
              </span>

              <Icons.chevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-zinc-500 ${
                  isDropdownOpen ? "rotate-180 text-brand-600" : ""
                }`}
              />
            </button>

            {/* Floating Menu Popover */}
            {isDropdownOpen && (
              <>
                {/* Invisible Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />

                {/* Menu Popover Container */}
                <div className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-72 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  {QUICK_ACCOUNTS.map((acc, idx) => {
                    const isSelected =
                      (acc.email === email && acc.email !== "") ||
                      (!email && idx === 0);
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
                        className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isSelected
                            ? "border border-brand-200 bg-brand-50 font-bold text-brand-700 dark:border-brand-800/50 dark:bg-brand-950/60 dark:text-brand-300"
                            : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          {acc.initial ? (
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${acc.badgeClass}`}
                            >
                              {acc.initial}
                            </span>
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/15">
                              <Icons.users className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                            </span>
                          )}
                          <span className="min-w-0 text-left">
                            <span className="block truncate leading-snug font-semibold text-slate-900 dark:text-white">
                              {acc.label}
                            </span>
                            {acc.role && (
                              <span className="block truncate text-xs leading-tight font-normal text-slate-500 dark:text-zinc-400">
                                {acc.role}
                              </span>
                            )}
                          </span>
                        </span>

                        {isSelected && (
                          <Icons.check className="ml-2 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Email Input: label di atas, bukan floating label */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-zinc-300"
            >
              Alamat Email
            </label>
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
              placeholder="admin@shiningsun.com"
              className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 transition-colors placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/25 focus:outline-none sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:hover:border-zinc-500"
            />
          </div>

          {/* Password Input: label di atas, bukan floating label */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-zinc-300"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white pr-11 pl-3.5 text-base text-slate-900 transition-colors placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/25 focus:outline-none sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:hover:border-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute top-1/2 right-2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <label className="group flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 dark:border-zinc-600 dark:bg-zinc-800"
              />
              <span className="text-sm text-slate-600 transition-colors group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-white">
                Ingat Saya
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button: solid satu warna, tactile active */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 w-full cursor-pointer rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:translate-y-[1px] disabled:opacity-50"
        >
          <span className="flex items-center justify-center gap-2">
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Memproses...
              </>
            ) : (
              <>
                Masuk ke Dashboard Admin
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </span>
        </button>

        {/* Separator: satu-satunya eyebrow di halaman */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-[11px] tracking-wider uppercase">
            <span className="bg-white px-3 font-bold text-slate-400 dark:bg-zinc-900 dark:text-zinc-500">
              Akses Orang Tua / Siswa
            </span>
          </div>
        </div>

        {/* Parent / Student Portal Card: satu kartu 16px di halaman form */}
        <a
          href="/portal-ortu"
          className="flex w-full items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 p-3 transition-all hover:bg-brand-100/70 active:translate-y-[1px] dark:border-brand-900/60 dark:bg-brand-950/30 dark:hover:bg-brand-900/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Icons.users className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-xs font-extrabold text-slate-900 dark:text-white">
              Portal Orang Tua &amp; Siswa
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-zinc-400">
              Cek Jadwal Kelas &amp; Laporan Perkembangan
            </span>
          </span>
        </a>
      </form>

      {/* Footer di bawah form: Install PWA + Reset Cache, dipisah hairline */}
      <div className="mt-6 flex flex-col items-center gap-1.5 border-t border-slate-200 pt-4 dark:border-zinc-800">
        <InstallPWAButton />
        {resetMsg && (
          <p className="py-0.5 text-center text-xs font-medium text-brand-600 dark:text-brand-400">
            {resetMsg}
          </p>
        )}
        <button
          type="button"
          onClick={handleResetPWA}
          disabled={isSubmitting}
          className="cursor-pointer py-0.5 text-center text-xs text-slate-500 underline transition-colors hover:text-slate-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Terjadi masalah di HP ini? Klik untuk Reset Cache Aplikasi
        </button>
        <a
          href="/login-basic"
          className="py-0.5 text-center text-xs text-slate-500 underline transition-colors hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Tidak bisa login? Coba halaman Login Kompatibel
        </a>
      </div>
    </div>
  );
}
