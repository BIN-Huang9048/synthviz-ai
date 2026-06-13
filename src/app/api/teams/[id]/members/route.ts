/**
 * 团队成员 + 邀请管理 API
 * GET    /api/teams/[id]/members      — 成员列表 + 待处理邀请
 * POST   /api/teams/[id]/members      — 发送邀请（不再直接添加）
 * PUT    /api/teams/[id]/members      — 接受/拒绝邀请 + 修改角色
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as Record<string, unknown>).id as string;

  const [members, pendingInvites] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.invitation.findMany({
      where: { teamId: id, status: "PENDING" },
      include: { invitee: { select: { id: true, name: true, email: true } }, inviter: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({ success: true, data: { members, pendingInvites } });
}

const inviteSchema = z.object({ email: z.string().email("无效的邮箱"), role: z.enum(["ADMIN", "VIEWER"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as Record<string, unknown>).id as string;

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: "输入无效" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!target) return NextResponse.json({ success: false, error: "用户未注册" }, { status: 404 });

  // 检查是否已是成员
  const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId: target.id } } });
  if (existing) return NextResponse.json({ success: false, error: "已是团队成员" }, { status: 409 });

  // 检查是否有待处理邀请
  const pending = await prisma.invitation.findFirst({
    where: { teamId: id, inviteeId: target.id, status: "PENDING" },
  });
  if (pending) return NextResponse.json({ success: false, error: "已有待处理的邀请" }, { status: 409 });

  const inv = await prisma.invitation.create({
    data: { teamId: id, inviterId: userId, inviteeId: target.id, role: parsed.data.role },
    include: { invitee: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ success: true, data: inv, message: "邀请已发送" }, { status: 201 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as Record<string, unknown>).id as string;

  const body = await request.json();
  const { action, invitationId, memberId, newRole } = body;

  // 接受/拒绝邀请
  if (action === "accept" || action === "decline") {
    const inv = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!inv || inv.inviteeId !== userId) return NextResponse.json({ success: false, error: "无权操作" }, { status: 403 });

    if (action === "accept") {
      await prisma.teamMember.create({ data: { teamId: id, userId, role: inv.role } });
      await prisma.invitation.update({ where: { id: invitationId }, data: { status: "ACCEPTED" } });
      return NextResponse.json({ success: true, message: "已加入团队" });
    }
    await prisma.invitation.update({ where: { id: invitationId }, data: { status: "DECLINED" } });
    return NextResponse.json({ success: true, message: "已拒绝邀请" });
  }

  // 修改角色（仅 OWNER）
  if (action === "changeRole" && memberId && newRole) {
    const isOwner = await prisma.teamMember.findFirst({
      where: { teamId: id, userId, role: "OWNER" },
    });
    if (!isOwner) return NextResponse.json({ success: false, error: "仅拥有者可修改角色" }, { status: 403 });

    await prisma.teamMember.update({
      where: { id: memberId }, data: { role: newRole },
    });
    return NextResponse.json({ success: true, message: "角色已更新" });
  }

  return NextResponse.json({ success: false, error: "无效操作" }, { status: 400 });
}
