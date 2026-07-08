"use server";

import { supabase } from "./supabase";
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function syncUserIdentity() {
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user || !user.email) return;

  // Cek apakah user id ini sudah terdaftar di public.users
  const { data: existingUser } = await supabaseServer
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingUser) {
    // Hapus data lama yang mungkin memiliki email sama tapi ID salah (akibat salah SQL/buat ulang auth)
    await supabaseServer.from('users').delete().eq('email', user.email);

    let role = 'BRANCH_ADMIN';
    let branchId = null;

    if (user.email.includes('superadmin') || user.email.includes('pusat')) {
      role = 'SUPERADMIN';
    } else {
      // Deteksi cabang dari nama email (misal: ngunut@... -> Ngunut)
      const prefix = user.email.split('@')[0];
      const { data: branches } = await supabaseServer
        .from('branches')
        .select('id, name');
        
      if (branches) {
        const matched = branches.find(b => b.name.toLowerCase().includes(prefix.toLowerCase()));
        if (matched) branchId = matched.id;
      }
    }

    // Insert otomatis identitas baru yang nyambung dengan ID Auth asli
    const { error: insertError } = await supabaseServer.from('users').insert({
      id: user.id,
      email: user.email,
      name: role === 'SUPERADMIN' ? 'Superadmin Utama' : `Admin ${user.email.split('@')[0]}`,
      role: role,
      branch_id: branchId,
      password: 'auth_managed'
    });
    
    if (insertError) {
      console.error("Auto-sync failed:", insertError.message);
    }
  }
}

export async function getCurrentUserRole() {
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabaseServer
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
    
  return profile?.role || null;
}

export async function setSuperadminBranch(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set('superadmin_branch_id', branchId, { path: '/' });
}

export async function clearSuperadminBranch() {
  const cookieStore = await cookies();
  cookieStore.delete('superadmin_branch_id');
}

export async function getBranchId() {
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  if (!user) {
    return '11111111-1111-1111-1111-111111111111';
  }

  const { data: profile } = await supabaseServer
    .from('users')
    .select('branch_id, role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'SUPERADMIN') {
    const cookieStore = await cookies();
    const selectedBranch = cookieStore.get('superadmin_branch_id')?.value;
    if (selectedBranch) {
      return selectedBranch;
    }
    return ''; // Default kosong agar superadmin harus pilih cabang dulu
  }

  return profile?.branch_id || 'ALL'; // Fallback aman jika branch_id kosong
}

export async function getActiveBranchName() {
  const branchId = await getBranchId();
  if (!branchId || branchId === 'ALL') return null;
  
  const supabaseServer = await createClient();
  const { data } = await supabaseServer
    .from('branches')
    .select('name')
    .eq('id', branchId)
    .single();
    
  return data?.name || null;
}

export async function getBranches() {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('name');
    
  if (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
  return data;
}

export async function getDashboardStats() {
  try {
    const branchId = await getBranchId();
    
    // Jika belum pilih cabang, return 0
    if (!branchId) return { reguler: 0, cg: 0, classes: 0 };
    
    // 1. Hitung Siswa Aktif (Reguler)
    let regulerQuery = supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'REGISTERED');
    if (branchId !== 'ALL') regulerQuery = regulerQuery.eq('branch_id', branchId);
    const { count: regulerCount } = await regulerQuery;

    // 2. Hitung Siswa Coba Gratis (CG)
    let cgQuery = supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'CG');
    if (branchId !== 'ALL') cgQuery = cgQuery.eq('branch_id', branchId);
    const { count: cgCount } = await cgQuery;

    // 3. Hitung Kelas
    let classQuery = supabase
      .from('classes')
      .select('*', { count: 'exact', head: true });
    if (branchId !== 'ALL') classQuery = classQuery.eq('branch_id', branchId);
    const { count: classCount } = await classQuery;

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
  const branchId = await getBranchId();
  if (!branchId) return [];
  
  let query = supabase.from('classes').select('*, branch:branches(name)');
  
  if (branchId !== 'ALL') {
    query = query.eq('branch_id', branchId);
  }
  
  const { data, error } = await query;
    
  if (error) {
    console.error("Error fetching classes:", error);
    return [];
  }
  return data;
}

export async function getLabels() {
  const branchId = await getBranchId();
  if (!branchId) return [];
  
  let query = supabase.from('labels').select('*, branch:branches(name)');
  
  if (branchId !== 'ALL') {
    query = query.or(`branch_id.eq.${branchId},is_system_default.eq.true`);
  }
  
  const { data, error } = await query;
    
  if (error) {
    console.error("Error fetching labels:", error);
    return [];
  }
  return data;
}

export async function getStudents() {
  const branchId = await getBranchId();
  if (!branchId) return [];
  
  let query = supabase
    .from('students')
    .select('*, label:labels(main_level, sub_level, hex_color)')
    .order('created_at', { ascending: false });
    
  if (branchId !== 'ALL') {
    query = query.eq('branch_id', branchId);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error("Error fetching students:", error);
    return [];
  }
  return data;
}

export async function createStudent(formData: FormData) {
  const name = formData.get('name') as string;
  const nickname = formData.get('nickname') as string;
  const date_of_birth = formData.get('date_of_birth') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;
  const school = formData.get('school') as string;
  const status = formData.get('status') as string;
  const label_id = formData.get('label_id') as string;
  const registration_date = formData.get('registration_date') as string || new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('students')
    .insert({
      branch_id: await getBranchId(),
      name,
      nickname,
      date_of_birth,
      phone,
      address,
      school,
      status,
      label_id: label_id ? label_id : null,
      registration_date,
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

export async function autoBookStudentToClass(
  studentId: string, 
  classId: string, 
  startDateStr: string,
  time: string
) {
  const branchId = await getBranchId();
  
  // 1. Hitung range 1 bulan dari startDate
  const startDate = new Date(startDateStr);
  const endDate = new Date(startDateStr);
  endDate.setMonth(endDate.getMonth() + 1); // Tambah 1 bulan
  
  const dayOfWeek = startDate.getDay();
  const datesToBook: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    if (currentDate.getDay() === dayOfWeek) {
      // YYYY-MM-DD
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      datesToBook.push(dateStr);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (datesToBook.length === 0) throw new Error("Tidak ada hari tersebut dalam rentang 1 bulan dari tanggal mulai.");

  let bookedCount = 0;

  // 2. Loop setiap tanggal, cari slot, jika tidak ada buat baru
  for (const dateStr of datesToBook) {
    // Cari slot
    let { data: slots, error: fetchError } = await supabase
      .from('schedule_slots')
      .select('id, class_id, max_quota:classes!inner(max_quota), bookings:schedule_student(student_id)')
      .eq('date', dateStr)
      .eq('time', time)
      .eq('class_id', classId);

    if (fetchError) throw new Error("Gagal mengambil jadwal: " + fetchError.message);

    let slotId = slots && slots.length > 0 ? slots[0].id : null;
    let isFull = false;
    let alreadyBooked = false;

    if (!slotId) {
      // Buat slot baru
      const { data: newSlot, error: insertError } = await supabase
        .from('schedule_slots')
        .insert({
          branch_id: branchId,
          class_id: classId,
          date: dateStr,
          time: time,
          is_locked: false
        })
        .select()
        .single();
      
      if (insertError) throw new Error("Gagal membuat sesi jadwal baru: " + insertError.message);
      slotId = newSlot.id;
    } else {
      // Cek kuota
      const slot = slots![0];
      const maxQ = (slot.max_quota as any).max_quota || 4;
      if (slot.bookings && slot.bookings.length >= maxQ) {
        isFull = true;
      }
      if (slot.bookings?.some((b: any) => b.student_id === studentId)) {
        alreadyBooked = true;
      }
    }

    if (!isFull && !alreadyBooked) {
      // Booking
      const { error: bookErr } = await supabase
        .from('schedule_student')
        .insert({ student_id: studentId, schedule_slot_id: slotId });
      
      if (!bookErr) bookedCount++;
    }
  }
  
  return bookedCount;
}

export async function bookStudentManual(
  studentId: string, 
  classId: string, 
  dateStr: string, 
  time: string
) {
  const branchId = await getBranchId();
  
  // Cari slot
  let { data: slots, error: fetchError } = await supabase
    .from('schedule_slots')
    .select('id, class_id, max_quota:classes!inner(max_quota), bookings:schedule_student(student_id)')
    .eq('date', dateStr)
    .eq('time', time)
    .eq('class_id', classId);

  if (fetchError) throw new Error("Gagal mengambil jadwal: " + fetchError.message);

  let slotId = slots && slots.length > 0 ? slots[0].id : null;

  if (!slotId) {
    // Buat slot baru
    const { data: newSlot, error: insertError } = await supabase
      .from('schedule_slots')
      .insert({
        branch_id: branchId,
        class_id: classId,
        date: dateStr,
        time: time,
        is_locked: false
      })
      .select()
      .single();
    
    if (insertError) throw new Error("Gagal membuat sesi jadwal baru: " + insertError.message);
    slotId = newSlot.id;
  } else {
    // Cek kuota
    const slot = slots![0];
    const maxQ = (slot.max_quota as any).max_quota || 4;
    if (slot.bookings && slot.bookings.length >= maxQ) {
      throw new Error("Sesi pada tanggal dan jam tersebut sudah penuh.");
    }
    if (slot.bookings?.some((b: any) => b.student_id === studentId)) {
      throw new Error("Siswa sudah terdaftar di sesi tersebut.");
    }
  }

  // Booking
  const { error: bookErr } = await supabase
    .from('schedule_student')
    .insert({ student_id: studentId, schedule_slot_id: slotId });
  
  if (bookErr) throw new Error("Gagal mem-booking siswa: " + bookErr.message);
  return true;
}

export async function getMonthlySchedules(year: number, month: number) {
  const branchId = await getBranchId();
  if (!branchId) return [];
  
  // Hitung tanggal awal dan akhir bulan
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Hari terakhir bulan tersebut

  let query = supabase
    .from('schedule_slots')
    .select(`
      *,
      class:classes(name, max_quota),
      bookings:schedule_student(
        student_id,
        student:students(name, status, label:labels(hex_color))
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (branchId !== 'ALL') {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

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

  const maxQuota = (slotData.class as any)?.max_quota || 4;

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
  const branchId = await getBranchId();

  if (branchId === 'ALL') {
    throw new Error("Tidak dapat membuat kelas di mode 'Semua Cabang'. Silakan pilih cabang spesifik terlebih dahulu.");
  }

  const { error } = await supabase
    .from('classes')
    .insert({
      branch_id: branchId,
      name,
      // @ts-ignore: max_quota doesn't exist in generated types yet but is in the DB schema
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
  const nickname = formData.get('nickname') as string;
  const date_of_birth = formData.get('date_of_birth') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;
  const school = formData.get('school') as string;
  const status = formData.get('status') as string;
  const label_id = formData.get('label_id') as string;
  const registration_date = formData.get('registration_date') as string;

  const updatePayload: any = {
    name,
    nickname,
    date_of_birth,
    phone,
    address,
    school,
    status,
    label_id: label_id ? label_id : null,
  };
  
  if (registration_date) {
    updatePayload.registration_date = registration_date;
  }

  const { error } = await supabase
    .from('students')
    .update(updatePayload)
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

export async function getTodaySchedules() {
  const branchId = await getBranchId();
  
  // Jika belum pilih cabang, return kosong
  if (!branchId) return [];
  
  const today = new Date().toLocaleDateString('sv-SE');

  let query = supabase
    .from('schedule_slots')
    .select(`
      *,
      class:classes(name, max_quota),
      bookings:schedule_student(
        student_id,
        student:students(name, status, label:labels(hex_color))
      )
    `)
    .eq('date', today)
    .order('time', { ascending: true });

  if (branchId !== 'ALL') {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching today schedules:", error);
    return [];
  }
  return data || [];
}
