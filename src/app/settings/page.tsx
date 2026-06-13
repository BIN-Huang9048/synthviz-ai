/**
 * 设置页面 - 个人信息 + 密码修改
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const user = {
    id: (session.user as Record<string, unknown>).id as string,
    name: session.user.name || null,
    email: session.user.email || "",
    role: (session.user as Record<string, unknown>).role as string || "MEMBER",
  };

  return <SettingsForm user={user} />;
}