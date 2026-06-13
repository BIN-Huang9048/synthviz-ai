/**
 * 团队详情 & 删除 API
 * DELETE /api/teams/[id] - 删除团队
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const { id } = await params;

  const team = await prisma.team.findUnique({ where: { id }, select: { ownerId: true } });
  if (!team) return NextResponse.json({ success: false, error: "团队不存在" }, { status: 404 });
  if (team.ownerId !== (session.user as Record<string, unknown>).id) {
    return NextResponse.json({ success: false, error: "只有团队拥有者可删除" }, { status: 403 });
  }

  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "团队已删除" });
}