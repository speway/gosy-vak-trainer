import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = {
  title: "Вход — Экзаменариум",
  description:
    "Авторизация для доступа к закрытым материалам подготовки к ГОСам и ВАК",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] text-[#64748b]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#2563eb] text-white font-bold text-xl mb-3 animate-pulse">
              Э
            </div>
            <p className="text-sm">Загрузка формы входа...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
