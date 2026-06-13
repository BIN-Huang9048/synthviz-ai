/**
 * AI 数据分析 API (v2 — 用户私钥)
 * POST /api/ai/analyze
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callAIWithUserKeys, userHasAIKeys } from "@/lib/ai-user";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    if (!(await userHasAIKeys(userId))) {
      return NextResponse.json({
        success: false, error: "请先在个人中心配置 AI 密钥",
        redirectTo: "/dashboard/settings/ai",
      }, { status: 400 });
    }

    const { dashboardName, dataSummary } = await request.json();
    if (!dashboardName || !dataSummary) {
      return NextResponse.json({ success: false, error: "缺少看板名称或数据摘要" }, { status: 400 });
    }

    const summaryText = typeof dataSummary === "string" ? dataSummary : JSON.stringify(dataSummary, null, 2);

    const result = await callAIWithUserKeys(userId, [
      {
        role: "system",
        content: `你是资深数据分析师。分析以下看板数据，返回 JSON:
{
  "summary": "100 字以内概览",
  "insights": ["发现1", "发现2", "发现3"],
  "anomalies": ["异常1", "异常2"],
  "recommendations": ["建议1", "建议2", "建议3"]
}
只返回 JSON，不要 markdown。`,
      },
      { role: "user", content: `看板: "${dashboardName}"\n数据: ${summaryText}` },
    ], { temperature: 0.5 });

    const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").replace(/[\x00-\x1F]/g, " ").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // 尝试截取到最后一个完整的 }
      const end = cleaned.lastIndexOf("}");
      if (end > 0) {
        try { parsed = JSON.parse(cleaned.slice(0, end + 1)); } catch { /* fall through */ }
      }
      if (!parsed) {
        parsed = { summary: "AI 分析结果解析失败，请重试", insights: [], anomalies: [], recommendations: [] };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: parsed.summary || "分析完成",
        insights: parsed.insights || [],
        anomalies: parsed.anomalies || [],
        recommendations: parsed.recommendations || [],
      },
    });
  } catch (err: any) {
    console.error("[AI_ANALYZE]", err);
    return NextResponse.json({ success: false, error: err.message || "AI 分析失败" }, { status: 500 });
  }
}
