/**
 * 仪表盘列表组件
 * 展示用户所有看板，支持创建/编辑/删除
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3, Pencil, Trash2, ExternalLink, Clock, LayoutGrid, CheckSquare, Square,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DashboardItem {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  updatedAt: string;
  _count?: { widgets: number };
  team?: { name: string };
}

interface DashboardListProps {
  onRefresh?: () => void;
}

export function DashboardList({ onRefresh }: DashboardListProps) {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteMsg, setDeleteMsg] = useState("");

  const fetchDashboards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboards");
      const json = await res.json();
      if (json.success) {
        setDashboards(json.data);
      }
    } catch (err) {
      console.error("加载看板列表失败:", err);
    } finally {
      setLoading(false);
      onRefresh?.();
    }
  }, [onRefresh]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDashboards(); }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setDeleteMsg("");
  }

  function toggleAll() {
    if (selected.size === dashboards.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(dashboards.map((d) => d.id)));
    }
    setDeleteMsg("");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定要删除看板「${name}」吗？此操作不可撤销。`)) return;
    try {
      const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDashboards((prev) => prev.filter((d) => d.id !== id));
        setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    } catch (err) { console.error("删除失败:", err); }
  }

  async function handleBatchDelete() {
    if (selected.size === 0) { setDeleteMsg("请至少选中一个看板"); return; }
    if (!confirm(`确定删除选中的 ${selected.size} 个看板吗？此操作不可撤销。`)) return;
    setDeleteMsg("");

    let count = 0;
    for (const id of selected) {
      try {
        const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) count++;
      } catch {}
    }
    setDashboards((prev) => prev.filter((d) => !selected.has(d.id)));
    setSelected(new Set());
    if (count > 0) setDeleteMsg(`已删除 ${count} 个看板`);
    setTimeout(() => setDeleteMsg(""), 3000);
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent>
              <div className="animate-pulse space-y-3 py-2">
                <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-48 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="h-16 w-16 text-gray-300 dark:text-slate-600" />
        <h3 className="mt-4 text-lg font-medium text-gray-500 dark:text-slate-400">暂无看板</h3>
        <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
          创建你的第一个数据看板开始可视化之旅
        </p>
        <Button
          className="mt-6"
          onClick={() => router.push("/dashboard/ai-create")}
        >
          创建看板
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* 批量操作栏 */}
      <div className="mb-3 flex items-center gap-3">
        <button onClick={toggleAll} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 transition-colors">
          {selected.size === dashboards.length && dashboards.length > 0
            ? <CheckSquare className="h-4 w-4 text-violet-600" />
            : <Square className="h-4 w-4" />}
          全选 ({selected.size}/{dashboards.length})
        </button>
        {selected.size > 0 && (
          <Button size="sm" variant="danger" onClick={handleBatchDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除选中 ({selected.size})
          </Button>
        )}
        {deleteMsg && (
          <span className={`text-xs ${deleteMsg.includes("请") ? "text-amber-500" : "text-green-600"}`}>{deleteMsg}</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((db) => (
          <Card
            key={db.id}
            className={`group relative transition-shadow hover:shadow-md ${selected.has(db.id) ? "ring-2 ring-violet-400" : ""}`}
          >
            {/* 多选复选框 */}
            <button onClick={() => toggleSelect(db.id)} className="absolute top-3 left-3 z-10 rounded p-0.5 text-gray-400 hover:text-violet-600 transition-colors">
              {selected.has(db.id) ? <CheckSquare className="h-4 w-4 text-violet-600" /> : <Square className="h-4 w-4" />}
            </button>

            <CardContent className="py-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/${db.id}`}
                    className="block"
                  >
                    <h3 className="truncate text-base font-semibold text-gray-900 hover:text-violet-600 dark:text-slate-100 dark:hover:text-violet-400 transition-colors">
                      {db.name}
                    </h3>
                  </Link>
                  {db.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-slate-400">
                      {db.description}
                    </p>
                  )}
                </div>

                {/* 操作菜单 */}
                <div className="ml-2 flex opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleDelete(db.id, db.name)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/dashboard/${db.id}`}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
                    title="打开"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* 元信息 */}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
                {db.team && (
                  <span className="flex items-center gap-1">
                    <LayoutGrid className="h-3 w-3" />
                    {db.team.name}
                  </span>
                )}
                {db._count && (
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {db._count.widgets} 组件
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(db.updatedAt, { month: "short", day: "numeric" })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </>
  );
}
