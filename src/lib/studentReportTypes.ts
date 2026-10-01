export const REPORT_DEFAULT_FROM_DATE = "2026-09-01";

export type StudentReportRow = {
  id: string;
  branch_id: string;
  branch_name: string;
  name: string;
  nickname: string | null;
  gender: string | null;
  date_of_birth: string;
  phone: string | null;
  school: string | null;
  status: string;
  registration_date: string;
  registered_at: string | null;
  label_name: string;
  created_at: string;
};

/** Satu baris = satu jadwal satu siswa + isian laporan perkembangannya. */
export type StudentScheduleWorksheetRow = {
  key: string;
  student_id: string;
  student_name: string;
  nickname: string | null;
  branch_name: string;
  label_name: string;
  schedule_date: string;
  schedule_time: string;
  class_name: string;
  status: "Terisi" | "Kosong";
  /** True jika isian ini tanggalnya tidak cocok dengan jadwal mana pun. */
  luar_jadwal: boolean;
  materi: string;
  kegiatan: string;
  hasil_belajar: string;
  catatan_guru: string;
  rekomendasi_rumah: string;
};
