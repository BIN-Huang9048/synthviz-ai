/**
 * 用户注册 API
 * POST /api/auth/register
 */
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(1, "请输入姓名"),
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "输入数据无效", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // 检查邮箱是否已注册
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "该邮箱已注册" },
        { status: 409 }
      );
    }

    // 创建用户
    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "MEMBER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: user, message: "注册成功" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
