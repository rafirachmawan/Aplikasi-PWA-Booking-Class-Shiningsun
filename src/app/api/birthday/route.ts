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
      console.log(
        `👤 Superadmin detected, checking cookie for branch selection`,
      );
    } else if (profile?.branch_id) {
      // Branch admin - use profile branch_id
      effectiveBranchId = profile.branch_id;
      console.log(`🏫 Branch admin detected, using profile branch_id`);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : new Date().getMonth() + 1;
    const day = searchParams.get("day")
      ? parseInt(searchParams.get("day")!)
      : null;

    console.log(
      `🔍 API Call - Month: ${month}, Day: ${day}, Current Date: ${new Date().toDateString()}`,
    );
    console.log(
      `👤 User: ${user.id}, Role: ${profile?.role}, Branch: ${effectiveBranchId}, IsSuperadmin: ${isSuperadmin}`,
    );

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
      console.log(`🏫 Filtering students by branch: ${effectiveBranchId}`);
    } else if (isSuperadmin) {
      console.log(`🌍 Superadmin accessing all branches`);
    }

    let { data: students, error } = await query;

    console.log(
      `📊 Database query returned: ${students?.length || 0} registered students`,
    );

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

    console.log(`📅 API Birthday - Today: ${today.toDateString()}`);
    console.log(
      `📅 API Birthday - Current Month: ${month}, Current Day: ${today.getDate()}`,
    );

    let studentsWithProximity = students
      .map((student) => {
        const dob = new Date(student.date_of_birth);
        const birthMonth = dob.getMonth() + 1; // Convert to 1-12
        const birthDay = dob.getDate();

        console.log(
          `👤 Student: ${student.name}, DOB string: ${student.date_of_birth}`,
        );
        console.log(`   Parsed DOB object: ${dob.toISOString()}`);
        console.log(
          `   Year=${dob.getFullYear()}, MonthIndex=${dob.getMonth()}, Day=${dob.getDate()}`,
        );
        console.log(
          `📅 Calculated - Birth Month: ${birthMonth}, Birth Day: ${birthDay}`,
        );

        // Filter by selected month (if specified)
        if (month && birthMonth !== month) {
          console.log(
            `  ❌ Excluded: ${student.name} (Month ${birthMonth} != Filter ${month})`,
          );
          return null; // Mark for exclusion
        }

        // Calculate next birthday
        let nextBirthday = new Date(currentYear, birthMonth - 1, birthDay);

        console.log(
          `🎂 Next Birthday (year ${currentYear}):`,
          nextBirthday.toDateString(),
        );

        // If birthday this year has passed, use next year
        if (nextBirthday < today) {
          nextBirthday = new Date(currentYear + 1, birthMonth - 1, birthDay);
          console.log(
            `⏭️ Birthday passed, using next year:`,
            nextBirthday.toDateString(),
          );
        }

        // Calculate days until birthday
        const diffTime = nextBirthday.getTime() - today.getTime();
        const daysUntilBirthday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log(`⏱️ Days until birthday: ${daysUntilBirthday}`);
        console.log(`✅ is_today_birthday: ${daysUntilBirthday === 0}`);

        // Calculate age
        const age = calculateAge(dob, today);
        console.log(
          `   🧮 AGE: CurrentYear=${currentYear}, BirthYear=${dob.getFullYear()}, Age=${age}`,
        );

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

    console.log(
      `🎉 Total students matching filter: ${studentsWithProximity.length}`,
    );
    studentsWithProximity.forEach((s) => {
      console.log(
        `  - ${s.name}: days=${s.days_until_birthday}, is_today=${s.is_today_birthday}`,
      );
    });

    // FIX: Make sure students with birthday TODAY are marked correctly
    const septemberStudents = students?.filter((s: any) => {
      const dob = new Date(s.date_of_birth);
      return (
        dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()
      );
    });

    if (septemberStudents && septemberStudents.length > 0) {
      console.log(
        `🎂 Students with birthday TODAY (${septemberStudents.length}):`,
      );
      septemberStudents.forEach((s) => {
        const dob = new Date(s.date_of_birth);
        console.log(`  ✅ ${s.name}: DOB=${s.date_of_birth}`);

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
          console.log(`   🔄 Updated: days=0, is_today=true`);
        } else {
          // Create new entry and add first
          const birthMonth = dob.getMonth() + 1;
          const birthDay = dob.getDate();
          const newEntry = {
            ...s,
            days_until_birthday: 0,
            age: calculateAge(dob, today),
            is_today_birthday: true,
          };
          studentsWithProximity.unshift(newEntry);
          console.log(`   ➕ Added as new entry: days=0, is_today=true`);
        }
      });
    }

    // Sort by proximity (nearest birthday first)
    studentsWithProximity.sort(
      (a, b) => a.days_until_birthday - b.days_until_birthday,
    );

    // Debug: Show all matching students
    console.log(`🎉 FINAL RESULT - ${studentsWithProximity.length} students`);
    studentsWithProximity.forEach((s) => {
      console.log(
        `  ✓ ${s.name}: days=${s.days_until_birthday}, is_today=${s.is_today_birthday}`,
      );
    });

    // Also show ALL students that were fetched to debug the issue
    console.log(`👥 Total students in database: ${students?.length || 0}`);
    const allSeptemberBirthdays = students?.filter((s: any) => {
      const dob = new Date(s.date_of_birth);
      return dob.getMonth() === 8; // September (0-indexed)
    });
    if (septemberStudents && septemberStudents.length > 0) {
      console.log(
        `🎂 Students with September birthdays (${septemberStudents.length}):`,
      );
      septemberStudents.forEach((s) => {
        const dob = new Date(s.date_of_birth);
        const birthDay = dob.getDate();
        const age = calculateAge(dob, today);
        let nextBirthday = new Date(currentYear, 8, birthDay); // Month 8 = September
        if (nextBirthday < today) {
          nextBirthday = new Date(currentYear + 1, 8, birthDay);
        }
        const diffTime = nextBirthday.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log(
          `  📅 ${s.name}: DOB=${s.date_of_birth}, Age=${age}, DaysUntil=${daysUntil}, IsToday=${daysUntil === 0}`,
        );
      });
    }

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
