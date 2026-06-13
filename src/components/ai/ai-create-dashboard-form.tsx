/**
 * AI 创建仪表盘表单 v4
 * 流程: 选数据集 → AI分析字段生成推荐 → 用户自定义名称+勾选需求 → 一键生成+处理+渲染
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Sparkles, Wand2, Check, ChevronDown, ChevronUp, Database, Hash, Calendar, Tag, Type, FileText, Users, AlertTriangle, Key } from "lucide-react";
import { setCachedDashboard } from "@/lib/dashboard-cache";

type FieldInfo = { name: string; type: "date" | "number" | "category" | "text" };

const TYPE_ICONS: Record<string, typeof Hash> = { date: Calendar, number: Hash, category: Tag, text: Type };
const typeColors: Record<string, string> = {
  date: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  number: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  category: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  text: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const NUM_KEYS = /金额|价格|收入|成本|利润|数量|销量|人数|金额|总额|总计|平均|amount|price|cost|qty|rate|sum|avg|count/i;
const DATE_KEYS = /时间|日期|date|time|下单|创建|年|月/i;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function analyzeFieldsLocal(headers: string[], sampleValues: string[][]): FieldInfo[] {
  return headers.map((name, ci) => {
    if (DATE_KEYS.test(name)) return { name, type: "date" };
    if (NUM_KEYS.test(name)) return { name, type: "number" };
    const samples = sampleValues.map((r) => r[ci]).filter(Boolean);
    const numCount = samples.filter((v) => !isNaN(parseFloat(v))).length;
    if (numCount > samples.length * 0.6) return { name, type: "number" };
    if (samples.length <= 30) return { name, type: "category" };
    return { name, type: "text" };
  });
}

export function AICreateDashboardForm() {
  const router = useRouter();
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [selectedDsId, setSelectedDsId] = useState("");
  const [selectedTable, setSelectedTable] = useState(""); // DB 源选中的具体表
  const [dsTab, setDsTab] = useState<"file" | "db">("file"); // 数据源类型切换
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [dashName, setDashName] = useState("AI 智能看板");
  const [joinTeam, setJoinTeam] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [customReq, setCustomReq] = useState("");
  const [showFields, setShowFields] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"config" | "generating" | "processing">("config");
  const [hasAIKeys, setHasAIKeys] = useState<boolean | null>(null); // null = 检查中

  // 分类数据源
  const fileSources = dataSources.filter((ds) => ds.type === "file");
  const dbSources = dataSources.filter((ds) => ds.type === "external_db");
  // 当前选中 DB 源的表列表
  const selectedDbSource = dbSources.find((ds) => ds.id === selectedDsId);
  const tableList: string[] = selectedDbSource?.dbSource?.tableList || [];

  useEffect(() => {
    fetch("/api/datasources").then((r) => r.json()).then((json) => { if (json.success) setDataSources(json.data || []); });
    fetch("/api/teams").then((r) => r.json()).then((json) => { if (json.success) setTeams(json.data || []); });
    // 检查是否已配置 AI 密钥
    fetch("/api/user/ai-keys").then((r) => r.json()).then((json) => {
      if (json.success) {
        const hasStored = (json.data || []).some((p: any) => p.configured);
        const hasLegacy = !!(json.legacyKeys?.openai || json.legacyKeys?.anthropic || json.legacyKeys?.deepseek);
        setHasAIKeys(hasStored || hasLegacy);
      } else setHasAIKeys(false);
    }).catch(() => setHasAIKeys(false));
  }, []);

  // 选择数据源 → 用 AI 生成推荐（支持表级选择）
  async function handleSelectDs(id: string, tableName?: string) {
    setSelectedDsId(id);
    setRecommendations([]);
    setSelectedOptions(new Set());
    if (!id) return;
    // DB 源未选表时不触发分析
    const ds = dataSources.find((d) => d.id === id);
    if (ds?.type === "external_db" && !tableName) return;
    setRecLoading(true);
    try {
      const res = await fetch("/api/ai/analyze-fields", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: id, tableName: tableName || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        const f = json.data.fields as FieldInfo[];
        setFields(f);
        setPreviewData(json.data.sampleData?.slice(0, 5) || []);
        setDashName(json.data.sourceName || "AI 智能看板");
        // 用 AI 生成推荐
        const aiRecs = await generateAIRecommendations(f);
        setRecommendations(aiRecs);
      }
    } catch { setError("字段解析失败"); }
    finally { setRecLoading(false); }
  }

  // AI 根据字段标签生成可视化需求
  async function generateAIRecommendations(fields: FieldInfo[]): Promise<string[]> {
    const fieldNames = fields.map((f) => `${f.name}(${f.type})`).join(", ");
    try {
      const res = await fetch("/api/ai/generate-recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fieldNames }) });
      const json = await res.json();
      if (json.success && json.data.recommendations?.length) return json.data.recommendations;
    } catch { /* 降级 */ }
    // 本地兜底
    return fields.map((f) => {
      if (f.type === "date") return `${f.name}趋势`;
      if (f.type === "category") return `${f.name}分布`;
      if (f.type === "number") return `${f.name}统计`;
      return `${f.name}概览`;
    }).slice(0, 10);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  function toggleOption(opt: string) {
    const next = new Set(selectedOptions);
    next.has(opt) ? next.delete(opt) : next.add(opt);
    setSelectedOptions(next);
  }

  async function handleGenerate() {
    if (selectedOptions.size === 0 && !customReq.trim()) { setError("请至少选择一项可视化需求或输入自定义描述"); return; }
    setLoading(true); setError(""); setStage("generating");
    const allTags = [...Array.from(selectedOptions), customReq.trim()].filter(Boolean);
    const description = allTags.join("、");

    try {
      const res1 = await fetch("/api/ai/generate-dashboard", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, dataSourceId: selectedDsId, tableName: selectedTable || undefined, name: dashName.trim() || "AI 智能看板", widgetTags: allTags, teamId: joinTeam && targetTeamId ? targetTeamId : undefined }),
      });
      const json1 = await res1.json();
      if (!json1.success) { setError(json1.error); setLoading(false); setStage("config"); return; }

      const dashId = json1.data?.dashboard?.id;
      if (!dashId) { setError("看板创建失败，请重试"); setLoading(false); setStage("config"); return; }
      setStage("processing");
      const res2 = await fetch("/api/ai/process-data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardId: dashId, dataSourceId: selectedDsId, tableName: selectedTable || undefined }),
      });
      const json2 = await res2.json();
      if (!json2.success) { setError(json2.error); setLoading(false); setStage("config"); return; }

      // AI 成功返回 → 写入本地缓存（IndexedDB），后续打开优先读缓存
      await setCachedDashboard({
        dashboardId: dashId,
        widgets: json2.data.widgets.map((w: any) => ({
          widgetId: w.widgetId,
          type: w.type,
          title: w.title,
          data: w.data,
        })),
        cachedAt: Date.now(),
      });

      router.push(`/dashboard/${dashId}`);
    } catch { setError("AI 生成失败"); setStage("config"); }
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30"><Wand2 className="h-8 w-8 text-violet-600" /></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 创建看板</h1>
        <p className="mt-2 text-gray-500">选择数据集 → AI 分析字段 → 推荐可视化需求 → 一键生成</p>
      </div>

      {/* AI 密钥未配置提醒 */}
      {hasAIKeys === false && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">未配置 AI 密钥</p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              看板将使用本地规则生成，AI 分析与推荐功能不可用。
              <Link href="/dashboard/settings/ai" className="ml-1 font-medium underline hover:text-amber-800 dark:hover:text-amber-200">前往配置 <Key className="inline h-3 w-3" /></Link>
            </p>
          </div>
        </div>
      )}

      {/* 看板名称 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-violet-600" /><CardTitle>看板名称</CardTitle></div>
        </CardHeader>
        <CardContent>
          <Input value={dashName} onChange={(e) => setDashName(e.target.value)} placeholder="输入看板名称..." />
        </CardContent>
      </Card>

      {/* 加入团队 */}
      {teams.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-violet-600" /><CardTitle>加入团队（可选）</CardTitle></div>
            <CardDescription>看板加入团队后，团队成员可按权限访问</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={joinTeam} onChange={(e) => setJoinTeam(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">将此看板加入团队</span>
            </label>
            {joinTeam && (
              <select value={targetTeamId} onChange={(e) => setTargetTeamId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">选择目标团队</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </CardContent>
        </Card>
      )}

      {/* 选择数据集 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Database className="h-5 w-5 text-violet-600" /><CardTitle>选择数据集</CardTitle></div>
          <CardDescription>选择你要分析的数据源</CardDescription>
        </CardHeader>
        <CardContent>
          {dataSources.length === 0 ? (
            <div className="text-center py-4"><p className="text-sm text-gray-400">暂无数据源</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => router.push("/dashboard/datasources")}>去上传数据</Button></div>
          ) : (
            <div className="space-y-3">
              {/* 数据源类型切换 */}
              <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                <button onClick={() => { setDsTab("file"); setSelectedDsId(""); setSelectedTable(""); setFields([]); setRecommendations([]); }}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    dsTab === "file" ? "bg-white text-violet-600 shadow-sm dark:bg-gray-700 dark:text-violet-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}>
                  📄 文件数据集
                </button>
                <button onClick={() => { setDsTab("db"); setSelectedDsId(""); setSelectedTable(""); setFields([]); setRecommendations([]); }}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    dsTab === "db" ? "bg-white text-violet-600 shadow-sm dark:bg-gray-700 dark:text-violet-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}>
                  🗄 数据库表
                </button>
              </div>

              {/* 文件数据源：直接选择 */}
              {dsTab === "file" && (
                <select value={selectedDsId} onChange={(e) => handleSelectDs(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                  <option value="">-- 选择文件数据源 --</option>
                  {fileSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>📄 {ds.name} ({ds.fileSource?.rowCount || "?"} 行)</option>
                  ))}
                </select>
              )}

              {/* 数据库表：两级联动 */}
              {dsTab === "db" && (
                <div className="space-y-2">
                  <select value={selectedDsId} onChange={(e) => { setSelectedDsId(e.target.value); setSelectedTable(""); }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                    <option value="">-- 选择数据库连接 --</option>
                    {dbSources.map((ds) => (
                      <option key={ds.id} value={ds.id}>🗄 {ds.name} ({ds.dbSource?.dbType || "DB"} · {ds.dbSource?.tableList?.length || 0} 表)</option>
                    ))}
                  </select>

                  {selectedDsId && tableList.length > 0 && (
                    <select value={selectedTable} onChange={(e) => { setSelectedTable(e.target.value); handleSelectDs(selectedDsId, e.target.value); }}
                      className="w-full rounded-lg border border-violet-300 bg-violet-50/30 px-3 py-2.5 text-sm dark:border-violet-700 dark:bg-violet-950/20 dark:text-gray-100">
                      <option value="">-- 选择数据表 --</option>
                      {tableList.map((t: string) => (
                        <option key={t} value={t}>📋 {t}</option>
                      ))}
                    </select>
                  )}
                  {selectedDsId && tableList.length === 0 && (
                    <p className="text-xs text-amber-500">该数据库连接暂无已缓存的表列表，请前往数据源管理重新测试连接</p>
                  )}
                </div>
              )}
            </div>
          )}

          {recLoading && <p className="mt-3 text-sm text-violet-600">AI 正在分析字段并生成推荐...</p>}

          {fields.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">已识别 {fields.length} 个字段</h4>
                <button onClick={() => setShowFields(!showFields)} className="flex items-center gap-1 text-xs text-violet-600">
                  {showFields ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}{showFields ? "收起" : "展开详情"}</button>
              </div>
              {showFields && (
                <div className="flex flex-wrap gap-2">
                  {fields.map((f) => {
                    const Icon = TYPE_ICONS[f.type] || Type;
                    return <span key={f.name} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${typeColors[f.type]}`}><Icon className="h-3 w-3" /> {f.name}</span>;
                  })}
                </div>
              )}
              {previewData.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                  <table className="min-w-full text-xs"><thead className="bg-gray-50 dark:bg-gray-800"><tr>{Object.keys(previewData[0] || {}).slice(0, 6).map((h) => <th key={h} className="px-2 py-1 text-left font-medium text-gray-500">{h}</th>)}</tr></thead>
                    <tbody>{previewData.map((row, i) => (<tr key={i} className="border-t border-gray-50 dark:border-gray-700">{Object.values(row).slice(0, 6).map((v: any, j) => <td key={j} className="px-2 py-1 text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{String(v).slice(0, 20)}</td>)}</tr>))}</tbody></table></div>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 可视化需求（AI 推荐） */}
      {recommendations.length > 0 && stage === "config" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600" /><CardTitle>AI 推荐的可视化需求</CardTitle></div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedOptions(new Set(recommendations))}>全选</Button>
            </div>
            <CardDescription>基于数据集字段智能生成，与当前数据强相关</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {recommendations.map((opt) => {
                const active = selectedOptions.has(opt);
                return <button key={opt} onClick={() => toggleOption(opt)}
                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                    active ? "border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-950/40 dark:text-violet-300"
                    : "border-gray-200 bg-white text-gray-600 hover:border-violet-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"}`}>
                  {active && <Check className="h-3.5 w-3.5" />} {opt}</button>;
              })}
            </div>
            <p className="text-xs text-gray-400 mb-2">已选 {selectedOptions.size}/{recommendations.length} 项</p>
            <textarea rows={2} value={customReq} onChange={(e) => setCustomReq(e.target.value)}
              placeholder="补充自定义需求（可选）..."
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
          </CardContent>
        </Card>
      )}

      {/* 生成按钮 */}
      {fields.length > 0 && stage === "config" && (
        <div className="flex justify-center">
          <Button onClick={handleGenerate} size="lg" disabled={selectedOptions.size === 0 && !customReq.trim()}>
            <Sparkles className="mr-1.5 h-4 w-4" /> 生成仪表盘
          </Button>
        </div>
      )}

      {/* 加载 */}
      {stage !== "config" && (
        <Card><CardContent className="py-10"><div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-3 border-violet-600 border-t-transparent" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{stage === "generating" ? "AI 正在生成看板模板..." : "AI 正在处理数据并渲染图表..."}</p>
          <div className="flex gap-1"><div className={`h-2 w-2 rounded-full ${stage === "generating" ? "bg-violet-600" : "bg-violet-200"}`} /><div className={`h-2 w-2 rounded-full ${stage === "processing" ? "bg-violet-600" : "bg-violet-200"}`} /></div>
        </div></CardContent></Card>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30">
          <p className="font-medium mb-1">生成失败</p>{error}
          <button onClick={() => { setError(""); setStage("config"); }} className="mt-2 block text-xs font-medium underline">返回重新选择</button>
        </div>
      )}
    </div>
  );
}
