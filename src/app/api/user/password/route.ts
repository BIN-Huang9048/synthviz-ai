/**
 * 密码修改 API
 * PUT /api/user/password
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { compare, hash } from "bcryptjs";
import prisma from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "新密码至少 6 位" }, { status: 400 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) return NextResponse.json({ success: false, error: "当前密码不正确" }, { status: 400 });

    const newHash = await hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    return NextResponse.json({ success: true, message: "密码修改成功" });
  } catch (err) {
    console.error("[PASSWORD_PUT]", err);
    return NextResponse.json({ success: false, error: "修改失败" }, { status: 500 });
  }
}