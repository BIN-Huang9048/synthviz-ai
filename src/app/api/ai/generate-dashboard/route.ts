/**
 * AI 生成仪表盘 API v4 — 按需生成组件（无固定模板）
 * POST /api/ai/generate-dashboard
 *
 * 规则:
 * 1. 仅根据用户选中的 widgetTags 生成对应组件，不额外添加
 * 2. 图表类型按标签语义自动匹配（分布→PIE, 趋势→LINE, 对比→BAR, 统计/指标→STAT, 列表/明细→TABLE）
 * 3. 组件位置自动编排（12列网格，STAT全宽12，其余半宽6，依次排列）
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── 标签语义 → 图表类型映射 ─────────────────────────
function tagToWidgetType(tag: string): "LINE" | "BAR" | "PIE" | "TABLE" | "STAT" {
  if (/统计|指标|概览|总览|KPI|汇总/i.test(tag)) return "STAT";
  if (/趋势|走势|变化|增长|下降|波动/i.test(tag)) return "LINE";
  if (/对比|比较|排行|排名|TOP/i.test(tag)) return "BAR";
  if (/分布|占比|比例|份额|构成|结构/i.test(tag)) return "PIE";
  if (/明细|列表|表格|清单|记录/i.test(tag)) return "TABLE";
  // 推断：含"量""额""数"→STAT，含"分"→PIE，含"比"→BAR，默认LINE
  if (/量|额|数/i.test(tag)) return "STAT";
  if (/分/i.test(tag)) return "PIE";
  if (/比/i.test(tag)) return "BAR";
  return "BAR";
}

// ─── 自动编排布局 ────────────────────────────────────
function layoutWidgets(tags: string[]): Array<{ type: string; title: string; position: { x: number; y: number; w: number; h: number } }> {
  const widgets: any[] = [];
  let y = 0;
  tags.forEach((tag, i) => {
    const type = tagToWidgetType(tag);
    const isFullWidth = type === "STAT" || type === "TABLE";
    const w = isFullWidth ? 12 : 6;
    // 每个组件 y 坐标累加（每行 12 列）
    if (i > 0) {
      const prev = widgets[i - 1];
      if (prev.position.w === 12 || (i % 2 === 0 && prev.position.w === 6)) {
        y = prev.position.y + prev.position.h;
      }
    }
    widgets.push({ type, title: tag, position: { x: 0, y, w, h: type === "STAT" ? 3 : 6 } });
    // 同行放两个半宽组件
    if (w === 6 && i > 0 && widgets[i - 1].position.w === 6 && widgets[i - 1].position.y === y) {
      widgets[i].position.x = 6;
      widgets[i].position.y = y;
    }
  });
  return widgets;
}

// ─── POST ────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { description, dataSourceId, name, widgetTags, teamId: specifiedTeamId } = await request.json();
    const tags: string[] = widgetTags?.length ? widgetTags : [];
    if (tags.length === 0 && (!description || description.trim().length < 3)) {
      return NextResponse.json({ success: false, error: "请至少选择一项可视化需求或输入描述" }, { status: 400 });
    }

    // ─── 仅根据用户标签生成组件 ───
    let widgets = tags.length > 0 ? layoutWidgets(tags) : layoutWidgets([description]);

    // AI 有密钥时，用 AI 优化类型匹配
    try {
      const { callAIWithUserKeys, userHasAIKeys } = await import("@/lib/ai-user");
      if (await userHasAIKeys(userId) && tags.length > 0) {
        const result = await callAIWithUserKeys(userId, [
          { role: "system", content: `用户选中了以下可视化需求标签。为每个标签选择最适合的图表类型，返回JSON数组（只返回JSON）：
[{"type":"LINE|BAR|PIE|TABLE|STAT","title":"标签原文","position":{"w":6|12,"h":3|6}}]
规则: 趋势→LINE, 分布/占比→PIE, 对比/排行→BAR, 指标/统计→STAT, 明细/列表→TABLE。STAT/TABLE全宽(w:12,h:3),其余半宽(w:6,h:6)。` },
          { role: "user", content: `标签: ${JSON.stringify(tags)}` },
        ], { temperature: 0.3, maxTokens: 400 });
        const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            widgets = parsed.map((w: any) => ({ type: w.type, title: w.title || w.type, position: w.position || { x: 0, y: 0, w: 6, h: 6 } }));
          }
        } catch {}
      }
    } catch { /* 本地匹配兜底 */ }

    // ─── 获取或创建团队 ───
    let teamId: string;
    if (specifiedTeamId) {
      teamId = specifiedTeamId;
    } else {
      const existingTeam = await prisma.team.findFirst({ where: { ownerId: userId }, select: { id: true } });
      if (existingTeam) { teamId = existingTeam.id; }
      else {
        const t = await prisma.team.create({ data: { name: `${session.user.name || "用户"} 的团队`, ownerId: userId, members: { create: { userId, role: "OWNER" } } } });
        teamId = t.id;
      }
    }

    // ─── 创建看板（仅含用户选中的组件） ───
    const dashboard = await prisma.dashboard.create({
      data: {
        name: name || tags.slice(0, 2).join("·") || "AI 智能看板",
        description: description || tags.join("、"),
        teamId, userId,
        dataSourceId: dataSourceId || null,
        config: { layout: "grid", theme: "light", userDescription: description, widgetTags: tags },
        widgets: {
          create: widgets.map((w: any) => ({
            type: w.type, title: w.title,
            dataSource: {},
            position: w.position || { x: 0, y: 0, w: 12, h: 6 },
          })),
        },
      },
      include: { widgets: true },
    });

    return NextResponse.json({
      success: true,
      data: { dashboard, message: `已创建看板，包含 ${widgets.length} 个组件` },
    }, { status: 201 });
  } catch (err: any) {
    console.error("[AI_GENERATE_V4]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
