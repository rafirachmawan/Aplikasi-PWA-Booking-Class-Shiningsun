"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setSuperadminBranch } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
    if (newBranchId === "") return; // Abaikan jika pilih placeholder kosong

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
    <div className="flex items-center gap-2 w-full">
      {isUpdating && <LoadingSpinner usePortal={true} />}
      <select
        value={selectedId}
        onChange={handleChange}
        disabled={isUpdating}
        className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700/50 font-semibold truncate bg-white dark:hover:bg-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <option value="" disabled>-- Pilih Cabang --</option>
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
