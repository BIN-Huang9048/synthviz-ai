/**
 * 注册表单组件
 * 客户端表单验证 + API 调用 + 自动登录
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const signUpSchema = z
  .object({
    name: z.string().min(1, "请输入姓名"),
    email: z.string().email("请输入有效的邮箱地址"),
    password: z.string().min(6, "密码至少 6 位"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setSuccessMsg("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    // 前端 Zod 校验
    const result = signUpSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      // 调用注册 API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || "注册失败，请稍后重试");
        return;
      }

      // 注册成功后自动登录
      setSuccessMsg("注册成功，正在跳转...");

      const signInRes = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInRes?.error) {
        // 注册成功但自动登录失败 → 跳转到登录页
        router.push("/auth/signin?registered=true");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setServerError("网络错误，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 服务端错误 */}
      {serverError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {serverError}
        </div>
      )}

      {/* 成功消息 */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      <Input
        id="name"
        name="name"
        type="text"
        label="姓名"
        placeholder="张三"
        error={errors.name}
        autoComplete="name"
        required
      />

      <Input
        id="email"
        name="email"
        type="email"
        label="邮箱"
        placeholder="name@example.com"
        error={errors.email}
        autoComplete="email"
        required
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="密码"
        placeholder="至少 6 位"
        error={errors.password}
        autoComplete="new-password"
        required
      />

      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="确认密码"
        placeholder="再次输入密码"
        error={errors.confirmPassword}
        autoComplete="new-password"
        required
      />

      <Button type="submit" size="lg" isLoading={isLoading} className="w-full">
        创建账号
      </Button>

      <p className="text-center text-sm text-gray-500">
        已有账号？{" "}
        <Link
          href="/auth/signin"
          className="font-medium text-violet-600 hover:text-violet-500"
        >
          立即登录
        </Link>
      </p>
    </form>
  );
}
