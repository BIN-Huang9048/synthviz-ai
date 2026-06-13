import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const userId = (session.user as Record<string, unknown>).id as string;
  const { id } = await params;

  const ds = await prisma.dataSource.findUnique({ where: { id }, select: { userId: true } });
  if (!ds) return NextResponse.json({ success: false, error: "数据源不存在" }, { status: 404 });
  if (ds.userId !== userId) return NextResponse.json({ success: false, error: "无权操作" }, { status: 403 });

  await prisma.dataSource.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "已删除" });
}
