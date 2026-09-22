import { NextRequest, NextResponse } from "next/server";
import { createClient, getSupabaseClient } from "@/lib/supabase";

// POST /api/student-feedback - Kirim feedback dari parent
export async function POST(request: NextRequest) {
  try {
    console.log("[StudentFeedback] POST request received");

    // Use SERVICE ROLE client to bypass RLS for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    );

    const body = await request.json();
    const { student_id, parent_user_id, message } = body;

    console.log("[StudentFeedback] Received data:", {
      student_id,
      parent_user_id,
      message_length: message?.length,
    });

    // Validate required fields
    if (!student_id || !parent_user_id || !message) {
      console.error("[StudentFeedback] Missing required fields:", {
        has_student_id: !!student_id,
        has_parent_user_id: !!parent_user_id,
        has_message: !!message,
      });
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate message length
    if (message.length > 500) {
      console.error("[StudentFeedback] Message too long:", message.length);
      return NextResponse.json(
        { success: false, error: "Message too long (max 500 characters)" },
        { status: 400 },
      );
    }

    console.log(
      "[StudentFeedback] Attempting to insert into student_feedback table...",
    );

    // Insert feedback into database (bypasses RLS)
    const { data, error } = await supabase
      .from("student_feedback")
      .insert({
        student_id,
        parent_user_id,
        message,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "[StudentFeedback] Error inserting feedback:",
        JSON.stringify(error, null, 2),
      );
      return NextResponse.json(
        { success: false, error: error.message || "Failed to save feedback" },
        { status: 500 },
      );
    }

    console.log("[StudentFeedback] Feedback saved successfully:", data);

    return NextResponse.json(
      { success: true, feedback: data },
      { status: 201 },
    );
  } catch (error: any) {
    console.error(
      "[StudentFeedback] Catch error:",
      JSON.stringify(
        { message: error?.message || String(error), stack: error?.stack },
        null,
        2,
      ),
    );
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/student-feedback - Get feedback history for a student
export async function GET(request: Request) {
  try {
    console.log("[StudentFeedback] GET request received");

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    if (!studentId) {
      console.error("[StudentFeedback] Missing student_id in query params");
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
        { status: 400 },
      );
    }

    console.log("[StudentFeedback] Fetching for student_id:", studentId);

    // Use SERVICE ROLE client to bypass RLS completely
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    );

    // Get feedbacks for this student
    const { data: feedbacks, error } = await supabase
      .from("student_feedback")
      .select("*")
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error(
        "[StudentFeedback] Error fetching feedbacks:",
        JSON.stringify(error, null, 2),
      );
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    console.log(
      "[StudentFeedback] Raw feedbacks from DB:",
      JSON.stringify(feedbacks, null, 2),
    );

    // Since we're using service role, fetch parent names from profiles table manually
    let formattedFeedbacks = feedbacks || [];

    if (formattedFeedbacks.length > 0) {
      // Fetch all unique parent IDs
      const parentIds = [
        ...new Set(formattedFeedbacks.map((f: any) => f.parent_user_id)),
      ];

      if (parentIds.length > 0) {
        const { data: parentProfiles, error: profileError } = await supabase
          .from("profiles")
          .select(`id, full_name, email`)
          .in("id", parentIds);

        if (!profileError && parentProfiles?.length > 0) {
          // Map parent IDs to names
          const parentMap = new Map<any, any>(
            parentProfiles.map((p) => [p.id, p]),
          );

          formattedFeedbacks = formattedFeedbacks.map((f) => {
            const parent = parentMap.get(f.parent_user_id);

            return {
              id: f.id,
              message: f.message,
              submitted_at: f.submitted_at,
              is_read: f.is_read,
              parent_name:
                (parent as any)?.full_name ||
                (parent as any)?.email?.split("@")[0] ||
                "Orang Tua",
            };
          });
        } else {
          // Fallback - keep original without parent name resolution
          formattedFeedbacks = formattedFeedbacks.map((f) => ({
            ...f,
            parent_name: "Orang Tua",
          }));
        }
      }
    }

    // Mark unread feedbacks as read
    const unreadFeedbackIds = formattedFeedbacks
      .filter((f: any) => !f.is_read)
      .map((f: any) => f.id);

    if (unreadFeedbackIds.length > 0) {
      await supabase
        .from("student_feedback")
        .update({ is_read: true })
        .in("id", unreadFeedbackIds);
    }

    return NextResponse.json({
      success: true,
      feedbacks: formattedFeedbacks,
      count: formattedFeedbacks.length,
    });
  } catch (error: any) {
    console.error("Error in student-feedback API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
