import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * GET /api/birthday
 * Mengambil daftar siswa yang memiliki ultah di bulan tertentu
 * Query params:
 *   - month: number (optional) - Bulan filter (1-12), default: bulan ini
 *   - day: number (optional) - Tanggal filter (1-31), default: semua tanggal
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    // Get current user and branch
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from("users")
      .select("role, branch_id")
      .eq("id", user.id)
      .single();

    const isSuperadmin = profile?.role === "SUPERADMIN";

    // Determine effective branch ID
    // For superadmin: check cookie for selected branch
    // For branch admin: use profile branch_id
    let effectiveBranchId: string | null = null;

    if (isSuperadmin) {
      // Superadmin - get branch from cookie (selected via dropdown)
      const selectedBranchCookie = cookieStore.get("superadmin_branch_id");
      effectiveBranchId = selectedBranchCookie?.value || null;
    } else if (profile?.branch_id) {
      // Branch admin - use profile branch_id
      effectiveBranchId = profile.branch_id;
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : new Date().getMonth() + 1;
    const day = searchParams.get("day")
      ? parseInt(searchParams.get("day")!)
      : null;

    // Query students based on user role and branch
    let query = supabase
      .from("students")
      .select(
        `
        id, name, nickname, date_of_birth, photo_url, status, branch_id,
        branch:branches(name),
        label:labels(main_level, sub_level, hex_color)
      `,
      )
      .eq("status", "REGISTERED");

    // Filter by branch if not superadmin
    if (effectiveBranchId) {
      query = query.eq("branch_id", effectiveBranchId);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error("Error fetching students:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
        students: [],
      });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ success: true, students: [], count: 0 });
    }

    // Filter dan proses data di JavaScript (client-side)
    const today = new Date();
    const currentYear = today.getFullYear();

    let studentsWithProximity = students
      .map((student) => {
        const dob = new Date(student.date_of_birth);
        const birthMonth = dob.getMonth() + 1; // Convert to 1-12
        const birthDay = dob.getDate();

        // Filter by selected month (if specified)
        if (month && birthMonth !== month) {
          return null; // Mark for exclusion
        }

        // Calculate next birthday
        let nextBirthday = new Date(currentYear, birthMonth - 1, birthDay);

        // If birthday this year has passed, use next year
        if (nextBirthday < today) {
          nextBirthday = new Date(currentYear + 1, birthMonth - 1, birthDay);
        }

        // Calculate days until birthday
        const diffTime = nextBirthday.getTime() - today.getTime();
        const daysUntilBirthday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Calculate age
        const age = calculateAge(dob, today);

        return {
          ...student,
          days_until_birthday: daysUntilBirthday,
          age: age,
          is_today_birthday: daysUntilBirthday === 0,
        };
      })
      // Remove null entries (filtered out by month)
      .filter((student) => student !== null);

    // If no month filter selected, apply proximity filter (next 60 days)
    if (!month) {
      studentsWithProximity = studentsWithProximity.filter(
        (student) =>
          student.days_until_birthday <= 60 || student.is_today_birthday,
      );
    }

    // FIX: Make sure students with birthday TODAY are marked correctly
    const septemberStudents = students?.filter((s: any) => {
      const dob = new Date(s.date_of_birth);
      return (
        dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()
      );
    });

    if (septemberStudents && septemberStudents.length > 0) {
      septemberStudents.forEach((s) => {
        const dob = new Date(s.date_of_birth);

        // Add or update these students to be today's birthdays
        const existingIndex = studentsWithProximity.findIndex(
          (p) => p.id === s.id,
        );

        if (existingIndex >= 0) {
          // Update existing entry
          studentsWithProximity[existingIndex] = {
            ...studentsWithProximity[existingIndex],
            days_until_birthday: 0,
            age: calculateAge(dob, today),
            is_today_birthday: true,
          };
        } else {
          // Create new entry and add first
          const newEntry = {
            ...s,
            days_until_birthday: 0,
            age: calculateAge(dob, today),
            is_today_birthday: true,
          };
          studentsWithProximity.unshift(newEntry);
        }
      });
    }

    // Sort by proximity (nearest birthday first)
    studentsWithProximity.sort(
      (a, b) => a.days_until_birthday - b.days_until_birthday,
    );

    return NextResponse.json({
      success: true,
      students: studentsWithProximity,
      count: studentsWithProximity.length,
    });
  } catch (error: any) {
    console.error("Error fetching birthday data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mengambil data ulang tahun",
      },
      { status: 500 },
    );
  }
}

/**
 * Helper function: Calculate age from DOB
 * Simple formula: current year minus birth year
 */
function calculateAge(dob: Date, today: Date): number {
  const currentYear = today.getFullYear();
  const birthYear = dob.getFullYear();
  return currentYear - birthYear;
}
