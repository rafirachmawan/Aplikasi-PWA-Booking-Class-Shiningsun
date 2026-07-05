"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setSuperadminBranch } from "@/lib/actions";

interface Branch {
  id: string;
  name: string;
}

export function BranchSelector({ branches, currentBranchId }: { branches: Branch[], currentBranchId: string }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedId, setSelectedId] = useState(currentBranchId);

  // Sync state if props change (misalnya karena routing ulang)
  useEffect(() => {
    setSelectedId(currentBranchId);
  }, [currentBranchId]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranchId = e.target.value;
    setSelectedId(newBranchId);
    setIsUpdating(true);
    
    // Set cookie
    await setSuperadminBranch(newBranchId);
    
    // Refresh page fully to update all server components
    router.refresh();
    setTimeout(() => {
       setIsUpdating(false);
    }, 1000);
  };

  return (
    <div className="flex items-center gap-2">
      {isUpdating && (
        <svg className="animate-spin h-4 w-4 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <select
        value={selectedId}
        onChange={handleChange}
        disabled={isUpdating}
        className="block w-48 lg:w-64 rounded-lg border-0 py-1.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700 font-semibold truncate bg-slate-100 hover:bg-slate-200 transition-colors"
      >
        <option value="ALL">🌟 Semua Cabang</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
