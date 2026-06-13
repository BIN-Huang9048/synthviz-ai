/**
 * 测试用户 AI 密钥连接
 * POST /api/user/ai-keys/test
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callAIWithUserKeys, userHasAIKeys } from "@/lib/ai-user";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

  const userId = (session.user as Record<string, unknown>).id as string;

  if (!(await userHasAIKeys(userId))) {
    return NextResponse.json({ success: false, error: "未配置任何 AI 密钥" }, { status: 400 });
  }

  try {
    const result = await callAIWithUserKeys(userId, [
      { role: "user", content: "回复 OK" },
    ], { maxTokens: 10 });

    return NextResponse.json({ success: true, message: "AI 连接正常", data: { reply: result.slice(0, 50) } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "连接失败" }, { status: 502 });
  }
}