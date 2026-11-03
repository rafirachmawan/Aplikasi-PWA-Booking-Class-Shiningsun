// Barrel file: seluruh Server Actions dipecah per domain di folder ./actions/.
// File ini hanya me-re-export agar semua import `@/lib/actions` yang sudah ada tetap berjalan.
// Sengaja TIDAK memakai "use server" di sini; directive ada di masing-masing modul.

export {
  syncUserIdentity,
  getCurrentUserRole,
  setSuperadminBranch,
  clearSuperadminBranch,
  getBranchId,
  getActiveBranchName,
  getBranches,
  resetAllDatabaseData,
  getAllUsers,
  changeUserPassword,
  getModuleLockPasswords,
  updateModuleLockPassword,
} from "./actions/auth-branch";

export {
  getDashboardStats,
  getOverdueWorksheets,
  getRecentActivities,
} from "./actions/dashboard";

export {
  getClasses,
  getLabels,
  createClass,
  createLabel,
  deleteClass,
  getClassDeletionImpact,
  deleteLabel,
  getClassesWithSchedules,
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAssessmentTemplates,
  createAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate,
  getStudentRulesDocument,
  getStudentRulesDocuments,
  saveStudentRulesDocument,
  renameStudentRulesDocument,
  deleteStudentRulesDocument,
  getCurriculumDocuments,
  saveCurriculumDocument,
  renameCurriculumDocument,
  deleteCurriculumDocument,
} from "./actions/master";

export {
  getStudentScheduleMap,
  autoBookStudentToClass,
  bookStudentManual,
  removeStudentBooking,
  bulkRemoveStudentBookings,
  copyScheduleToNextMonth,
  getStudentsWithNextMonthSchedule,
  moveStudentBooking,
  getMonthlySchedules,
  createScheduleSlot,
  bookStudentToSlot,
  toggleSlotLock,
  cancelBooking,
  getSchedulesByDate,
  getTodaySchedules,
} from "./actions/schedules";

export {
  getStudents,
  createStudent,
  deleteStudent,
  updateStudentStatus,
  updateStudentLabel,
  updateStudent,
  getStudentsByStatusWithSchedules,
  updateStudentAccessPin,
  updateStudentPhotoUrl,
  getPaginatedStudents,
} from "./actions/students";

export {
  getWorksheetsByBranch,
  getWorksheetsByStudent,
  getStudentSessionTimes,
  createWorksheet,
  updateWorksheet,
  deleteWorksheet,
  deleteWorksheetMonth,
  getWorksheetAttendanceHistory,
} from "./actions/worksheets";

export {
  verifyParentAccess,
  confirmParentStudentSelection,
  getParentSessionStudent,
  clearParentSession,
  getStudentUpcomingSchedule,
  getStudentScheduleHistory,
  updateParentFeedback,
  updateSingleWorksheetParentFeedback,
} from "./actions/portal";

export {
  redeemStudentPoints,
  addManualStudentPoints,
  getPointRedemptions,
} from "./actions/points";
