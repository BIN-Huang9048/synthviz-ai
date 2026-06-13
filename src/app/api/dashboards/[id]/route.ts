/**
 * 仪表盘详情 API
 * GET /api/dashboards/[id] - 获取详情
 * PUT /api/dashboards/[id] - 更新
 * DELETE /api/dashboards/[id] - 删除
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: {
        widgets: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: "仪表盘不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return NextResponse.json(
      { success: false, error: "获取仪表盘失败" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // 检查权限（仅创建者可编辑）
    const existing = await prisma.dashboard.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "仪表盘不存在" },
        { status: 404 }
      );
    }

    if (existing.userId !== (session.user as any).id) {
      return NextResponse.json(
        { success: false, error: "无权限编辑此仪表盘" },
        { status: 403 }
      );
    }

    const dashboard = await prisma.dashboard.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        config: body.config,
      },
    });

    return NextResponse.json({
      success: true,
      data: dashboard,
      message: "更新成功",
    });
  } catch (error) {
    console.error("[DASHBOARD_PUT]", error);
    return NextResponse.json(
      { success: false, error: "更新仪表盘失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.dashboard.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "仪表盘不存在" },
        { status: 404 }
      );
    }

    if (existing.userId !== (session.user as any).id) {
      return NextResponse.json(
        { success: false, error: "无权限删除此仪表盘" },
        { status: 403 }
      );
    }

    await prisma.dashboard.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("[DASHBOARD_DELETE]", error);
    return NextResponse.json(
      { success: false, error: "删除仪表盘失败" },
      { status: 500 }
    );
  }
}
