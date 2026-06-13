/**
 * AI 创建看板页面
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AICreateDashboardForm } from "@/components/ai/ai-create-dashboard-form";

export default async function AICreateDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  return <AICreateDashboardForm />;
}
