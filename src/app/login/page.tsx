import Image from "next/image";
import { LoginForm } from "@/components/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50 dark:bg-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-16 w-16 flex items-center justify-center">
           <Image 
              src="/logo.png" 
              alt="ShiningSun Logo" 
              width={64} 
              height={64} 
              className="object-contain"
              priority
           />
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
