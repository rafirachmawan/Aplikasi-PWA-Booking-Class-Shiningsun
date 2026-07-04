export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background text-foreground">
      <main className="flex flex-col items-center gap-6 p-8 text-center max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-brand-600 dark:text-brand-100">
          ShiningSun Booking Class
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Sistem Manajemen Penjadwalan dan Pendaftaran Siswa (Multi-Branch)
        </p>
        <div className="mt-8 flex gap-4">
          <button className="px-6 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 transition-colors">
            Login Admin
          </button>
        </div>
      </main>
    </div>
  );
}
