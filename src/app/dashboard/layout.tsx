/**
 * 仪表盘布局 - 服务端权限校验
 * 未登录用户由 middleware 重定向，此处为二次保障
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <>{children}</>;
}
