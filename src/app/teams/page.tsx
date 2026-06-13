/**
 * 团队管理页面
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeamManager } from "@/components/teams/team-manager";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  return <TeamManager />;
}