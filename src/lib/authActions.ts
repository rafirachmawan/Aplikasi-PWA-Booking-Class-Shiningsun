"use server";

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function login(email: string, password: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Clear any stale branch selection so superadmin starts fresh
  const cookieStore = await cookies();
  cookieStore.delete('superadmin_branch_id');

  // Redirect to dashboard on success
  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  
  // Clear branch selection cookie
  const cookieStore = await cookies();
  cookieStore.delete('superadmin_branch_id');
  
  await supabase.auth.signOut();
  redirect('/login');
}
