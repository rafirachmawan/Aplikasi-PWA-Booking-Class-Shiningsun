"use server";

import { supabase } from "./supabase";
import { createClient } from '@/lib/supabase/server';

export async function getBranchId() {
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  if (!user) {
    // Jika tidak ada user (saat build atau belum login), gunakan branch default
    return '11111111-1111-1111-1111-111111111111';
  }

  // Coba ambil profile
  const { data: profile } = await supabaseServer
    .from('users')
    .select('branch_id')
    .eq('id', user.id)
    .single();

  return profile?.branch_id || '11111111-1111-1111-1111-111111111111';
}

export async function getDashboardStats() {
  try {
    // 1. Hitung Siswa Aktif (Reguler)
    const { count: regulerCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', await getBranchId())
      .eq('status', 'REGISTERED');

    // 2. Hitung Siswa Coba Gratis (CG)
    const { count: cgCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', await getBranchId())
      .eq('status', 'CG');

    // 3. Hitung Kelas (Hanya sebagai contoh master data)
    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', await getBranchId());

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
    .eq('branch_id', await getBranchId());
    
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
    .or(`branch_id.eq.${await getBranchId()},is_system_default.eq.true`);
    
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
    .eq('branch_id', await getBranchId())
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
      branch_id: await getBranchId(),
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
      bookings:schedule_student(
        student_id,
        student:students(name, status)
      )
    `)
    .eq('branch_id', await getBranchId())
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

  const branchId = await getBranchId();
  const payload = datesToInsert.map((d) => ({
    branch_id: branchId,
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

export async function bookStudentToSlot(studentId: string, scheduleSlotId: string) {
  // Pessimistic Quota Check
  // 1. Dapatkan slot saat ini beserta kuota maksimal kelas
  const { data: slotData, error: slotError } = await supabase
    .from('schedule_slots')
    .select('is_locked, class:classes(max_quota)')
    .eq('id', scheduleSlotId)
    .single();

  if (slotError || !slotData) {
    throw new Error("Gagal mengambil data jadwal.");
  }

  if (slotData.is_locked) {
    throw new Error("Jadwal ini sudah dikunci (Locked). Tidak bisa menambah siswa.");
  }

  const maxQuota = slotData.class?.max_quota || 4;

  // 2. Hitung jumlah siswa yang sudah booking
  const { count, error: countError } = await supabase
    .from('schedule_student')
    .select('*', { count: 'exact', head: true })
    .eq('schedule_slot_id', scheduleSlotId);

  if (countError) {
    throw new Error("Gagal mengecek kuota.");
  }

  if (count !== null && count >= maxQuota) {
    throw new Error(`Kelas penuh! Maksimal kuota adalah ${maxQuota} siswa.`);
  }

  // 3. Insert jika masih aman
  const { error: insertError } = await supabase
    .from('schedule_student')
    .insert({
      schedule_slot_id: scheduleSlotId,
      student_id: studentId,
    });

  if (insertError) {
    // Tangani kemungkinan duplikasi (unique constraint di DB)
    if (insertError.code === '23505') {
       throw new Error("Siswa ini sudah terdaftar di sesi jadwal ini.");
    }
    throw new Error(insertError.message);
  }

  return true;
}

export async function toggleSlotLock(scheduleSlotId: string, currentStatus: boolean) {
  const { error } = await supabase
    .from('schedule_slots')
    .update({ is_locked: !currentStatus })
    .eq('id', scheduleSlotId);

  if (error) {
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
      branch_id: await getBranchId(),
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
      branch_id: await getBranchId(),
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

// =========================================
// DELETE & UPDATE ACTIONS (FULL CRUD)
// =========================================

export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

export async function updateStudent(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const date_of_birth = formData.get('date_of_birth') as string;
  const status = formData.get('status') as string;
  const label_id = formData.get('label_id') as string;

  const { error } = await supabase
    .from('students')
    .update({
      name,
      date_of_birth,
      status,
      label_id: label_id ? label_id : null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

export async function cancelBooking(scheduleSlotId: string, studentId: string) {
  const { error } = await supabase
    .from('schedule_student')
    .delete()
    .match({ schedule_slot_id: scheduleSlotId, student_id: studentId });

  if (error) throw new Error(error.message);
  return true;
}

export async function deleteClass(id: string) {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id);

  if (error) throw new Error("Gagal menghapus kelas. Pastikan tidak ada jadwal yang menggunakan kelas ini.");
  return true;
}

export async function deleteLabel(id: string) {
  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', id)
    .eq('is_system_default', false); // Pengamanan ekstra agar label default tidak dihapus

  if (error) throw new Error("Gagal menghapus label. Pastikan tidak ada siswa yang menggunakan label ini.");
  return true;
}
