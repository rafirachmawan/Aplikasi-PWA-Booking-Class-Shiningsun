"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { changeUserPassword } from "@/lib/actions";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  branch_id: string | null;
  branch?: { name: string } | null;
}

export function AccountsClientWrapper({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [users] = useState<User[]>(initialUsers);
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const openModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const closeModal = () => {
    setSelectedUser(null);
    setNewPassword("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      await changeUserPassword(selectedUser.id, newPassword);
      setSuccessMsg(`Berhasil mengganti password untuk akun ${selectedUser.name}.`);
      setTimeout(() => {
        closeModal();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengganti password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          Khusus Superadmin
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Kelola Akun</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 max-w-[65ch] leading-relaxed">
          Manajemen akun cabang dan superadmin.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Nama Akun</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Peran & Cabang</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{user.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-500 dark:text-zinc-400">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center w-fit px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        user.role === 'SUPERADMIN'
                          ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                      }`}>
                        {user.role}
                      </span>
                      {user.branch && (
                        <span className="text-xs text-slate-500 dark:text-zinc-400">{user.branch.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(user)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/15 bg-brand-50/50 dark:bg-brand-500/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <Icons.settings className="w-4 h-4" />
                      Ganti Password
                    </button>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      Belum ada data akun.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ganti Password */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Ganti Password</h3>
              <button
                onClick={closeModal}
                aria-label="Tutup"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Icons.close className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Akun</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                  {selectedUser.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                  {selectedUser.email}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">Password Baru</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 text-sm font-medium focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:bg-zinc-900 dark:border-zinc-700 dark:text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">Minimal 6 karakter.</p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-2 border border-red-200 dark:border-red-800/50">
                  <Icons.close className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/50">
                  <Icons.check className="w-4 h-4 shrink-0" />
                  <p>{successMsg}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
