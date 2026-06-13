/**
 * 柱状图组件 - 基于 Recharts
 * 用于多组数据对比展示
 */
"use client";

import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface BarChartWidgetProps {
  data: Record<string, any>[];
  bars: { key: string; name: string; color: string }[];
  xAxisKey?: string;
  height?: number;
  layout?: "vertical" | "horizontal";
  showLegend?: boolean;
}

export function BarChartWidget({
  data,
  bars,
  xAxisKey = "name",
  height = 300,
  layout = "horizontal",
  showLegend = true,
}: BarChartWidgetProps) {
  if (!data || data.length === 0) return null;

  const isVertical = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={Math.max(height, data.length * (isVertical ? 40 : 0) + 60)}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 20, left: 10, bottom: data.length > 12 ? 40 : 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={!isVertical} vertical={isVertical} />
        <XAxis type={isVertical ? "number" : "category"} dataKey={isVertical ? undefined : xAxisKey} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} interval={data.length > 20 ? Math.floor(data.length / 10) : 0} angle={data.length > 12 ? -35 : 0} textAnchor={data.length > 12 ? "end" : "middle"} height={data.length > 12 ? 60 : 30} />
        <YAxis type={isVertical ? "category" : "number"} dataKey={isVertical ? xAxisKey : undefined} tick={{ fontSize: 12, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={isVertical ? 90 : 40} />
        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }} />
        {showLegend && <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />}
        {bars.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.name} radius={[4, 4, 0, 0]} maxBarSize={40}>
            {bars.length === 1 && data.map((entry: any, idx: number) => (
              <Cell key={idx} fill={entry.fill || bar.color} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
