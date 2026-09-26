"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  verifyParentAccess,
  confirmParentStudentSelection,
  getBranches,
} from "@/lib/actions";
import { InstallPWAButton } from "@/components/features/auth/InstallPWAButton";
import { Icons } from "@/components/ui/icons";

/**
 * Portal orang tua: form kiri, panel brand kanan (bahasa yang sama dengan /login).
 * Satu color-block brand (bg-brand-950) yang disengaja, bukan theme-flip.
 * Shape lock: kartu 16px (rounded-2xl), kontrol 12px (rounded-xl), badge kecil 8px (rounded-lg).
 * Aksen tunggal: brand-600. Amber hanya untuk medali maskot (aset brand).
 */
export default function ParentLoginPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [pin, setPin] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // OPSI 2 - disambiguasi bila >1 siswa cocok (tanpa ubah data)
  const [candidates, setCandidates] = useState<any[]>([]);
  const [needSelection, setNeedSelection] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    getBranches().then((data) => {
      if (data && data.length > 0) {
        setBranches(data);
      }
    });
  }, []);

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
    setCandidates([]);
    setNeedSelection(false);

    try {
      const result = await verifyParentAccess(
        studentName,
        pin,
        selectedBranchId,
      );
      // OPSI 2: bila nama+PIN cocok ke >1 siswa, tampilkan pilihan - jangan auto-login ke yang pertama.
      if ((result as any).needSelection && (result as any).candidates?.length > 1) {
        setCandidates((result as any).candidates);
        setNeedSelection(true);
        setErrorMsg(
          result.error ||
            "Ditemukan lebih dari satu siswa. Silakan pilih anak Anda.",
        );
        setIsLoading(false);
        return;
      }
      if (!result.success) {
        setErrorMsg(result.error || "Gagal masuk. Periksa nama siswa dan PIN.");
        setIsLoading(false);
        return;
      }
      window.location.href = "/portal-ortu/dashboard";
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan koneksi. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  const handleSelectCandidate = async (studentId: string) => {
    setSelectingId(studentId);
    setErrorMsg("");
    try {
      const result = await confirmParentStudentSelection(
        studentId,
        pin,
        studentName,
        selectedBranchId,
      );
      if (!result.success) {
        setErrorMsg(result.error || "Gagal memilih siswa. Coba lagi.");
        setSelectingId(null);
        return;
      }
      window.location.href = "/portal-ortu/dashboard";
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan koneksi. Silakan coba lagi.");
      setSelectingId(null);
    }
  };

  const handleBackToSearch = () => {
    setCandidates([]);
    setNeedSelection(false);
    setSelectingId(null);
    setErrorMsg("");
  };

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
                  Preschool &amp; Academy
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
              Pantau perkembangan dan jadwal kelas anak
            </p>
            {/* Tiga kapabilitas ringkas: grid 3 kolom bersekat hairline */}
            <div className="relative mt-3 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 [@media(max-height:500px)]:hidden">
              <div className="flex items-center gap-1.5 py-2.5 pr-2">
                <Icons.calendar className="h-3.5 w-3.5 shrink-0 text-brand-200" />
                <span className="text-[11px] leading-tight font-medium text-slate-200">
                  Jadwal kelas
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-2.5">
                <Icons.fileText className="h-3.5 w-3.5 shrink-0 text-brand-200" />
                <span className="text-[11px] leading-tight font-medium text-slate-200">
                  Laporan guru
                </span>
              </div>
              <div className="flex items-center gap-1.5 py-2.5 pl-2">
                <Icons.shield className="h-3.5 w-3.5 shrink-0 text-brand-200" />
                <span className="text-[11px] leading-tight font-medium text-slate-200">
                  Akses PIN
                </span>
              </div>
            </div>
          </div>

          {/* Lembar form: menumpuk pita brand ala bottom-sheet di mobile,
              rata biasa di desktop. */}
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center bg-white px-4 py-6 min-[380px]:px-5 min-[380px]:py-8 sm:px-8 lg:px-12 lg:py-8 max-lg:anim-login-rise-late max-lg:relative max-lg:z-10 max-lg:-mt-5 max-lg:rounded-t-2xl max-lg:shadow-[0_-18px_36px_-28px_rgba(23,37,84,0.55)] dark:bg-zinc-900">
            <div className="mb-5 min-[380px]:mb-6">
              {/* Lencana portal: tanpa emoji, ikon satu keluarga */}
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:border-brand-800/50 dark:bg-brand-950/50 dark:text-brand-300">
                <Icons.users className="h-3.5 w-3.5" />
                Portal Orang Tua &amp; Siswa
              </span>
              <h1 className="text-2xl font-bold tracking-tight min-[380px]:text-3xl">
                Selamat Datang Orang Tua
              </h1>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
                Masukkan nama siswa dan PIN akses untuk melihat laporan.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="flex gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400"
                >
                  <Icons.alertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Unit / Cabang Select */}
              {branches.length > 0 && (
                <div className="relative">
                  <label
                    htmlFor="branch-btn"
                    className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-zinc-300"
                  >
                    Pilih Unit / Cabang Sekolah
                  </label>

                  <button
                    id="branch-btn"
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
                      <span className="shrink-0 text-slate-400 dark:text-zinc-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                      <span
                        className={`truncate text-base font-medium sm:text-sm ${
                          selectedBranchId
                            ? "font-semibold text-slate-900 dark:text-white"
                            : "text-slate-500 dark:text-zinc-400"
                        }`}
                      >
                        {selectedBranchId
                          ? `Unit ${branches.find((b) => b.id === selectedBranchId)?.name}`
                          : "-- Semua Unit / Cabang --"}
                      </span>
                    </span>

                    <Icons.chevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-zinc-500 ${
                        isDropdownOpen ? "rotate-180 text-brand-600" : ""
                      }`}
                    />
                  </button>

                  {/* Custom Dropdown Menu */}
                  {isDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                      />

                      <div className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-72 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBranchId("");
                            setIsDropdownOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            !selectedBranchId
                              ? "border border-brand-200 bg-brand-50 font-bold text-brand-700 dark:border-brand-800/50 dark:bg-brand-950/60 dark:text-brand-300"
                              : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>-- Semua Unit / Cabang --</span>
                          {!selectedBranchId && (
                            <Icons.check className="ml-2 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                          )}
                        </button>

                        {branches.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setSelectedBranchId(b.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                              selectedBranchId === b.id
                                ? "border border-brand-200 bg-brand-50 font-bold text-brand-700 dark:border-brand-800/50 dark:bg-brand-950/60 dark:text-brand-300"
                                : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <span className="truncate">Unit {b.name}</span>
                            {selectedBranchId === b.id && (
                              <Icons.check className="ml-2 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Student Name Input: label di atas, bukan floating label */}
              <div>
                <label
                  htmlFor="studentName"
                  className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-zinc-300"
                >
                  Nama Siswa / Panggilan
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="studentName"
                    type="text"
                    name="student_name"
                    autoComplete="off"
                    data-lpignore="true"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Nama siswa sesuai data sekolah"
                    className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-11 text-base text-slate-900 transition-colors placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/25 focus:outline-none sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:hover:border-zinc-500"
                  />
                </div>
              </div>

              {/* PIN Input: label di atas, bukan floating label */}
              <div>
                <label
                  htmlFor="pin"
                  className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-zinc-300"
                >
                  PIN Akses Orang Tua
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    name="access_pin"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    data-lpignore="true"
                    maxLength={10}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN dari admin sekolah"
                    className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white pr-11 pl-11 text-base font-bold tracking-widest text-slate-900 transition-colors placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/25 focus:outline-none sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:hover:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                    className="absolute top-1/2 right-2 flex min-h-9 min-w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {showPin ? (
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

              {/* Submit Button: solid satu warna, tactile active */}
              <button
                type="submit"
                disabled={isLoading}
                className="min-h-12 w-full cursor-pointer rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:translate-y-[1px] disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg
                        className="h-5 w-5 animate-spin text-white"
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
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      Masuk Portal Orang Tua
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
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Info Note & Switch Link */}
              <div className="space-y-3 pt-1 text-center">
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  Belum memiliki PIN anak? Hubungi pihak admin sekolah.
                </p>

                {/* Back to Admin Login Card: satu kartu 16px */}
                <a
                  href="/login"
                  className="flex w-full items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 p-3 transition-all hover:bg-brand-100/70 active:translate-y-[1px] dark:border-brand-900/60 dark:bg-brand-950/30 dark:hover:bg-brand-900/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                    <Icons.chevronLeft className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-xs font-extrabold text-slate-900 dark:text-white">
                      Kembali ke Login Admin &amp; Staf
                    </span>
                  </span>
                </a>
              </div>
            </form>

            {/* OPSI 2 - Pilih anak bila nama+PIN cocok ke >1 siswa */}
            {needSelection && candidates.length > 1 && (
              <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pilih Anak Anda ({candidates.length} ditemukan)
                  </h4>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-zinc-400">
                    Nama &ldquo;{studentName.trim()}&rdquo; cocok dengan beberapa
                    siswa. Ketuk salah satu untuk masuk ke data yang benar.
                    Tanpa memilih, Anda tidak akan masuk ke siswa lain.
                  </p>
                </div>
                <div className="max-h-72 space-y-2 overflow-auto pr-0.5">
                  {candidates.map((c: any) => {
                    const isSelecting = selectingId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={selectingId !== null}
                        onClick={() => handleSelectCandidate(c.id)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-600 hover:ring-2 hover:ring-brand-600/25 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-sm font-extrabold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                          {(c.name || "?").trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {c.name}
                          </p>
                          <p className="truncate text-xs font-medium text-slate-500 dark:text-zinc-400">
                            Panggilan: {c.nickname || "-"}
                            {c.branch?.name ? ` - Unit ${c.branch.name}` : ""}
                            {c.label?.main_level
                              ? ` - ${c.label.main_level}${c.label?.sub_level ? ` ${c.label.sub_level}` : ""}`
                              : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-brand-600 dark:text-brand-400">
                          {isSelecting ? "Memilih..." : "Pilih"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleBackToSearch}
                  disabled={selectingId !== null}
                  className="w-full cursor-pointer text-xs font-bold text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Kembali dan perbaiki nama, PIN, atau cabang
                </button>
              </div>
            )}

            {/* Fallback for devices without JS */}
            <noscript>
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-center">
                <p className="mb-1 text-xs font-bold text-amber-600">
                  JavaScript tidak aktif di browser ini.
                </p>
                <a
                  href="/login"
                  className="text-xs font-extrabold text-amber-700 underline"
                >
                  Kembali ke halaman login
                </a>
              </div>
            </noscript>

            {/* Footer Install PWA Button & Copyright */}
            <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-center dark:border-zinc-800">
              <InstallPWAButton />
              <p className="pb-1 text-xs text-slate-400 dark:text-zinc-500">
                &copy; 2026 ShiningSun. All rights reserved.
              </p>
            </div>
          </div>

          {/* Footer form: hormati safe-area PWA di HP */}
          <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] min-[380px]:px-5 sm:px-8 lg:px-12">
            <p className="border-t border-slate-200 pt-4 text-xs text-slate-400 lg:hidden dark:border-zinc-800 dark:text-zinc-500">
              &copy; 2026 ShiningSun Preschool &amp; Academy
            </p>
          </div>
        </div>

        {/* Panel brand: satu-satunya color block di halaman (desktop) */}
        <div className="relative hidden flex-col overflow-hidden bg-brand-950 p-10 text-white lg:flex xl:p-14">
          {/* Satu aksen radial statis (motif matahari brand).
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
              <div className="leading-tight">
                <span className="block text-xl font-bold tracking-tight">
                  ShiningSun
                </span>
                <span className="block text-[11px] font-semibold tracking-[0.14em] text-brand-300 uppercase">
                  Preschool &amp; Academy
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-10 max-w-xl pb-10 xl:mt-14">
            <h2 className="text-4xl leading-[1.1] font-bold tracking-tight xl:text-5xl">
              Pantau Perkembangan
              <br />
              dan Jadwal Kelas Anak
            </h2>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed font-light text-slate-300/90">
              Akses jadwal mendatang, riwayat sesi kelas, dan unduh laporan
              perkembangan evaluasi anak Anda secara real-time.
            </p>

            {/* Tiga kapabilitas sebagai grup hairline, bukan kartu kaca */}
            <div className="mt-8 divide-y divide-white/10 border-t border-white/10">
              <div className="flex items-center gap-3 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icons.calendar className="h-4 w-4 text-brand-200" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Jadwal kelas</p>
                  <p className="truncate text-xs text-slate-300/70">
                    Sesi mendatang dan riwayat kehadiran
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icons.fileText className="h-4 w-4 text-brand-200" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Laporan perkembangan</p>
                  <p className="truncate text-xs text-slate-300/70">
                    Modul dan catatan guru via Drive
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icons.shield className="h-4 w-4 text-brand-200" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">PIN instan</p>
                  <p className="truncate text-xs text-slate-300/70">
                    Tanpa ribet daftar akun baru
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
