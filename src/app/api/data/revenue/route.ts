/**
 * 模拟数据 API - 月度收入趋势
 * GET /api/data/revenue?range=12&filter=all
 */
import { NextResponse } from "next/server";

function generateRevenueData(months: number) {
  const data = [];
  const now = new Date();
  let baseRevenue = 85000;

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    // 模拟增长趋势 + 随机波动
    const growth = 1 + (months - i) * 0.03;
    const noise = 0.85 + Math.random() * 0.3;
    const revenue = Math.round(baseRevenue * growth * noise);
    const cost = Math.round(revenue * (0.55 + Math.random() * 0.15));
    const profit = revenue - cost;

    data.push({
      month: monthLabel,
      收入: revenue,
      成本: cost,
      利润: profit,
    });
  }
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = parseInt(searchParams.get("range") || "12");
  const months = Math.min(Math.max(range, 3), 24);

  // 模拟网络延迟
  await new Promise((r) => setTimeout(r, 300));

  const data = generateRevenueData(months);

  return NextResponse.json({
    success: true,
    data,
    meta: { total: data.length, unit: "CNY", updatedAt: new Date().toISOString() },
  });
}
