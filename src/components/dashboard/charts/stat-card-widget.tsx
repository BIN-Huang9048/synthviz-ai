/**
 * 统计卡片组件
 * 用于关键指标 (KPI) 展示
 */
"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  name: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down";
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({
  name,
  value,
  prefix = "",
  suffix = "",
  change,
  changeLabel = "vs 上月",
  trend,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
              {name}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {prefix}
              {typeof value === "number"
                ? value.toLocaleString("zh-CN")
                : value}
              {suffix}
            </p>
          </div>
          {Icon && (
            <div className="ml-2 flex-shrink-0 rounded-lg bg-violet-50 p-2 dark:bg-violet-900/20">
              <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          )}
        </div>

        {change !== undefined && trend && (
          <div className="mt-3 flex items-center gap-1">
            {trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                trend === "up"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {trend === "up" ? "+" : ""}
              {change}%
            </span>
            <span className="text-sm text-gray-400">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </CardContent>
    </Card>
  );
}
