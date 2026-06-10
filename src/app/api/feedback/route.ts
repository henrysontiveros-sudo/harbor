import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, title, description } = body;

  if (!type || !title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const VALID_TYPES = ["bug", "suggestion", "improvement", "other"];
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("feedback").insert({
    type,
    title: title.trim(),
    description: description.trim(),
    submitted_by: user.id,
    user_email: user.email,
    user_name: profile?.full_name ?? null,
  });

  if (error) {
    console.error("Feedback insert error:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
