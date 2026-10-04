"use client";

import { useEffect, useState } from "react";

interface Student {
  id: string;
  name: string;
  nickname?: string;
  date_of_birth: string;
  photo_url?: string;
  age?: number;
  days_until_birthday?: number;
  is_today_birthday?: boolean;
}

interface Template {
  id: string;
  title: string;
  greeting_text: string; // Unified greeting text (no separate upcoming)
  motivational_quote?: string;
  is_active: boolean;
}

interface BirthdayGreetingCardProps {
  student: Student;
  parentUserId?: string; // Add parent user ID from session
}

// Replace template variables with actual values
const replaceTemplateVariables = (
  template: string,
  student: Student,
  birthDay: string,
  birthMonth: string,
): string => {
  return template
    .replace(
      /{name}/g,
      student.nickname ? `${student.name} (${student.nickname})` : student.name,
    )
    .replace(/{nickname}/g, student.nickname || "---")
    .replace(/{age}/g, student.age?.toString() || "---")
    .replace(/{birth_day}/g, birthDay)
    .replace(/{birth_month}/g, birthMonth)
    .replace(
      /{days_until_birthday}/g,
      student.days_until_birthday?.toString() || "---",
    );
};

export function BirthdayGreetingCard({
  student,
  parentUserId: incomingParentUserId,
}: BirthdayGreetingCardProps) {
  const [mounted, setMounted] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [checkingDatabase, setCheckingDatabase] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTemplate();
    checkExistingFeedback();
    checkSubmissionStatus();
    // Check database for actual feedback
    checkDatabaseSubmission();
  }, []);

  // Clear old session storage entries when component mounts (fresh login)
  useEffect(() => {
    if (mounted && student?.id) {
      console.log("[BirthdayCard] Fresh login detected for:", student.name);

      // Only clear OLD data if we have new/valid submission in database
      const storedFeedback = sessionStorage.getItem(`feedback_${student.id}`);
      const storedSubmitted = sessionStorage.getItem(
        `submitted_feedback_${student.id}`,
      );

      // If both are stale (no real feedback), mark as NOT submitted
      if (storedSubmitted === "true" && !storedFeedback) {
        console.log(
          "[BirthdayCard] Old submission detected, will check database",
        );
      }
    }
  }, [mounted, student?.id]);

  // Check if already submitted in sessionStorage
  const checkSubmissionStatus = () => {
    const submitted = sessionStorage.getItem(
      `submitted_feedback_${student.id}`,
    );
    if (submitted === "true") {
      setHasSubmitted(true);
    }
  };

  // Check if feedback already exists in sessionStorage
  const checkExistingFeedback = () => {
    const storedFeedback = sessionStorage.getItem(`feedback_${student.id}`);
    if (storedFeedback) {
      setFeedbackMessage(storedFeedback);
      setHasSubmitted(true); // If feedback exists, mark as submitted
    }
  };

  const fetchTemplate = async () => {
    try {
      const response = await fetch("/api/birthday-template?action=get-active");
      const result = await response.json();

      if (result.success && result.templates && result.templates.length > 0) {
        // Get active template
        const activeTemplate =
          result.templates.find((t: Template) => t.is_active) ||
          result.templates[0];
        setTemplate(activeTemplate);
      }
    } catch (err) {
      console.error("Error fetching template:", err);
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Save feedback to sessionStorage when message changes
  useEffect(() => {
    if (feedbackMessage && student.id) {
      sessionStorage.setItem(`feedback_${student.id}`, feedbackMessage);
    }
  }, [feedbackMessage, student.id]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setIsSubmitting(true);

    try {
      // Get parent user_id from props or sessionStorage
      const currentUserId =
        incomingParentUserId || sessionStorage.getItem("parent_user_id");

      if (!currentUserId) {
        throw new Error("User not authenticated");
      }

      // Send to backend API
      const response = await fetch("/api/student-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: student.id,
          parent_user_id: currentUserId,
          message: feedbackMessage.trim(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to submit feedback");
      }

      // Mark as submitted in sessionStorage
      setHasSubmitted(true);
      sessionStorage.setItem(`submitted_feedback_${student.id}`, "true");

      // Show success message
      alert("✨ Pesan dan kesan berhasil dikirim! Terima kasih 🙏");

      // Clear form and hide it
      setFeedbackMessage("");
      setShowFeedbackForm(false);

      // Clear sessionStorage
      sessionStorage.removeItem(`feedback_${student.id}`);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("❌ Gagal mengirim pesan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check actual database for recent feedback
  const checkDatabaseSubmission = async () => {
    try {
      setCheckingDatabase(true);

      const response = await fetch(
        `/api/student-feedback?student_id=${student.id}`,
      );
      const result = await response.json();

      if (result.success && result.feedbacks && result.feedbacks.length > 0) {
        // Has real feedback in database
        console.log(
          "[BirthdayCard] Found real feedback in database:",
          result.feedbacks.length,
        );
        setHasSubmitted(true);

        // Sync with session storage
        sessionStorage.setItem(`submitted_feedback_${student.id}`, "true");
        if (result.feedbacks[0].message) {
          sessionStorage.setItem(
            `feedback_${student.id}`,
            result.feedbacks[0].message,
          );
          setFeedbackMessage(result.feedbacks[0].message);
        }
      } else {
        // No feedback in database - clear old session storage
        console.log("[BirthdayCard] No feedback in database, will show card");
        setHasSubmitted(false);
        sessionStorage.removeItem(`submitted_feedback_${student.id}`);
        sessionStorage.removeItem(`feedback_${student.id}`);
      }
    } catch (err) {
      console.error("[BirthdayCard] Error checking database:", err);
    } finally {
      setCheckingDatabase(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const dob = new Date(student.date_of_birth);
  const birthDay = dob.getDate().toString();
  const birthMonthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const birthMonth = birthMonthNames[dob.getMonth()];

  // Use custom template or default message (only for today's birthday)
  let greetingMessage: string | null = null;
  if (template && !loadingTemplate) {
    // Only show greeting when it's their birthday day
    if (student.is_today_birthday) {
      greetingMessage = replaceTemplateVariables(
        template.greeting_text,
        student,
        birthDay,
        birthMonth,
      );
    } else {
      greetingMessage = null; // No message for upcoming birthdays
    }
  } else {
    // Fallback to default message
    if (student.is_today_birthday) {
      greetingMessage = `🎉 Selamat Ulang Tahun yang ke-${student.age} tahun, ${student.name}! Semoga makin hebat dan ceria selalu ya! 🎈`;
    } else {
      greetingMessage = null;
    }
  }

  // Hide card if no greeting message (for upcoming birthdays)
  if (!greetingMessage) {
    return null;
  }

  // Use custom motivational quote or default
  const motivationalQuote =
    template?.motivational_quote ||
    '"Setiap bertambah usia adalah kesempatan baru untuk tumbuh, belajar, dan menjadi lebih baik. Teruslah bermimpi besar dan berjuang mewujudkan impianmu! 🌟"';

  // If user has not submitted feedback, show blocking overlay
  // Kartu perayaan: emoji dipertahankan secukupnya karena ini momen ulang
  // tahun untuk anak. Yang dirapikan hanya struktur: tanpa gradient,
  // tanpa badge miring, tanpa dekorasi confetti, satu animasi (kue).
  if (!hasSubmitted && mounted) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-brand-600 p-4 sm:p-6 shadow-sm flex justify-center">
        {/* Center Container */}
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex justify-center mb-3">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-400 text-amber-950 px-3 py-1 rounded-lg">
              Spesial Hari Ini
            </span>
          </div>

          {/* Large Cake Emoji */}
          <div className="flex justify-center mb-4 animate-bounce">
            <span className="text-5xl sm:text-6xl md:text-7xl">🎂</span>
          </div>

          <div className="flex flex-col items-center gap-3 text-center w-full">
            {/* Header */}
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
              🎉 Selamat Ulang Tahun!
            </h3>

            {/* Student Photo */}
            {student.photo_url && (
              <div className="mt-2 sm:mt-3 w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white/30 bg-white/20 flex-shrink-0">
                <img
                  src={student.photo_url}
                  alt={student.name}
                  width={112}
                  height={112}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Student Info & Date */}
            <div className="space-y-1.5 sm:space-y-2 w-full mt-4 mb-3 px-4 sm:px-6">
              <div className="flex items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm bg-white/10 rounded-xl py-2 px-4">
                <span className="flex items-center gap-2 text-white/95">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-semibold tabular-nums">
                    {birthDay} {birthMonth}
                  </span>
                </span>
                {student.is_today_birthday && (
                  <span className="text-amber-300 font-bold tabular-nums">
                    Umur {student.age} tahun
                  </span>
                )}
              </div>
            </div>

            {/* Greeting Message */}
            <p className="text-white/95 text-xs sm:text-sm leading-relaxed mx-4 sm:mx-6 whitespace-pre-line">
              {greetingMessage}
            </p>

            {/* Motivational Footer */}
            {student.is_today_birthday && (
              <div className="my-4 px-4 sm:px-6 w-full">
                <div className="bg-white/10 rounded-xl p-4 border-l-4 border-amber-400">
                  <p className="text-sm sm:text-base text-white/95 italic leading-relaxed">
                    "{motivationalQuote.replace(/"/g, "")}"
                  </p>
                </div>
              </div>
            )}

            {/* Blocking Feedback Section - Must submit */}
            <div className="mt-4 pt-4 border-t border-white/20 w-full">
              <div className="text-center mb-3">
                <p className="text-white text-sm font-bold leading-relaxed mb-2">
                  Kartu ini akan tertutup setelah pesan dikirim
                </p>
                <p className="text-white/90 text-xs sm:text-sm font-semibold leading-relaxed">
                  <span className="underline">
                    Mohon tulis pesan dan kesan untuk kami
                  </span>
                </p>
              </div>
              {!showFeedbackForm && !feedbackMessage ? (
                <button
                  onClick={() => setShowFeedbackForm(true)}
                  className="w-full bg-amber-500 hover:bg-amber-600 active:translate-y-[1px] text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Tulis Pesan dan Kesan untuk Kami</span>
                </button>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-3">
                  {feedbackMessage && (
                    <div className="bg-white/10 rounded-xl p-3 border border-white/20 text-left">
                      <p className="text-xs text-white/70 mb-1">Pesan Anda:</p>
                      <p className="text-white/95 text-xs sm:text-sm italic">
                        "{feedbackMessage}"
                      </p>
                    </div>
                  )}

                  <div>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Tulis pesan dan kesan spesial untuk kami..."
                      maxLength={200}
                      rows={4}
                      className="w-full bg-white text-gray-800 border-2 border-gray-300 text-base rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-600 resize-none placeholder-gray-400 font-medium"
                      required={!feedbackMessage}
                    />
                    <p className="text-right text-xs text-white/70 mt-1 font-semibold tabular-nums">
                      {feedbackMessage.length}/200 karakter
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !feedbackMessage.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-600 active:translate-y-[1px] text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wide"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="uppercase">Menyimpan...</span>
                      </span>
                    ) : (
                      <span className="uppercase">Kirim Pesan</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If already submitted, don't show card at all
  return null;
}
