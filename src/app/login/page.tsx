import Image from "next/image";
import { LoginForm } from "@/components/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-slate-900 overflow-hidden font-sans">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden bg-[#0A0F1C]">
        
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute -top-1/4 -left-1/4 w-[80%] h-[80%] rounded-full bg-brand-600/30 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-1/4 -right-1/4 w-[70%] h-[70%] rounded-full bg-blue-500/20 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute -bottom-1/4 left-1/4 w-[90%] h-[90%] rounded-full bg-indigo-500/20 blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        </div>
        
        {/* Abstract Grid Overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        {/* Top - Logo & Brand */}
        <div className="relative z-10 animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
              <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" priority />
            </div>
            <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
              ShiningSun
            </span>
          </div>
        </div>

        {/* Center - Tagline */}
        <div className="relative z-10 space-y-6 animate-in fade-in slide-in-from-left-8 duration-1000 delay-300">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            Platform Manajemen Modern
          </div>
          <h1 className="text-6xl font-bold text-white leading-[1.1] tracking-tight">
            Sistem Penjadwalan <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-400">
              Cerdas & Elegan
            </span>
          </h1>
          <p className="text-slate-300/80 text-xl max-w-lg leading-relaxed font-light">
            Solusi komprehensif untuk mengelola jadwal kelas, data siswa, dan booking sesi cabang secara real-time.
          </p>
        </div>

        {/* Bottom - Footer / Testimonial Style */}
        <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`w-10 h-10 rounded-full bg-slate-800 border-2 border-[#0A0F1C] flex items-center justify-center text-xs text-white/50 shadow-sm z-[${4-i}]`}>
                  {i}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full bg-brand-600 border-2 border-[#0A0F1C] flex items-center justify-center text-xs font-bold text-white shadow-sm z-0">
                +99
              </div>
            </div>
            <p className="text-sm text-slate-400 font-medium">Dipercaya oleh seluruh admin cabang</p>
          </div>
          <p className="text-white/40 text-sm font-medium">&copy; 2026 ShiningSun. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Login Form Container */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 bg-white dark:bg-[#0B1120] relative z-10 lg:rounded-l-[40px] shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.3)]">
        
        {/* Mobile Header Decoration */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-[40vh] bg-[#0A0F1C] rounded-b-[40px] -z-10 overflow-hidden shadow-lg">
          {/* Animated Mesh for Mobile */}
          <div className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] rounded-full bg-brand-600/40 blur-[70px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-1/4 -right-1/4 w-[120%] h-[120%] rounded-full bg-blue-500/30 blur-[60px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        </div>

        <div className="mx-auto w-full max-w-[400px] relative z-10 mt-10 lg:mt-0">
          
          {/* Mobile Logo & Welcome (hidden on desktop) */}
          <div className="flex flex-col items-center mb-8 lg:hidden text-center -mt-20">
            <div className="h-16 w-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 mb-4">
              <Image src="/logo.png" alt="ShiningSun Logo" width={40} height={40} className="object-contain" priority />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-md">ShiningSun</h2>
            <p className="mt-2 text-brand-100/90 text-sm font-medium max-w-[280px]">Sistem Penjadwalan Cerdas & Elegan</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Selamat Datang</h2>
            <p className="mt-2 text-base text-slate-500 dark:text-slate-400">Silakan masuk ke akun manajemen Anda</p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-8 lg:slide-in-from-right-8 duration-700 delay-300">
            <LoginForm />
          </div>

          {/* Fallback for devices where JavaScript/React doesn't work */}
          <noscript>
            <div style={{ textAlign: 'center', marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
              <p style={{ fontSize: '13px', color: '#92400e', fontWeight: 600, margin: '0 0 8px 0' }}>
                JavaScript tidak aktif di browser ini.
              </p>
              <a href="/login-basic" style={{ fontSize: '14px', color: '#d97706', fontWeight: 700, textDecoration: 'underline' }}>
                Klik di sini untuk Login Kompatibel
              </a>
            </div>
          </noscript>
          
          <div className="text-center mt-3">
            <a href="/login-basic" className="text-[11px] text-slate-400 hover:text-slate-500 underline transition-colors">
              Tidak bisa login? Coba halaman Login Kompatibel
            </a>
          </div>
          
        </div>
      </div>
    </div>
  );
}
