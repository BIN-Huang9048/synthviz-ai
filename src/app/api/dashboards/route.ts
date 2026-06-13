/**
 * 仪表盘 CRUD API
 * GET /api/dashboards - 获取仪表盘列表
 * POST /api/dashboards - 创建仪表盘
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";

const createDashboardSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  description: z.string().optional(),
  teamId: z.string().min(1, "请选择团队"),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const userId = (session.user as any).id;

    // 用户所在团队 IDs
    const memberTeams = await prisma.teamMember.findMany({
      where: { userId }, select: { teamId: true },
    });
    const teamIds = memberTeams.map((t) => t.teamId);

    const where = teamId
      ? { teamId }
      : { OR: [{ userId }, { teamId: { in: teamIds } }] };

    const [dashboards, total] = await Promise.all([
      prisma.dashboard.findMany({
        where,
        include: {
          widgets: { orderBy: { createdAt: "asc" } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.dashboard.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: dashboards,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[DASHBOARDS_GET]", error);
    return NextResponse.json(
      { success: false, error: "获取仪表盘列表失败" },
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
    const parsed = createDashboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "输入无效", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    // 确保 team 存在，否则自动创建
    let teamId = parsed.data.teamId;
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      const newTeam = await prisma.team.create({
        data: { name: `${session.user.name || "用户"} 的团队`, ownerId: userId, members: { create: { userId, role: "OWNER" } } },
      });
      teamId = newTeam.id;
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || "",
        teamId,
        userId,
        config: { layout: "grid", theme: "light" },
      },
    });

    return NextResponse.json(
      { success: true, data: dashboard, message: "仪表盘创建成功" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[DASHBOARDS_POST]", error);
    return NextResponse.json(
      { success: false, error: "创建仪表盘失败" },
      { status: 500 }
    );
  }
}
