import Image from "next/image";

export function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm transition-all duration-300">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Lingkaran Spinner */}
        <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-brand-600 dark:border-t-brand-500 animate-spin"></div>
        
        {/* Logo di Tengah */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image 
            src="/logo.png" 
            alt="Loading..." 
            width={48} 
            height={48} 
            className="w-12 h-12 object-contain animate-pulse" 
            priority
          />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
        Memproses...
      </p>
    </div>
  );
}
