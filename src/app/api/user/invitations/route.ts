/**
 * 用户收到的邀请列表
 * GET /api/user/invitations
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const userId = (session.user as Record<string, unknown>).id as string;

  const invites = await prisma.invitation.findMany({
    where: { inviteeId: userId, status: "PENDING" },
    include: { team: { select: { id: true, name: true } }, inviter: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: invites });
}
