import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const { valid, username } = token
    ? await verifyToken(token)
    : { valid: false, username: null };

  return NextResponse.json({
    authenticated: valid,
    username: valid ? username : null,
  });
}
