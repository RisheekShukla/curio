import { NextResponse, type NextRequest } from "next/server";
import { getStorageMode } from "@/lib/server/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (getStorageMode() === "cloud") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.nextUrl), { status: 303 });
}
