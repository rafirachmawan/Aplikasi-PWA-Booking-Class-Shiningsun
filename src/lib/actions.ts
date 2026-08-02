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
  // Labels are global — shared across all branches
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .order('main_level')
    .order('sub_level');
    
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
  
  // 1. Hitung range sampai akhir bulan dari startDate
  const startDate = new Date(startDateStr);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Hari terakhir bulan tersebut
  
  const dayOfWeek = startDate.getDay();
  const datesToBook: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (currentDate.getDay() === dayOfWeek) {
      // YYYY-MM-DD
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      datesToBook.push(dateStr);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (datesToBook.length === 0) throw new Error("Tidak ada hari tersebut dalam rentang 1 bulan dari tanggal mulai.");

  let bookedCount = 0;
  const failedDates: string[] = [];

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
      else failedDates.push(dateStr);
    } else {
      failedDates.push(dateStr);
    }
  }
  
  return { bookedCount, failedDates };
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

export async function removeStudentBooking(scheduleSlotId: string, studentId: string) {
  const { error } = await supabase
    .from('schedule_student')
    .delete()
    .eq('schedule_slot_id', scheduleSlotId)
    .eq('student_id', studentId);

  if (error) throw new Error("Gagal menghapus jadwal: " + error.message);
  return true;
}

export async function bulkRemoveStudentBookings(studentId: string, scheduleSlotIds: string[]) {
  if (scheduleSlotIds.length === 0) return true;
  const { error } = await supabase
    .from('schedule_student')
    .delete()
    .eq('student_id', studentId)
    .in('schedule_slot_id', scheduleSlotIds);

  if (error) throw new Error("Gagal menghapus jadwal massal: " + error.message);
  return true;
}

export async function copyScheduleToNextMonth(studentId: string, currentYear: number, currentMonth: number) {
  const schedules = await getMonthlySchedules(currentYear, currentMonth);
  const studentSchedules = schedules.filter(s => s.bookings?.some((b: any) => b.student_id === studentId));
  
  if (studentSchedules.length === 0) return { totalBooked: 0, failedDates: [] };
  
  const patterns = new Set<string>();
  const uniquePatterns: any[] = [];
  
  studentSchedules.forEach(slot => {
    const d = new Date(slot.date);
    const dayOfWeek = d.getDay();
    const key = `${dayOfWeek}-${slot.time}-${slot.class_id}`;
    if (!patterns.has(key)) {
      patterns.add(key);
      uniquePatterns.push({ dayOfWeek, time: slot.time, classId: slot.class_id });
    }
  });

  let nextYear = currentYear;
  let nextMonth = currentMonth + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  let totalBooked = 0;
  const failedDates: string[] = [];

  for (const pattern of uniquePatterns) {
    let firstDate = new Date(nextYear, nextMonth - 1, 1);
    while (firstDate.getDay() !== pattern.dayOfWeek) {
      firstDate.setDate(firstDate.getDate() + 1);
    }
    
    const y = firstDate.getFullYear();
    const m = String(firstDate.getMonth() + 1).padStart(2, '0');
    const d = String(firstDate.getDate()).padStart(2, '0');
    const startDateStr = `${y}-${m}-${d}`;
    
    const res = await autoBookStudentToClass(studentId, pattern.classId, startDateStr, pattern.time);
    totalBooked += res.bookedCount;
    if (res.failedDates.length > 0) {
      failedDates.push(...res.failedDates);
    }
  }
  
  return { totalBooked, failedDates };
}

export async function moveStudentBooking(
  studentId: string, 
  oldSlotId: string, 
  newClassId: string, 
  newDateStr: string, 
  newTime: string
) {
  await removeStudentBooking(oldSlotId, studentId);
  try {
    await bookStudentManual(studentId, newClassId, newDateStr, newTime);
  } catch (err: any) {
    // If it fails to book the new one, we should ideally rollback, but simple approach is to throw error
    throw new Error(err.message);
  }
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
        student:students(name, nickname, status, label:labels(hex_color))
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

  // Labels are global — no branch_id needed
  const { error } = await supabase
    .from('labels')
    .insert({
      branch_id: null,
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

export async function updateStudentStatus(id: string, status: string) {
  const { error } = await supabase
    .from('students')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

export async function updateStudentLabel(id: string, labelId: string | null) {
  const { error } = await supabase
    .from('students')
    .update({ label_id: labelId || null })
    .eq('id', id);

  if (error) throw new Error("Gagal meng-update level siswa: " + error.message);
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
  const supabaseServer = await createClient();

  // 1. Dapatkan semua jadwal yang terkait dengan kelas ini
  const { data: slots } = await supabaseServer
    .from('schedule_slots')
    .select('id')
    .eq('class_id', id);

  if (slots && slots.length > 0) {
    const slotIds = slots.map((s) => s.id);
    
    // 2. Hapus semua data booking siswa di jadwal tersebut
    await supabaseServer
      .from('schedule_student')
      .delete()
      .in('schedule_slot_id', slotIds);
      
    // 3. Hapus jadwal (slots) itu sendiri
    await supabaseServer
      .from('schedule_slots')
      .delete()
      .eq('class_id', id);
  }

  // 4. Hapus kelas
  const { error } = await supabaseServer
    .from('classes')
    .delete()
    .eq('id', id);

  if (error) throw new Error("Gagal menghapus kelas. " + error.message);
  return true;
}

export async function deleteLabel(id: string) {
  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', id);

  if (error) throw new Error("Gagal menghapus label. Pastikan tidak ada siswa yang menggunakan label ini.");
  return true;
}

export async function getSchedulesByDate(dateStr: string) {
  const branchId = await getBranchId();
  
  // Jika belum pilih cabang, return kosong
  if (!branchId) return [];

  let query = supabase
    .from('schedule_slots')
    .select(`
      *,
      class:classes(name, max_quota),
      bookings:schedule_student(
        student_id,
        student:students(name, nickname, status, label:labels(hex_color))
      )
    `)
    .eq('date', dateStr)
    .order('time', { ascending: true });

  if (branchId !== 'ALL') {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching schedules by date:", error);
    return [];
  }
  return data || [];
}

export async function getTodaySchedules() {
  const today = new Date().toLocaleDateString('sv-SE');
  return getSchedulesByDate(today);
}

export async function getStudentsByStatusWithSchedules(status: 'REGISTERED' | 'CG') {
  const branchId = await getBranchId();
  if (!branchId) return [];

  // 1. Fetch students by status
  let studentQuery = supabase
    .from('students')
    .select('id, name, nickname, status, label:labels(main_level, sub_level, hex_color)')
    .eq('status', status)
    .order('name', { ascending: true });
  if (branchId !== 'ALL') studentQuery = studentQuery.eq('branch_id', branchId);
  const { data: students, error: sErr } = await studentQuery;
  if (sErr || !students) return [];

  // 2. Get current month date range
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // 3. Fetch schedule bookings for these students in current month
  const studentIds = students.map(s => s.id);
  if (studentIds.length === 0) return [];

  let schedQuery = supabase
    .from('schedule_student')
    .select(`
      student_id,
      slot:schedule_slots!inner(
        date, time,
        class:classes(name)
      )
    `)
    .in('student_id', studentIds)
    .gte('slot.date', startDate)
    .lte('slot.date', endDate);

  const { data: bookings } = await schedQuery;

  // 4. Group bookings by student_id
  const bookingMap: Record<string, any[]> = {};
  if (bookings) {
    for (const b of bookings) {
      if (!b.slot) continue;
      if (!bookingMap[b.student_id]) bookingMap[b.student_id] = [];
      bookingMap[b.student_id].push(b.slot);
    }
  }

  // 5. Merge and sort by Label (main_level, sub_level), then Name
  const getLabelStr = (s: any) => {
    const lbl = Array.isArray(s.label) ? s.label[0] : s.label;
    if (!lbl) return 'ZZZ';
    return `${lbl.main_level || ''} ${lbl.sub_level || ''}`.trim();
  };

  return students
    .map(s => ({
      ...s,
      label: Array.isArray(s.label) ? s.label[0] : s.label,
      schedules: (bookingMap[s.id] || []).sort((a: any, b: any) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      }),
    }))
    .sort((a, b) => {
      const labelA = getLabelStr(a);
      const labelB = getLabelStr(b);
      
      if (labelA !== labelB) {
        return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
      }
      
      const nameA = a.nickname || a.name || '';
      const nameB = b.nickname || b.name || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

export async function getClassesWithSchedules() {
  const branchId = await getBranchId();
  if (!branchId) return [];

  // 1. Fetch classes
  let classQuery = supabase.from('classes').select('*, branch:branches(name)').order('name', { ascending: true });
  if (branchId !== 'ALL') classQuery = classQuery.eq('branch_id', branchId);
  const { data: classes, error: cErr } = await classQuery;
  if (cErr || !classes) return [];

  // 2. Get current month date range
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const classIds = classes.map(c => c.id);
  if (classIds.length === 0) return [];

  // 3. Fetch schedule slots with student bookings
  let slotQuery = supabase
    .from('schedule_slots')
    .select(`
      id, class_id, date, time, is_locked,
      bookings:schedule_student(
        student_id,
        student:students(name, nickname, status, label:labels(hex_color))
      )
    `)
    .in('class_id', classIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  const { data: slots } = await slotQuery;

  // 4. Group slots by class_id
  const slotMap: Record<string, any[]> = {};
  if (slots) {
    for (const s of slots) {
      if (!slotMap[s.class_id]) slotMap[s.class_id] = [];
      slotMap[s.class_id].push(s);
    }
  }

  // 5. Merge
  return classes.map(c => ({
    ...c,
    schedules: slotMap[c.id] || [],
  }));
}

export async function resetAllDatabaseData() {
  const role = await getCurrentUserRole();
  if (role !== 'SUPERADMIN') {
    throw new Error("Hanya Superadmin yang memiliki izin untuk meriset semua data.");
  }

  const supabaseServer = await createClient();

  // 1. Delete all from schedule_student
  const { error: err1 } = await supabaseServer
    .from('schedule_student')
    .delete()
    .neq('student_id', '00000000-0000-0000-0000-000000000000');

  if (err1) throw new Error("Gagal menghapus data booking: " + err1.message);

  // 2. Delete all from schedule_slots
  const { error: err2 } = await supabaseServer
    .from('schedule_slots')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (err2) throw new Error("Gagal menghapus data slot jadwal: " + err2.message);

  // 3. Delete all from students
  const { error: err3 } = await supabaseServer
    .from('students')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (err3) throw new Error("Gagal menghapus data siswa: " + err3.message);

  // 4. Delete all from classes
  const { error: err4 } = await supabaseServer
    .from('classes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (err4) throw new Error("Gagal menghapus data kelas: " + err4.message);

  // Labels are global and NOT deleted during reset

  return { success: true };
}

export async function getRecentActivities() {
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabaseServer
    .from('users')
    .select('role, branch_id')
    .eq('id', user.id)
    .single();

  if (!profile) return [];

  // Single unified query with branch_id always in select to keep types consistent
  const isBranchAdmin = profile.role !== 'SUPERADMIN' && !!profile.branch_id;

  const selectQuery = supabaseServer
    .from('schedule_student')
    .select(`
      created_at,
      student:students(name, status),
      slot:schedule_slots!inner(
        date,
        time,
        branch_id,
        class:classes(name),
        branch:branches(name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  const finalQuery = isBranchAdmin
    ? selectQuery.eq('slot.branch_id', profile.branch_id)
    : selectQuery;

  const { data, error } = await finalQuery;
  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }

  return data || [];
}

// =========================================
// ACCOUNT MANAGEMENT ACTIONS (SUPERADMIN)
// =========================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi di file .env.local');
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey);
}

export async function getAllUsers() {
  const role = await getCurrentUserRole();
  if (role !== 'SUPERADMIN') throw new Error('Akses ditolak');
  
  const { data, error } = await supabase
    .from('users')
    .select('*, branch:branches(name)')
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const role = await getCurrentUserRole();
  if (role !== 'SUPERADMIN') throw new Error('Akses ditolak');
  
  if (!newPassword || newPassword.length < 3) {
    throw new Error('Password baru minimal 3 karakter.');
  }

  const serviceClient = getServiceSupabase();
  
  // Update password di Supabase Auth
  const { error: authError } = await serviceClient.auth.admin.updateUserById(userId, {
    password: newPassword
  });
  
  if (authError) throw new Error("Gagal mengganti password di server: " + authError.message);
  return true;
}

