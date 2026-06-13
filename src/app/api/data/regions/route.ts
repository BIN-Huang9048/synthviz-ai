/**
 * 模拟数据 API - 用户地域分布
 * GET /api/data/regions
 */
import { NextResponse } from "next/server";

const regions = [
  { name: "华东", color: "#7C3AED" },
  { name: "华南", color: "#3B82F6" },
  { name: "华北", color: "#10B981" },
  { name: "西南", color: "#F59E0B" },
  { name: "华中", color: "#EF4444" },
  { name: "东北", color: "#8B5CF6" },
  { name: "西北", color: "#EC4899" },
  { name: "海外", color: "#06B6D4" },
];

export async function GET() {
  await new Promise((r) => setTimeout(r, 200));

  const data = regions.map((r) => ({
    ...r,
    value: Math.floor(200 + Math.random() * 3800),
  }));

  return NextResponse.json({
    success: true,
    data,
    meta: { total: data.length, updatedAt: new Date().toISOString() },
  });
}
