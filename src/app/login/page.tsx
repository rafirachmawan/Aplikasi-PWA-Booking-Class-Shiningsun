import { LoginForm } from "@/components/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50 dark:bg-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-12 w-12 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
           <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900 dark:text-white">
          Portal ShiningSun
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Masuk ke sistem manajemen cabang Anda
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow sm:rounded-2xl sm:px-12 dark:bg-slate-800 ring-1 ring-slate-900/5 dark:ring-slate-700/50">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
