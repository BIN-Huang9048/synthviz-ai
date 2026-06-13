/**
 * 团队管理 API
 * GET /api/teams - 获取用户所在团队列表
 * POST /api/teams - 创建新团队
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";

const createTeamSchema = z.object({
  name: z.string().min(1, "团队名称不能为空").max(50),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const currentUserId = (session.user as any).id as string;

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: currentUserId },
          { members: { some: { userId: currentUserId } } },
        ],
      },
      include: {
        _count: { select: { members: true, dashboards: true } },
        owner: { select: { id: true, name: true, email: true } },
        // 获取当前用户在该团队的成员记录（含角色）
        members: {
          where: { userId: currentUserId },
          select: { role: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 附加当前用户角色到返回数据
    const data = teams.map((t) => {
      const { members: _m, ...rest } = t as any;
      return { ...rest, myRole: _m?.[0]?.role || null };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[TEAMS_GET]", error);
    return NextResponse.json(
      { success: false, error: "获取团队列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "输入无效", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    // 创建团队并自动创建 owner 成员记录
    const team = await prisma.team.create({
      data: {
        name: parsed.data.name,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: team, message: "团队创建成功" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[TEAMS_POST]", error);
    return NextResponse.json(
      { success: false, error: "创建团队失败" },
      { status: 500 }
    );
  }
}
