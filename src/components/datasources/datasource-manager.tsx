"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Database, FileUp, Trash2, ExternalLink, Server, FileSpreadsheet, AlertCircle, CheckCircle2, X, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type DataSource = {
  id: string; name: string; description: string | null; type: "file" | "external_db"; status: string;
  createdAt: string; updatedAt: string; dashboardCount: number;
  fileSource?: { fileType: string; fileName: string; fileSize: number; rowCount: number; columnInfo: any } | null;
  dbSource?: { dbType: string; host: string; port: number; dbName: string; tableList: any } | null;
};

export function DataSourceManager() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState<"file" | "db" | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [delMsg, setDelMsg] = useState("");

  // 文件上传
  const [file, setFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState("");

  // DB 连接
  const [dbForm, setDbForm] = useState({ name: "", description: "", dbType: "mysql", host: "", port: 3306, dbName: "", dbUser: "", dbPwd: "" });
  const [dbTestMsg, setDbTestMsg] = useState<{ type: "success" | "error" | "loading"; text: string } | null>(null);
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [dbTested, setDbTested] = useState(false); // 是否已通过连接测试
  const [portManuallyEdited, setPortManuallyEdited] = useState(false);

  /** 连接参数变更时，重置测试状态（强制重新测试） */
  function updateDbField(field: string, value: any) {
    setDbForm((prev) => ({ ...prev, [field]: value }));
    if (dbTested) { setDbTested(false); setDbTestMsg(null); setDbTables([]); }
  }

  // ─── 数据库类型 → 默认端口映射 ──────────────────────
  const DB_PORT_MAP: Record<string, number | null> = {
    mysql: 3306, postgres: 5432, sqlserver: 1433, oracle: 1521,
    sqlite: null, mongodb: 27017, redis: 6379, clickhouse: 8123, elasticsearch: 9200,
  };

  // ─── 数据库特殊说明 ─────────────────────────────────
  const DB_HINTS: Record<string, string> = {
    mongodb: "MongoDB 连接格式: mongodb://user:pass@host:port/database",
    redis: "Redis 默认无用户名，认证仅需密码；如无密码可留空",
    elasticsearch: "Elasticsearch 使用 HTTP 接口，默认端口 9200",
    clickhouse: "ClickHouse 默认使用 HTTP 接口 (8123)，原生端口 9000",
    sqlite: "SQLite 仅需文件路径，无需用户名/密码/端口",
  };

  // 切换数据库类型时自动填充默认端口
  function handleDbTypeChange(newType: string) {
    // 切换数据库类型 → 重置测试状态
    if (dbTested) { setDbTested(false); setDbTestMsg(null); setDbTables([]); }
    const defaultPort = DB_PORT_MAP[newType];
    if (portManuallyEdited && defaultPort !== null && dbForm.port !== defaultPort) {
      if (confirm(`是否将端口重置为 ${newType} 的默认端口 (${defaultPort})？`)) {
        setDbForm({ ...dbForm, dbType: newType, port: defaultPort ?? 0 });
        setPortManuallyEdited(false);
      } else {
        setDbForm({ ...dbForm, dbType: newType });
      }
    } else {
      setDbForm({ ...dbForm, dbType: newType, port: defaultPort ?? 0 });
      setPortManuallyEdited(false);
    }
  }

  // SQLite 是否被选中
  const isSQLite = dbForm.dbType === "sqlite";
  const isNoSQL = ["mongodb", "redis", "elasticsearch"].includes(dbForm.dbType);

  // 表单校验
  function validateDbForm(): boolean {
    if (!dbForm.name.trim()) return false;
    if (isSQLite) return !!dbForm.host.trim(); // SQLite 只需要文件路径
    if (!dbForm.host.trim()) return false;
    return true;
  }

  useEffect(() => { fetchSources(); }, []);

  async function fetchSources() {
    setLoading(true);
    const res = await fetch("/api/datasources"); const json = await res.json();
    if (json.success) setSources(json.data);
    setLoading(false);
  }

  async function handleFileUpload() {
    if (!file) return;
    setUploadMsg("解析中...");
    try {
      let headers: string[] = [];
      let allRows: string[][] = [];
      let fullText = "";

      if (file.name.endsWith(".csv")) {
        // CSV: 直接读取文本
        fullText = await file.text();
        const lines = fullText.trim().split("\n");
        headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
        allRows = lines.slice(1).filter((l: string) => l.trim()).map((l) => l.split(",").map((v) => v.trim().replace(/"/g, "")));
      } else {
        // Excel: 使用 xlsx 库解析
        const XLSX = await import("xlsx");
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];
        headers = (jsonData[0] || []).map((h: any) => String(h).trim());
        allRows = jsonData.slice(1).filter((r: any[]) => r.some((c) => String(c || "").trim()));
        fullText = [headers.join(","), ...allRows.map((r) => r.join(","))].join("\n");
      }

      const rows = allRows.filter((r) => r.some((c) => c.trim()));
      const columns = headers.map((h: string) => ({ name: h, type: "string" }));
      // 可靠 UTF-8 Base64 编码（分块处理避免栈溢出）
      const utf8Bytes = new TextEncoder().encode(fullText);
      let binary = "";
      for (let i = 0; i < utf8Bytes.length; i += 8192) {
        binary += String.fromCharCode(...utf8Bytes.slice(i, i + 8192));
      }
      const fileBase64 = btoa(binary);

      const res = await fetch("/api/datasources", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name.replace(/\.(csv|xlsx?)$/i, ""), description: `上传文件: ${file.name}`,
          type: "file",
          file: { fileType: file.name.endsWith(".csv") ? "csv" : "excel", fileName: file.name, fileSize: file.size, fileUrl: fileBase64, rowCount: rows.length, columnInfo: columns },
        }),
      });
      const json = await res.json();
      if (json.success) { await fetchSources(); setShowCreate(null); setFile(null); setUploadMsg(""); }
      else setUploadMsg(json.error || "上传失败");
    } catch { setUploadMsg("文件解析失败"); }
  }

  async function handleTestDb() {
    setDbTestMsg({ type: "loading", text: "测试连接中..." });
    try {
      const res = await fetch("/api/datasources/test-db", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbForm),
      });
      const json = await res.json();
      if (json.success) {
        setDbTestMsg({ type: "success", text: `连接成功！发现 ${json.data?.tables?.length || 0} 个表` });
        setDbTables(json.data?.tables || []);
        setDbTested(true); // 标记测试通过，允许创建数据源
      } else {
        setDbTestMsg({ type: "error", text: json.error || "连接失败" });
        setDbTested(false);
      }
    } catch {
      setDbTestMsg({ type: "error", text: "测试请求失败" });
    }
  }

  async function handleCreateDb() {
    if (!validateDbForm()) return;
    if (!dbTested) { setDbTestMsg({ type: "error", text: "请先测试连接成功后再创建数据源" }); return; }
    try {
      const res = await fetch("/api/datasources", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dbForm.name, description: dbForm.description, type: "external_db",
          db: { dbType: dbForm.dbType, host: dbForm.host, port: dbForm.port, dbName: dbForm.dbName, dbUser: dbForm.dbUser, dbPwd: dbForm.dbPwd, tableList: dbTables },
        }),
      });
      const json = await res.json();
      if (json.success) { await fetchSources(); setShowCreate(null); setDbForm({ name: "", description: "", dbType: "mysql", host: "", port: 3306, dbName: "", dbUser: "", dbPwd: "" }); setDbTables([]); setDbTestMsg(null); setDbTested(false); setPortManuallyEdited(false); }
    } catch {}
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  function toggleSel(id: string) { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setDelMsg(""); }
  function toggleAll() { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((s) => s.id))); setDelMsg(""); }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此数据源？关联的仪表盘将保留但失去数据源绑定。")) return;
    await fetch(`/api/datasources/${id}`, { method: "DELETE" });
    await fetchSources();
    setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
  }

  async function handleBatchDel() {
    if (selected.size === 0) { setDelMsg("请至少选中一个数据源"); return; }
    if (!confirm(`确定删除选中的 ${selected.size} 个数据源？`)) return;
    let c = 0;
    for (const id of selected) { try { await fetch(`/api/datasources/${id}`, { method: "DELETE" }); c++; } catch {} }
    setSelected(new Set()); await fetchSources();
    setDelMsg(`已删除 ${c} 个`); setTimeout(() => setDelMsg(""), 3000);
  }

  const filtered = sources.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">数据源管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理你的文件数据源和外部数据库连接</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate("file")}><FileUp className="mr-1.5 h-4 w-4" /> 上传文件</Button>
          <Button variant="outline" onClick={() => setShowCreate("db")}><Server className="mr-1.5 h-4 w-4" /> 连接数据库</Button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="mb-4"><Input placeholder="搜索数据源..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      {/* ─── 创建弹窗 - 文件上传 ─── */}
      {showCreate === "file" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">上传文件数据源</h2>
              <button onClick={() => { setShowCreate(null); setFile(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              {/* 文件拖拽/点击上传区 */}
              <label
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 p-10 text-center cursor-pointer transition-all hover:border-violet-400 hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-950/20 dark:hover:border-violet-500"
              >
                <div className="rounded-full bg-violet-100 p-3 mb-3 dark:bg-violet-900/40">
                  <FileUp className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  {file ? file.name : "点击选择文件"}
                </p>
                <p className="mt-1 text-xs text-violet-500/70 dark:text-violet-400/60">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "支持 CSV、Excel (.xlsx) 格式"}
                </p>
                <input
                  type="file" accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              {/* 已选文件可重新选择 */}
              {file && (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</span>
                  </div>
                  <label className="cursor-pointer text-xs text-violet-600 hover:text-violet-500 font-medium">
                    重新选择
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                </div>
              )}

              {uploadMsg && (
                <p className={cn("text-sm", uploadMsg.includes("失败") ? "text-red-500" : "text-green-600")}>{uploadMsg}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { setShowCreate(null); setFile(null); }}>取消</Button>
                <Button onClick={handleFileUpload} disabled={!file} size="lg">
                  <FileUp className="mr-1.5 h-4 w-4" /> 上传并解析
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 创建弹窗 - DB 连接 ─── */}
      {showCreate === "db" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">连接外部数据库</h2>
              <button onClick={() => setShowCreate(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-3">
              {/* 数据源名称 */}
              <Input label="数据源名称" value={dbForm.name} onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })} placeholder="例如: 生产数据库" />
              <Input label="描述（可选）" value={dbForm.description} onChange={(e) => setDbForm({ ...dbForm, description: e.target.value })} />

              {/* ─── 数据库类型 + 端口 (按使用频率排序) ─── */}
              <div className="grid grid-cols-2 gap-2">
                <div className="w-full">
                  <label className="mb-1.5 block text-sm font-medium">数据库类型</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    value={dbForm.dbType}
                    onChange={(e) => handleDbTypeChange(e.target.value)}
                  >
                    <option value="mysql">MySQL</option>
                    <option value="postgres">PostgreSQL</option>
                    <option value="sqlserver">SQL Server</option>
                    <option value="oracle">Oracle</option>
                    <option value="sqlite">SQLite</option>
                    <option value="mongodb">MongoDB</option>
                    <option value="redis">Redis</option>
                    <option value="clickhouse">ClickHouse</option>
                    <option value="elasticsearch">Elasticsearch</option>
                  </select>
                </div>
                {/* 端口 — SQLite 时置灰 */}
                <Input
                  label="端口"
                  type={isSQLite ? "text" : "number"}
                  value={isSQLite ? "" : String(dbForm.port || "")}
                  disabled={isSQLite}
                  onChange={(e) => { updateDbField("port", Number(e.target.value)); setPortManuallyEdited(true); }}
                  placeholder={isSQLite ? "无端口" : ""}
                />
              </div>

              {/* ─── 主机地址 (SQLite 时变为文件路径) ─── */}
              <Input
                label={isSQLite ? "数据库文件路径" : "主机地址"}
                value={dbForm.host} onChange={(e) => updateDbField("host", e.target.value)}
                placeholder={isSQLite ? "./data.db" : "localhost"}
              />

              {/* ─── 数据库名 / 用户名 / 密码 (SQLite 时隐藏) ─── */}
              {!isSQLite && (
                <>
                  <Input label="数据库名" value={dbForm.dbName} onChange={(e) => updateDbField("dbName", e.target.value)} placeholder={isNoSQL ? "（可选）" : ""} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="用户名" value={dbForm.dbUser} onChange={(e) => updateDbField("dbUser", e.target.value)} placeholder={dbForm.dbType === "redis" ? "Redis 通常无用户名" : ""} />
                    <Input label="密码" type="password" value={dbForm.dbPwd} onChange={(e) => updateDbField("dbPwd", e.target.value)} />
                  </div>
                </>
              )}

              {/* ─── 特殊数据库提示 ─── */}
              {DB_HINTS[dbForm.dbType] && (
                <p className="text-xs text-gray-400 italic">💡 {DB_HINTS[dbForm.dbType]}</p>
              )}

              {/* ─── 测试连接结果 ─── */}
              {dbTestMsg && (
                <div className={cn(
                  "flex items-center gap-2 rounded-lg p-3 text-sm",
                  dbTestMsg.type === "success" && "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                  dbTestMsg.type === "error" && "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                  dbTestMsg.type === "loading" && "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                )}>
                  {dbTestMsg.type === "success" && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
                  {dbTestMsg.type === "error" && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                  {dbTestMsg.type === "loading" && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                  {dbTestMsg.text}
                </div>
              )}
              {dbTables.length > 0 && <p className="text-sm text-gray-500">已发现表: {dbTables.join(", ")}</p>}

              {/* ─── 操作按钮 ─── */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowCreate(null)}>取消</Button>
                <Button variant="outline" onClick={handleTestDb} disabled={dbTestMsg?.type === "loading" || !validateDbForm()}>
                  {dbTestMsg?.type === "loading" ? "测试中..." : "测试连接"}
                </Button>
                <Button onClick={handleCreateDb} disabled={!validateDbForm() || !dbTested}>
                  {dbTested ? "创建数据源" : "请先测试连接"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 数据源列表 */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map((i) => (<Card key={i}><CardContent><div className="animate-pulse space-y-3 py-4"><div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" /><div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" /></div></CardContent></Card>))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Database className="h-16 w-16" />
          <p className="mt-4 text-lg font-medium">暂无数据源</p>
          <p className="mt-1 text-sm">上传文件或连接外部数据库来创建数据源</p>
        </div>
      ) : (
        <>
          {/* 批量操作栏 */}
          <div className="mb-3 flex items-center gap-3">
            <button onClick={toggleAll} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600">
              {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="h-4 w-4 text-violet-600" /> : <Square className="h-4 w-4" />}
              全选 ({selected.size}/{filtered.length})
            </button>
            {selected.size > 0 && <Button size="sm" variant="danger" onClick={handleBatchDel}><Trash2 className="mr-1 h-3.5 w-3.5" /> 删除选中 ({selected.size})</Button>}
            {delMsg && <span className={`text-xs ${delMsg.includes("请") ? "text-amber-500" : "text-green-600"}`}>{delMsg}</span>}
          </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className={`group ${selected.has(s.id) ? "ring-2 ring-violet-400" : ""}`}>
              <CardContent className="py-5">
                <button onClick={() => toggleSel(s.id)} className="absolute top-3 left-3 z-10 rounded p-0.5 text-gray-400 hover:text-violet-600">
                  {selected.has(s.id) ? <CheckSquare className="h-4 w-4 text-violet-600" /> : <Square className="h-4 w-4" />}
                </button>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {s.type === "file" ? <FileSpreadsheet className="h-5 w-5 text-green-600" /> : <Server className="h-5 w-5 text-blue-600" />}
                      <h3 className="font-semibold text-gray-900 dark:text-white">{s.name}</h3>
                    </div>
                    {s.fileSource && <p className="mt-1 text-xs text-gray-500">{s.fileSource.fileName} · {s.fileSource.rowCount} 行 · {(s.fileSource.fileSize / 1024).toFixed(1)} KB</p>}
                    {s.dbSource && <p className="mt-1 text-xs text-gray-500">{s.dbSource.dbType}://{s.dbSource.host}:{s.dbSource.port}/{s.dbSource.dbName}</p>}
                    <p className="mt-1 text-xs text-gray-400">
                      {s.dashboardCount} 个仪表盘 · {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 gap-0.5">
                    <Link href={`/dashboard/ai-create?dataSourceId=${s.id}`} className="rounded p-1 text-gray-400 hover:text-violet-600" title="创建仪表盘"><ExternalLink className="h-4 w-4" /></Link>
                    <button onClick={() => handleDelete(s.id)} className="rounded p-1 text-gray-400 hover:text-red-600" title="删除"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
