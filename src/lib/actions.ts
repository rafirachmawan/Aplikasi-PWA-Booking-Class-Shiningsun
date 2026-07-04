"use server";

import { supabase } from "./supabase";

// Hardcoded Branch ID untuk MVP (ShiningSun Surabaya Pusat)
const DEFAULT_BRANCH_ID = '11111111-1111-1111-1111-111111111111';

export async function getDashboardStats() {
  try {
    // 1. Hitung Siswa Aktif (Reguler)
    const { count: regulerCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', DEFAULT_BRANCH_ID)
      .eq('status', 'REGISTERED');

    // 2. Hitung Siswa Coba Gratis (CG)
    const { count: cgCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', DEFAULT_BRANCH_ID)
      .eq('status', 'CG');

    // 3. Hitung Kelas (Hanya sebagai contoh master data)
    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', DEFAULT_BRANCH_ID);

    return {
      reguler: regulerCount || 0,
      cg: cgCount || 0,
      classes: classCount || 0,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { reguler: 0, cg: 0, classes: 0 };
  }
}

export async function getClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('branch_id', DEFAULT_BRANCH_ID);
    
  if (error) {
    console.error("Error fetching classes:", error);
    return [];
  }
  return data;
}

export async function getLabels() {
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .or(`branch_id.eq.${DEFAULT_BRANCH_ID},is_system_default.eq.true`);
    
  if (error) {
    console.error("Error fetching labels:", error);
    return [];
  }
  return data;
}

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*, label:labels(main_level, sub_level, hex_color)')
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching students:", error);
    return [];
  }
  return data;
}

export async function createStudent(formData: FormData) {
  const name = formData.get('name') as string;
  const date_of_birth = formData.get('date_of_birth') as string;
  const status = formData.get('status') as string;
  const label_id = formData.get('label_id') as string;

  const { error } = await supabase
    .from('students')
    .insert({
      branch_id: DEFAULT_BRANCH_ID,
      name,
      date_of_birth,
      status,
      label_id: label_id ? label_id : null,
      registration_date: new Date().toISOString().split('T')[0],
    });

  if (error) {
    console.error("Error creating student:", error);
    throw new Error(error.message);
  }

  // Next.js will need to revalidate the path in the calling component if needed
  return true;
}

// =========================================
// SCHEDULE ACTIONS
// =========================================

export async function getMonthlySchedules(year: number, month: number) {
  // Hitung tanggal awal dan akhir bulan
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Hari terakhir bulan tersebut

  const { data, error } = await supabase
    .from('schedule_slots')
    .select(`
      *,
      class:classes(name, max_quota),
      bookings:schedule_student(count)
    `)
    .eq('branch_id', DEFAULT_BRANCH_ID)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }
  return data;
}

export async function createScheduleSlot(formData: FormData) {
  const class_id = formData.get('class_id') as string;
  const dateStr = formData.get('date') as string; // YYYY-MM-DD
  const time = formData.get('time') as string;    // HH:MM
  const isRecurring = formData.get('is_recurring') === 'true'; // Repeat 1 month

  const datesToInsert = [dateStr];

  if (isRecurring) {
    // Cari sisa hari yang sama di bulan yang sama
    const baseDate = new Date(dateStr);
    const month = baseDate.getMonth();
    const year = baseDate.getFullYear();
    const dayOfWeek = baseDate.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Mulai dari 1 minggu ke depan
    for (let i = 1; i <= 4; i++) {
      const nextDate = new Date(year, month, baseDate.getDate() + (i * 7));
      // Jika masih di bulan yang sama, masukkan ke array
      if (nextDate.getMonth() === month) {
        datesToInsert.push(nextDate.toISOString().split('T')[0]);
      } else {
        break;
      }
    }
  }

  const payload = datesToInsert.map((d) => ({
    branch_id: DEFAULT_BRANCH_ID,
    class_id,
    date: d,
    time,
    is_locked: false,
  }));

  const { error } = await supabase
    .from('schedule_slots')
    .insert(payload);

  if (error) {
    console.error("Error creating schedule:", error);
    throw new Error(error.message);
  }

  return true;
}

// =========================================
// MASTER DATA ACTIONS
// =========================================

export async function createClass(formData: FormData) {
  const name = formData.get('name') as string;
  const max_quota = parseInt(formData.get('max_quota') as string, 10) || 4;

  const { error } = await supabase
    .from('classes')
    .insert({
      branch_id: DEFAULT_BRANCH_ID,
      name,
      max_quota,
    });

  if (error) {
    console.error("Error creating class:", error);
    throw new Error(error.message);
  }
  return true;
}

export async function createLabel(formData: FormData) {
  const main_level = formData.get('main_level') as string;
  const sub_level = formData.get('sub_level') as string;
  const hex_color = formData.get('hex_color') as string;

  const { error } = await supabase
    .from('labels')
    .insert({
      branch_id: DEFAULT_BRANCH_ID,
      is_system_default: false,
      main_level,
      sub_level,
      hex_color,
    });

  if (error) {
    console.error("Error creating label:", error);
    throw new Error(error.message);
  }
  return true;
}
