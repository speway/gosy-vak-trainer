import { NextResponse } from "next/server";
import {
  getExpectedCredentials,
  signToken,
  AUTH_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Пожалуйста, введите логин и пароль" },
        { status: 400 }
      );
    }

    const { user, pass } = getExpectedCredentials();

    if (username.trim() !== user || password !== pass) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const token = await signToken(user);
    const response = NextResponse.json({ success: true, username: user });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Ошибка сервера при авторизации" },
      { status: 500 }
    );
  }
}
