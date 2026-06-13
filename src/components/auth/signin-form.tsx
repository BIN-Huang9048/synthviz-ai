"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
});

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const justRegistered = searchParams.get("registered") === "true";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({}); setServerError("");
    const formData = new FormData(e.currentTarget);
    const data = { email: formData.get("email") as string, password: formData.get("password") as string };
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((i) => { fieldErrors[i.path[0] as string] = i.message; });
      setErrors(fieldErrors);
      return;
    }
    setIsLoading(true);
    try {
      const res = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
      if (res?.error) { setServerError("邮箱或密码错误，请重试"); }
      else { router.push(callbackUrl); router.refresh(); }
    } catch { setServerError("登录失败，请稍后重试"); }
    finally { setIsLoading(false); }
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* 标题区 */}
      <h2 className="text-[26px] font-semibold text-[#111] text-center">
        欢迎回来
      </h2>
      <p className="mt-3 text-sm font-normal text-[#666] text-center">
        登录你的账号以继续
      </p>

      {/* 表单 — 固定宽度 340px */}
      <form onSubmit={handleSubmit} className="w-[340px] mt-8 flex flex-col gap-5">
        {/* 提示消息 */}
        {justRegistered && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> 注册成功！请登录你的账号
          </div>
        )}
        {serverError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {serverError}
          </div>
        )}

        {/* 邮箱 */}
        <div>
          <label htmlFor="email" className="block mb-1.5 text-sm font-medium text-[#333]">邮箱</label>
          <input
            id="email" name="email" type="email" required autoComplete="email"
            placeholder="name@example.com"
            className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm placeholder:text-[#999] focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        {/* 密码 */}
        <div>
          <label htmlFor="password" className="block mb-1.5 text-sm font-medium text-[#333]">密码</label>
          <input
            id="password" name="password" type="password" required autoComplete="current-password"
            placeholder="••••••••"
            className="w-full h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm placeholder:text-[#999] focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          <div className="mt-1.5 text-right">
            <span className="text-sm text-gray-400">忘记密码？</span>
          </div>
        </div>

        {/* 登录按钮 */}
        <button
          type="submit" disabled={isLoading}
          className="w-full h-11 rounded-[10px] bg-violet-600 text-base font-semibold text-white hover:bg-violet-700/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          登录
        </button>

        {/* 底部 */}
        <p className="text-center text-sm text-[#666]">
          还没有账号？{" "}
          <Link href="/auth/signup" className="font-medium text-violet-600 hover:text-violet-500 underline underline-offset-2">
            立即注册
          </Link>
        </p>
      </form>
    </div>
  );
}
