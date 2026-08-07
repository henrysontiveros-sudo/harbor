import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Regenerate the caller's calendar token, revoking any existing subscription
// URLs. Auth via the normal cookie-bound client (this is called from the app).
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ calendar_token: crypto.randomUUID() })
    .eq("id", user.id)
    .select("calendar_token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, token: data.calendar_token });
}
