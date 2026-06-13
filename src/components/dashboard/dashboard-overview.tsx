/**
 * 仪表盘总览 - 客户端数据获取 + 图表渲染
 * 替代原先静态占位的 dashboard-shell
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { DashboardList } from "@/components/dashboard/dashboard-list";
import { AIQueryBox } from "@/components/ai/ai-query-box";
import { BarChart3, LayoutDashboard, Database } from "lucide-react";

interface DashboardOverviewProps {
  user: { name?: string | null; email?: string | null };
}

export function DashboardOverview({ user }: DashboardOverviewProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "dashboards">("overview");
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        user={user ? { name: user.name || null, email: user.email || "" } : null}
      />

      <main
        className="pt-16 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? "68px" : "256px" }}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          {/* 页面标题 + 操作 */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                数据仪表盘
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                今日数据总览 · {new Date().toLocaleDateString("zh-CN")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab 切换 */}
              <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                <button onClick={() => setActiveTab("overview")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === "overview" ? "bg-white text-violet-600 shadow-sm dark:bg-gray-700 dark:text-violet-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}>
                  <LayoutDashboard className="mr-1.5 inline h-4 w-4" /> 总览
                </button>
                <button onClick={() => setActiveTab("dashboards")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === "dashboards" ? "bg-white text-violet-600 shadow-sm dark:bg-gray-700 dark:text-violet-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}>
                  <BarChart3 className="mr-1.5 inline h-4 w-4" /> 我的看板
                </button>
              </div>

            </div>
          </div>

          {activeTab === "overview" ? (
            <>
              <div className="mb-6">
                <AIQueryBox />
              </div>
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Database className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-lg font-medium text-gray-500">暂无数据展示</p>
                <p className="mt-1 text-sm text-gray-400">
                  上传 CSV 文件或连接外部数据库，然后在看板详情页绑定数据源即可展示
                </p>
                <Link href="/dashboard/datasources" className="mt-4 text-sm text-violet-600 hover:text-violet-500 font-medium">
                  前往数据源管理 →
                </Link>
              </div>
            </>
          ) : (
            /* 看板列表视图 */
            <DashboardList
              onRefresh={() => {}}
            />
          )}

        </div>
      </main>
    </div>
  );
}

