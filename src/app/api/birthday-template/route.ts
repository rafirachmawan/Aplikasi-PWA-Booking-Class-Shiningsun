import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/birthday-template
 * Mengambil semua template ucapan ulang tahun (Global for all branches)
 * Query params:
 *   - id: string (optional) - Filter by ID
 *   - action: string (optional) - Action type
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    // Get active template(s) only
    if (action === "get-active") {
      const { data: templates, error } = await supabase
        .from("birthday_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        templates: templates || [],
      });
    }

    // Toggle active action
    if (action === "toggle-active" && id) {
      // Fetch current status
      const { data: currentTemplate } = await supabase
        .from("birthday_templates")
        .select("is_active")
        .eq("id", id)
        .single();

      if (!currentTemplate) {
        return NextResponse.json(
          { success: false, error: "Template tidak ditemukan" },
          { status: 404 },
        );
      }

      // Toggle status
      const newStatus = !currentTemplate.is_active;

      const { data: updated, error } = await supabase
        .from("birthday_templates")
        .update({ is_active: newStatus, updated_at: new Date() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        template: updated,
      });
    }

    // Get all templates or specific one
    let query = supabase
      .from("birthday_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (id) {
      query = query.eq("id", id);
    }

    const { data: templates, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      templates: templates || [],
    });
  } catch (error: any) {
    console.error("Error fetching birthday templates:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengambil template" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/birthday-template
 * Membuat template baru (Global for all branches)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { title, greeting_text, motivational_quote, is_active } = body;

    // Validation
    if (!title || !greeting_text) {
      return NextResponse.json(
        { success: false, error: "Judul dan teks ucapan wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("birthday_templates")
      .insert({
        title,
        greeting_text,
        motivational_quote: motivational_quote || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error: any) {
    console.error("Error creating birthday template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal membuat template" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/birthday-template
 * Update template existing
 * Query params: id
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID template diperlukan untuk update" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { title, greeting_text, motivational_quote, is_active } = body;

    // Validation
    if (!title || !greeting_text) {
      return NextResponse.json(
        { success: false, error: "Judul dan teks ucapan wajib diisi" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("birthday_templates")
      .update({
        title,
        greeting_text,
        motivational_quote: motivational_quote || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      template: data,
    });
  } catch (error: any) {
    console.error("Error updating birthday template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengupdate template" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/birthday-template
 * Hapus template
 * Query params: id
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID template diperlukan untuk delete" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("birthday_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Error deleting birthday template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menghapus template" },
      { status: 500 },
    );
  }
}
