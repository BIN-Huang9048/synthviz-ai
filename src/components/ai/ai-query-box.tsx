/**
 * AI 智能查询 v2 — 选数据集 → 自然语言 → AI 处理 → 图表渲染
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LineChartWidget, BarChartWidget, PieChartWidget, DataTableWidget } from "@/components/dashboard/charts";
import { Sparkles, RefreshCw, Lightbulb, X, Send, Database, AlertTriangle, Key } from "lucide-react";
import { hashColor as hashC } from "@/lib/utils";

type AIResult = { type: "line" | "bar" | "pie" | "table"; chartTitle: string; explanation: string; result: any[] };

export function AIQueryBox() {
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [selectedDs, setSelectedDs] = useState("");
  const [selectedTable, setSelectedTable] = useState(""); // DB 源选中的表
  const [dsTab, setDsTab] = useState<"file" | "db">("file");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasAIKeys, setHasAIKeys] = useState<boolean | null>(null); // null = 检查中

  useEffect(() => {
    fetch("/api/datasources").then((r) => r.json()).then((json) => { if (json.success) setDataSources(json.data || []); });
  }, []);

  // 检查是否已配置 AI 密钥
  useEffect(() => {
    fetch("/api/user/ai-keys").then((r) => r.json()).then((json) => {
      if (json.success) {
        const hasStored = (json.data || []).some((p: any) => p.configured);
        const hasLegacy = !!(json.legacyKeys?.openai || json.legacyKeys?.anthropic || json.legacyKeys?.deepseek);
        setHasAIKeys(hasStored || hasLegacy);
      } else setHasAIKeys(false);
    }).catch(() => setHasAIKeys(false));
  }, []);

  const fileSources = dataSources.filter((ds) => ds.type === "file");
  const dbSources = dataSources.filter((ds) => ds.type === "external_db");
  const selectedDbSource = dbSources.find((ds) => ds.id === selectedDs);
  const tableList: string[] = selectedDbSource?.dbSource?.tableList || [];

  // 是否已就绪可查询
  const ready = dsTab === "file" ? !!selectedDs : !!(selectedDs && selectedTable);

  async function handleQuery() {
    if (!ready) { setError(dsTab === "db" && selectedDs && !selectedTable ? "请选择数据库中的具体表" : "请先选择数据集"); return; }
    if (!question.trim() || question.trim().length < 2) { setError("请输入至少2个字的问题"); return; }
    setLoading(true); setError(""); setResult(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), dataSourceId: selectedDs, tableName: selectedTable || undefined }),
      });
      const json = await res.json();
      if (json.success) setResult(json.data);
      else setError(json.error || "查询失败");
    } catch { setError("请求失败，请重试"); }
    finally { setLoading(false); }
  }

  function renderChart() {
    if (!result) return null;
    const { type, result: data } = result;
    if (!data || data.length === 0) return null;
    const numKeys = Object.keys(data[0]).filter((k) => typeof data[0][k] === "number");
    const labelKey = Object.keys(data[0]).find((k) => !numKeys.includes(k)) || Object.keys(data[0])[0];
    const series = numKeys.map((k) => ({ key: k, name: k, color: hashC(k) }));
    const columns = Object.keys(data[0]).map((k) => ({ key: k, header: k }));
    const barData = series.length === 1 ? data.map((d: any) => ({ ...d, fill: hashC(String(d[labelKey] || "")) })) : data;
    const pieData = data.map((d: any) => ({ ...d, color: d.color || hashC(String(d.name || d[labelKey] || "")) }));

    switch (type) {
      case "line": return <LineChartWidget data={data} lines={series.length > 0 ? series : [{ key: "value", name: "数值", color: hashC("v") }]} xAxisKey={labelKey} height={360} />;
      case "bar": return <BarChartWidget data={barData} bars={series.length > 0 ? series : [{ key: "value", name: "数值", color: hashC("v") }]} xAxisKey={labelKey} height={360} />;
      case "pie": return <PieChartWidget data={pieData} height={360} innerRadius={55} />;
      case "table": return <DataTableWidget data={data} columns={columns} height={360} />;
      default: return null;
    }
  }

  return (
    <Card className="border-violet-200 bg-violet-50/30 dark:border-violet-800 dark:bg-violet-950/20">
      <CardHeader>
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600" /><CardTitle className="text-violet-900 dark:text-violet-300">AI 智能查询</CardTitle></div>
        <p className="text-sm text-violet-600/70 dark:text-violet-400/70">选择数据集后用中文描述你想看的数据</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI 密钥未配置提醒 */}
        {hasAIKeys === false && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">未配置 AI 密钥</p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                查询将使用关键词匹配返回模拟数据。
                <Link href="/dashboard/settings/ai" className="ml-1 font-medium underline hover:text-amber-800 dark:hover:text-amber-200">前往配置 <Key className="inline h-3 w-3" /></Link>
              </p>
            </div>
          </div>
        )}

        {/* 数据集选择 */}
        <div className="space-y-2">
          {/* 类型切换 */}
          <div className="flex rounded-lg bg-violet-100/50 p-0.5 dark:bg-violet-900/20">
            <button onClick={() => { setDsTab("file"); setSelectedDs(""); setSelectedTable(""); }}
              className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                dsTab === "file" ? "bg-white text-violet-600 shadow-sm dark:bg-gray-800 dark:text-violet-400" : "text-gray-500"
              }`}>📄 文件</button>
            <button onClick={() => { setDsTab("db"); setSelectedDs(""); setSelectedTable(""); }}
              className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                dsTab === "db" ? "bg-white text-violet-600 shadow-sm dark:bg-gray-800 dark:text-violet-400" : "text-gray-500"
              }`}>🗄 数据库表</button>
          </div>

          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-violet-500 flex-shrink-0" />
            {dsTab === "file" ? (
              <select value={selectedDs} onChange={(e) => setSelectedDs(e.target.value)}
                className="flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="">选择文件数据集...</option>
                {fileSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>📄 {ds.name} ({ds.fileSource?.rowCount || "?"} 行)</option>
                ))}
              </select>
            ) : (
              <div className="flex-1 space-y-1.5">
                <select value={selectedDs} onChange={(e) => { setSelectedDs(e.target.value); setSelectedTable(""); }}
                  className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm dark:border-violet-700 dark:bg-gray-800 dark:text-gray-100">
                  <option value="">选择数据库...</option>
                  {dbSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>🗄 {ds.name} ({ds.dbSource?.dbType || "DB"})</option>
                  ))}
                </select>
                {selectedDs && tableList.length > 0 && (
                  <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full rounded-lg border border-violet-300 bg-violet-50/30 px-3 py-2 text-sm dark:border-violet-700 dark:bg-violet-950/20 dark:text-gray-100">
                    <option value="">选择数据表...</option>
                    {tableList.map((t: string) => (
                      <option key={t} value={t}>📋 {t}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 输入框 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              placeholder="例如：按日期统计销售额趋势"
              className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 pr-10 text-sm placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-violet-700 dark:bg-gray-800 dark:text-gray-100" />
            {question && <button onClick={() => { setQuestion(""); setResult(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
          </div>
          <Button onClick={handleQuery} isLoading={loading} disabled={!ready || !question.trim()}>
            <Send className="h-4 w-4" /><span className="hidden sm:inline">查询</span>
          </Button>
        </div>

        {/* 示例 */}
        {!result && !loading && (
          <div className="space-y-2">
            <p className="flex items-center gap-1 text-xs text-gray-400"><Lightbulb className="h-3 w-3" />试试：</p>
            <div className="flex flex-wrap gap-2">
              {["各产品销售额排名","按月统计订单量趋势","用户城市分布占比","查看最新数据明细"].map((q) => (
                <button key={q} onClick={() => setQuestion(q)} className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:bg-gray-800 dark:text-violet-400">{q}</button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white p-4 dark:border-violet-800 dark:bg-gray-800">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            <div><p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI 正在分析...</p><p className="text-xs text-gray-400">处理数据并生成查询结果</p></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30">
            {error} <button onClick={handleQuery} className="ml-2 underline text-xs">重试</button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div><h4 className="font-semibold text-gray-900 dark:text-white">{result.chartTitle}</h4><p className="mt-0.5 text-xs text-gray-500">{result.explanation}</p></div>
              <button onClick={handleQuery} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><RefreshCw className="h-4 w-4" /></button>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">{renderChart()}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
