/**
 * 饼图组件 - 基于 Recharts
 * 自适应标签/图例，避免文字重叠
 */
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PieChartWidgetProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
  innerRadius?: number;
  showLabel?: boolean;
  showLegend?: boolean;
}

const RADIAN = Math.PI / 180;

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  if (percent < 0.03) return null; // <3% 不标
  const radius = innerRadius + (outerRadius - innerRadius) * 1.35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
      {name.length > 6 ? name.slice(0, 5) + "…" : name} {(percent * 100).toFixed(0)}%
    </text>
  );
}

export function PieChartWidget({ data, height = 320, innerRadius = 55, showLabel = true, showLegend = true }: PieChartWidgetProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // 多分类时禁用外部标签，仅靠 legend
  const manySlices = data.length > 6;
  const useLabel = showLabel && !manySlices;
  const legendH = Math.ceil(data.length / 3) * 22 + 10;

  return (
    <ResponsiveContainer width="100%" height={height + legendH}>
      <PieChart>
        <Pie data={data} cx="50%" cy="45%" innerRadius={innerRadius} outerRadius={innerRadius + 55} paddingAngle={1} dataKey="value"
          label={useLabel ? renderCustomLabel : false} labelLine={useLabel}>
          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(v: any) => Number(v).toLocaleString("zh-CN")} />
        {showLegend && (
          <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "#64748b", paddingTop: 8 }}
            formatter={(value: string) => <span style={{ fontSize: 11 }}>{value.length > 8 ? value.slice(0, 7) + "…" : value}</span>} />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
