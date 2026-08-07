"use server";

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function login(email: string, password: string, rememberMe: boolean = true) {
  const cookieStore = await cookies();
  // Store remember_me preference with 1-year persistence
  cookieStore.set('remember_me', rememberMe ? 'true' : 'false', {
    path: '/',
    maxAge: rememberMe ? 60 * 60 * 24 * 365 : undefined,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Clear any stale branch selection so superadmin starts fresh
  cookieStore.delete('superadmin_branch_id');

  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  
  // Clear branch selection and remember_me cookies
  const cookieStore = await cookies();
  cookieStore.delete('superadmin_branch_id');
  cookieStore.delete('remember_me');
  
  await supabase.auth.signOut();
  return { success: true };
}
