/**
 * 仪表盘详情 - 客户端数据加载 + 组件网格渲染
 * 响应式布局: 1列(手机) → 2列(平板) → 自适应(桌面)
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { hashColor } from "@/lib/utils";
import { getCachedDashboard, setCachedDashboard, clearDashboardCache } from "@/lib/dashboard-cache";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  LineChartWidget, BarChartWidget, PieChartWidget, DataTableWidget,
} from "@/components/dashboard/charts";
import { StatCard } from "@/components/dashboard/charts/stat-card-widget";
import {
  ArrowLeft, RefreshCw, Trash2,
} from "lucide-react";

interface DashboardDetailViewProps {
  dashboardId: string;
  user: { name?: string | null; email?: string | null };
}

interface WidgetConfig {
  id: string;
  type: "LINE" | "BAR" | "PIE" | "TABLE" | "STAT";
  title: string;
  dataSource: { api: string; refreshInterval?: number };
  position: { x: number; y: number; w: number; h: number };
}

interface DashboardData {
  id: string;
  name: string;
  description: string | null;
  widgets: WidgetConfig[];
}

export function DashboardDetailView({
  dashboardId,
  user,
}: DashboardDetailViewProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [dataLoading, setDataLoading] = useState(true);

  // 数据源选择
  const [selectedDsId, setSelectedDsId] = useState<string>("");
  const [refreshMsg, setRefreshMsg] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}`);
      const json = await res.json();
      if (json.success) {
        setDashboard(json.data);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("加载看板失败:", err);
    } finally {
      setLoading(false);
    }
  }, [dashboardId, router]);

  const fetchWidgetData = useCallback(async (widgets: WidgetConfig[]) => {
    setDataLoading(true);
    const results: Record<string, any> = {};

    try {
      await Promise.all(
        widgets.map(async (w) => {
          try {
            const res = await fetch(w.dataSource.api);
            const json = await res.json();
            if (json.success) {
              results[w.id] = json.data;
            }
          } catch {
            results[w.id] = [];
          }
        })
      );
    } catch (err) {
      console.error("加载组件数据失败:", err);
    } finally {
      setWidgetData(results);
      setDataLoading(false);
    }
  }, []);

  const skipNextFetch = useRef(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchDashboard(); }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    if (dashboard?.widgets && !skipNextFetch.current) {
      // 看板已绑定数据源 → 由 handleRefreshData 统一提供数据（缓存/AI）
      // 跳过独立 API 拉取，避免两条数据路径并发竞态覆盖
      if (!(dashboard as any).dataSourceId) {
        fetchWidgetData(dashboard.widgets);
      }
    }
    skipNextFetch.current = false;
  }, [dashboard?.widgets]);

  const autoLoadedRef = useRef(false);
  // 看板已绑定数据源 → 每次打开都重新调用 AI 处理
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (dashboard && (dashboard as any).dataSourceId && !autoLoadedRef.current) {
      autoLoadedRef.current = true;
      setSelectedDsId((dashboard as any).dataSourceId);
      handleRefreshData((dashboard as any).dataSourceId);
    }
  }, [dashboard?.id]);

  async function handleRefreshData(dsId?: string, forceRefresh = false) {
    const sourceId = dsId || selectedDsId;

    // ─── 非强制刷新时优先读本地缓存（IndexedDB 异步读取） ───
    if (!forceRefresh) {
      const cached = await getCachedDashboard(dashboardId);
      if (cached) {
        const data: Record<string, any> = {};
        cached.widgets.forEach((w: any) => {
          data[w.widgetId] = { chartData: w.data, chartType: w.type };
        });
        setWidgetData(data);
        setRefreshMsg("从本地缓存加载");
        skipNextFetch.current = true;
        setTimeout(() => setRefreshMsg(""), 3000);
        setDataLoading(false);
        return;
      }
    }

    // 强制刷新时先清除旧缓存
    if (forceRefresh) {
      await clearDashboardCache(dashboardId);
    }

    // ─── 缓存未命中 → 调用 AI 接口 ───
    setDataLoading(true); setRefreshMsg("AI 正在处理数据...");
    try {
      const res = await fetch("/api/ai/process-data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardId, dataSourceId: sourceId || null }),
      });
      const json = await res.json();
      if (json.success) {
        const data: Record<string, any> = {};
        json.data.widgets.forEach((w: any) => { data[w.widgetId] = { chartData: w.data, chartType: w.type }; });
        setWidgetData(data);
        setRefreshMsg(json.data.message);
        skipNextFetch.current = true;

        // ─── AI 成功返回 → 写入本地缓存（IndexedDB 异步写入） ───
        await setCachedDashboard({
          dashboardId,
          widgets: json.data.widgets.map((w: any) => ({
            widgetId: w.widgetId,
            type: w.type,
            title: w.title,
            data: w.data,
          })),
          cachedAt: Date.now(),
        });

        setTimeout(() => setRefreshMsg(""), 3000);
      } else {
        setRefreshMsg(json.error || "处理失败");
        setTimeout(() => setRefreshMsg(""), 3000);
      }
    } catch { setRefreshMsg("请求失败"); setTimeout(() => setRefreshMsg(""), 3000); }
    finally { setDataLoading(false); }
  }

  async function handleDelete() {
    if (!dashboard || !confirm(`确定删除「${dashboard.name}」？`)) return;
    try {
      await fetch(`/api/dashboards/${dashboard.id}`, { method: "DELETE" });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("删除失败:", err);
    }
  }

  /** 渲染单个 widget — 按 AI 返回的 chartType + chartData */
  function renderWidget(widget: WidgetConfig) {
    const raw = widgetData[widget.id];
    const chartData = raw?.chartData || raw;
    const chartType = raw?.chartType || widget.type;

    if (dataLoading && !raw) {
      return <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /></div>;
    }
    if (!chartData || (Array.isArray(chartData) && chartData.length === 0)) return null;

    const numKeys = Object.keys(chartData[0] || {}).filter((k) => {
      const v = chartData[0][k];
      return typeof v === "number" || (typeof v === "string" && !isNaN(parseFloat(v)) && isFinite(Number(v)));
    });
    const labelKey = Object.keys(chartData[0] || {}).find((k) => !numKeys.includes(k)) || "name";
    const series = numKeys.map((k) => ({ key: k, name: k, color: hashColor(k) }));
    const columns = Object.keys(chartData[0] || {}).map((k) => ({ key: k, header: k, render: typeof chartData[0][k] === "number" ? (r: any) => r[k]?.toLocaleString?.() ?? String(r[k]) : undefined }));

    // BAR 单系列时给每个数据点注入独立颜色
    const barData = series.length === 1
      ? chartData.map((d: any) => ({ ...d, fill: hashColor(String(d[labelKey] || d.name || "")) }))
      : chartData;
    // PIE 注入颜色（后端可能未带 color 字段）
    const pieData = chartData.map((d: any) => ({ ...d, color: d.color || hashColor(String(d.name || d[labelKey] || "")) }));

    switch (chartType) {
      case "LINE":
        return <LineChartWidget data={chartData} lines={series.length > 0 ? series : [{ key: "value", name: "数值", color: hashColor("value") }]} xAxisKey={labelKey} height={240} />;
      case "BAR":
        return <BarChartWidget data={barData} bars={series.length > 0 ? series : [{ key: "value", name: "数值", color: hashColor("value") }]} xAxisKey={labelKey} height={240} />;
      case "PIE":
        return <PieChartWidget data={pieData} height={240} innerRadius={45} showLabel={false} />;
      case "TABLE":
        return <DataTableWidget data={chartData} columns={columns.length > 0 ? columns : [{ key: "name", header: "名称" }, { key: "value", header: "数值" }]} height={280} />;
      case "STAT":
        return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{(chartData as any[]).slice(0, 4).map((kpi: any, i: number) => <StatCard key={kpi.name || i} name={kpi.name} value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />)}</div>;
      default:
        return null;
    }
  }

  if (loading || (autoLoadedRef.current && dataLoading)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        <p className="text-sm text-gray-500">AI 正在处理数据，图表渲染中...</p>
      </div>
    );
  }

  if (!dashboard) return null;

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
          {/* 顶部导航栏 */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {dashboard.name}
                </h1>
                {dashboard.description && (
                  <p className="mt-0.5 text-sm text-gray-500">{dashboard.description}</p>
                )}
                {refreshMsg && (
                  <span className={`mt-1 block text-xs ${refreshMsg.includes("缓存") ? "text-blue-600" : "text-green-600"}`}>
                    {refreshMsg}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => handleRefreshData(undefined, true)}
                title="强制 AI 重新生成并更新缓存"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> 刷新数据
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-1.5 h-4 w-4" /> 删除
              </Button>
            </div>
          </div>

          {/* Widget 网格 - 响应式 */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-12">
            {dashboard.widgets.map((widget) => {
              // 动态列宽：读取 AI 返回的 position.w（12列网格），兜底按类型分配
              const posW = (widget.position as any)?.w;
              const colSpan = posW
                ? `xl:col-span-${Math.min(Math.max(posW, 1), 12)}`
                : widget.type === "STAT" || widget.type === "TABLE"
                  ? "xl:col-span-12"
                  : "xl:col-span-6";

              return (
                <Card key={widget.id} className={colSpan}>
                  <CardHeader>
                    <CardTitle>{widget.title}</CardTitle>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                      {widget.type}
                    </span>
                  </CardHeader>
                  <CardContent>{renderWidget(widget)}</CardContent>
                </Card>
              );
            })}

          </div>
        </div>
      </main>
    </div>
  );
}
