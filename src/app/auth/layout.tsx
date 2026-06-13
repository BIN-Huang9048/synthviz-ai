/**
 * 认证页面布局 - 不使用侧边栏/导航栏
 * 对于已登录用户自动重定向到仪表盘
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
