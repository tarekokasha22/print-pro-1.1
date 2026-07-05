import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazily create the client so an unset env (the default — Print Pro is
// client-side) doesn't throw at import / build time.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key"
  );
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId مطلوب" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { fileId, storagePath } = await req.json();
  if (!fileId || !storagePath) {
    return NextResponse.json({ error: "fileId و storagePath مطلوبان" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error: storageError } = await supabase.storage
    .from("printpro-files")
    .remove([storagePath]);

  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

  const { error: dbError } = await supabase.from("files").delete().eq("id", fileId);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
