"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Пожалуйста, заполните логин и пароль");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Неверный логин или пароль");
        setLoading(false);
        return;
      }

      // Login success: redirect to requested page or home
      router.push(from);
      router.refresh();
    } catch {
      setError("Ошибка сети при входе. Попробуйте ещё раз.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f3f5f8] text-[#111827]">
      <div className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3155e7] text-white font-bold text-2xl shadow-lg shadow-[#3155e7]/25 mb-4">
            Э
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            Экзаменариум
          </h1>
          <p className="text-sm text-[#667085] mt-1.5 font-medium">
            Подготовка к ГОСам и ВАК по психологии
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl border border-[#dfe4ec] p-6 sm:p-8 shadow-[0_20px_50px_rgba(18,32,75,0.08)]">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#dfe4ec]">
            <ShieldCheck className="w-5 h-5 text-[#3155e7]" />
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                Вход в закрытый раздел
              </h2>
              <p className="text-xs text-[#667085]">
                Введите логин и пароль для доступа к билетам
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-[#475467] mb-1.5"
              >
                Логин
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98a2b3]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f9fafb] border border-[#d8dee8] rounded-xl text-sm text-[#111827] placeholder-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-[#3155e7]/40 focus:border-[#3155e7] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#475467] mb-1.5"
              >
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98a2b3]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-[#f9fafb] border border-[#d8dee8] rounded-xl text-sm text-[#111827] placeholder-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-[#3155e7]/40 focus:border-[#3155e7] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#98a2b3] hover:text-[#475467] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#3155e7] hover:bg-[#2848cc] active:bg-[#1e39aa] text-white font-medium text-sm shadow-md shadow-[#3155e7]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Проверка данных...</span>
                </>
              ) : (
                <>
                  <span>Войти в тренажёр</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#dfe4ec] text-center">
            <p className="text-xs text-[#667085] leading-relaxed">
              Учебные материалы защищены. Доступ разрешён только авторизованным слушателям.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#98a2b3]">
            70 экзаменационных билетов · 39 экспертных заданий
          </p>
        </div>
      </div>
    </div>
  );
}
