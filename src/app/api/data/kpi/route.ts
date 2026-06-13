/**
 * 模拟数据 API - 核心指标 KPI
 * GET /api/data/kpi
 */
import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((r) => setTimeout(r, 150));

  const kpis = [
    {
      id: "revenue",
      name: "总收入",
      value: 128430,
      prefix: "¥",
      suffix: "",
      change: 12.5,
      changeLabel: "vs 上月",
      trend: "up" as const,
    },
    {
      id: "users",
      name: "活跃用户",
      value: 2847,
      prefix: "",
      suffix: "",
      change: 8.2,
      changeLabel: "vs 上月",
      trend: "up" as const,
    },
    {
      id: "conversion",
      name: "转化率",
      value: 3.24,
      prefix: "",
      suffix: "%",
      change: -0.4,
      changeLabel: "vs 上月",
      trend: "down" as const,
    },
    {
      id: "dashboards",
      name: "活跃看板",
      value: 24,
      prefix: "",
      suffix: "",
      change: 2,
      changeLabel: "vs 上周",
      trend: "up" as const,
    },
  ];

  return NextResponse.json({
    success: true,
    data: kpis,
    meta: { updatedAt: new Date().toISOString() },
  });
}
