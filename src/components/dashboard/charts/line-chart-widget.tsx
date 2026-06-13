/**
 * 折线图组件 - 基于 Recharts
 * 用于展示时间序列数据趋势
 */
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface LineChartWidgetProps {
  data: Record<string, any>[];
  lines: { key: string; name: string; color: string }[];
  xAxisKey?: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

export function LineChartWidget({
  data,
  lines,
  xAxisKey = "month",
  height = 300,
  showLegend = true,
  showGrid = true,
}: LineChartWidgetProps) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height + (data.length > 12 ? 40 : 0)}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: data.length > 12 ? 20 : 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />}
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} interval={data.length > 20 ? Math.floor(data.length / 10) : 0} angle={data.length > 12 ? -35 : 0} textAnchor={data.length > 12 ? "end" : "middle"} height={data.length > 12 ? 60 : 30} />
        <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v} />
        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }} formatter={(value: any) => `¥${Number(value).toLocaleString("zh-CN")}`} />
        {showLegend && <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />}
        {lines.map((line) => (
          <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

