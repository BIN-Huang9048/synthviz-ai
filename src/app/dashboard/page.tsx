/**
 * 仪表盘主页面 - 需认证
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <DashboardOverview user={session.user} />;
}
