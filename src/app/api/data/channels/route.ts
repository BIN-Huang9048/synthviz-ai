/**
 * 模拟数据 API - 各渠道来源统计
 * GET /api/data/channels
 */
import { NextResponse } from "next/server";

const channels = [
  { name: "直接访问", color: "#7C3AED" },
  { name: "搜索引擎", color: "#3B82F6" },
  { name: "社交媒体", color: "#10B981" },
  { name: "邮件营销", color: "#F59E0B" },
  { name: "付费广告", color: "#EF4444" },
  { name: "合作伙伴", color: "#8B5CF6" },
  { name: "自然推荐", color: "#EC4899" },
];

export async function GET() {
  await new Promise((r) => setTimeout(r, 250));

  const data = channels.map((ch) => ({
    ...ch,
    visitors: Math.floor(500 + Math.random() * 4500),
    conversions: Math.floor(10 + Math.random() * 200),
    bounceRate: Math.round((30 + Math.random() * 40) * 10) / 10,
  }));

  return NextResponse.json({
    success: true,
    data,
    meta: { total: data.length, updatedAt: new Date().toISOString() },
  });
}
