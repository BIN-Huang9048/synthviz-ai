/**
 * 用户个人信息 API
 * PUT /api/user/profile - 更新姓名
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ success: false, error: "姓名不能为空" }, { status: 400 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    await prisma.user.update({ where: { id: userId }, data: { name } });

    return NextResponse.json({ success: true, message: "更新成功" });
  } catch (err) {
    console.error("[PROFILE_PUT]", err);
    return NextResponse.json({ success: false, error: "更新失败" }, { status: 500 });
  }
}