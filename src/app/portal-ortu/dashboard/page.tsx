import { redirect } from "next/navigation";
import {
  getParentSessionStudent,
  getStudentUpcomingSchedule,
  getStudentScheduleHistory,
  getWorksheetsByStudent,
  getPointRedemptions,
  getStudentRulesDocuments,
} from "@/lib/actions";
import { ParentDashboardClient } from "@/components/features/portal/ParentDashboardClient";

// Log diagnostik sementara (sama seperti logPortal di lib/actions).
//gunakan untuk memastikan halaman ini benar-benar dirender server untuk
// siswa tertentu — penting saat client lapor "halaman gagal dimuat".
// Hanya console.log; alur redirect dan data tidak berubah.
function logPortalDashboard(detail: Record<string, unknown>) {
  try {
    console.log(
      `[PORTAL] RENDER ${new Date().toISOString()} | ${JSON.stringify(detail)}`,
    );
  } catch (e) {
    // logger tidak boleh mengganggu render
  }
}

// Batch2 hemat: hapus force-dynamic redundan — tetap dynamic otomatis via cookies().
export default async function ParentDashboardPage() {
  const student = await getParentSessionStudent();

  if (!student) {
    logPortalDashboard({ tahap: "TANPA-SESSION", hasil: "redirect-ke-login" });
    redirect("/portal-ortu");
  }

  const [
    upcomingSchedules,
    scheduleHistory,
    worksheets,
    redemptions,
    rulesDocuments,
  ] = await Promise.all([
    getStudentUpcomingSchedule(student.id),
    getStudentScheduleHistory(student.id),
    getWorksheetsByStudent(student.id),
    getPointRedemptions(student.id),
    getStudentRulesDocuments(),
  ]);

  logPortalDashboard({
    tahap: "OK",
    nama: student.name,
    studentId: student.id,
    cabang: (student as any).branch?.name,
    laporan: worksheets?.length ?? 0,
    jadwalMendatang: upcomingSchedules?.length ?? 0,
  });

  return (
    <ParentDashboardClient
      student={student}
      upcomingSchedules={upcomingSchedules}
      scheduleHistory={scheduleHistory}
      worksheets={worksheets}
      redemptions={redemptions}
      rulesDocuments={rulesDocuments}
    />
  );
}
