import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Add message to talk
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: talkId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify talk exists and user owns it
  const { data: talk, error: talkError } = await supabase
    .from("talks")
    .select("id, status, owner_user_id")
    .eq("id", talkId)
    .eq("owner_user_id", user.id)
    .single();

  if (talkError || !talk) {
    return NextResponse.json({ error: "Talk not found" }, { status: 404 });
  }

  if (talk.status !== "active" && talk.status !== "paused") {
    return NextResponse.json({ error: "Talk is not active" }, { status: 400 });
  }

  const body = await request.json();
  const { speaker_tag, original_text, original_language, translated_text, is_final } = body;

  if (!original_text || !original_language) {
    return NextResponse.json(
      { error: "original_text and original_language are required" },
      { status: 400 }
    );
  }

  const { data: message, error } = await supabase
    .from("talk_messages")
    .insert({
      talk_id: talkId,
      speaker_tag: speaker_tag || 1,
      original_text,
      original_language,
      translated_text: translated_text || null,
      timestamp: new Date().toISOString(),
      is_final: is_final ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message });
}
