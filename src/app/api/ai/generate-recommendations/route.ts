/**
 * AI 可视化需求推荐 API
 * POST /api/ai/generate-recommendations
 * Body: { fieldNames: "会员类型(category), 年龄(number), ..." }
 * AI 根据字段标签生成强相关的可视化建议
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { fieldNames } = await request.json();
    if (!fieldNames) return NextResponse.json({ success: false, error: "缺少字段信息" }, { status: 400 });

    // 尝试用 AI 生成（有密钥时）
    try {
      const { callAIWithUserKeys, userHasAIKeys } = await import("@/lib/ai-user");
      if (await userHasAIKeys(userId)) {
        const resp = await callAIWithUserKeys(userId, [
          { role: "system", content: `你是数据分析师。根据数据集字段，生成5-10个实用且有价值的可视化方向。每条方向严格基于给定字段，禁止编造无关内容。返回JSON数组:["建议1","建议2",...]。只返回JSON。` },
          { role: "user", content: `字段: ${fieldNames}\n请生成和这些字段强相关的可视化方向。` },
        ], { temperature: 0.5, maxTokens: 400 });
        try {
          const arr = JSON.parse(resp.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
          if (Array.isArray(arr)) {
            return NextResponse.json({ success: true, data: { recommendations: arr } });
          }
        } catch {}
      }
    } catch { /* AI不可用→降级 */ }

    // 本地降级
    const names = fieldNames.split(",").map((s: string) => s.split("(")[0].trim());
    const defaults = names.map((n: string) => {
      if (/时间|日期|下单/i.test(n)) return `${n}趋势`;
      if (/金额|收入|成本|利润|价格/i.test(n)) return `${n}统计`;
      return `${n}分布`;
    }).slice(0, 10);

    return NextResponse.json({ success: true, data: { recommendations: defaults } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
