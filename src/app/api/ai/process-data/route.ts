/**
 * AI 数据处理 API
 * POST /api/ai/process-data
 *
 * 流程:
 * 1. 读取 CSV 源数据
 * 2. 看板模板描述 + 数据摘要 → 发给 AI
 * 3. AI 返回每个组件的结构化数据（前端可直接渲染）
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function decodeCSV(base64: string): { headers: string[]; rows: Record<string, string>[] } {
  const bytes = Buffer.from(base64, "base64");
  const text = new TextDecoder("utf-8").decode(bytes);
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
  return { headers, rows };
}

// ─── 本地字段分析 + 数据聚合 ──────────────────────
function localProcess(widget: any, rows: Record<string, string>[], headers: string[]) {
  const numKeys = headers.filter((h) => rows.some((r) => !isNaN(parseFloat(r[h]))));
  const catKeys = headers.filter((h) => !numKeys.includes(h));
  const dateKey = headers.find((h) => /日期|时间|date|下单/i.test(h)) || headers[0];
  const numKey = numKeys[0] || headers[1] || headers[0];
  const catKey = catKeys[0] || headers[0];
  const toN = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

  switch (widget.type) {
    case "LINE":
      return rows.slice(0, 50).map((r) => {
        const entry: any = { [dateKey]: r[dateKey] };
        numKeys.forEach((nk) => { entry[nk] = toN(r[nk]); });
        return entry;
      });
    case "BAR": {
      const groups: Record<string, number> = {};
      rows.forEach((r) => { const k = r[catKey] || "其他"; groups[k] = (groups[k] || 0) + toN(r[numKey]); });
      const hashC = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return `hsl(${Math.abs(h) % 360}, 65%, 55%)`; };
      return Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([name, value]) => ({ name, value, fill: hashC(name) }));
    }
    case "PIE": {
      const groups: Record<string, number> = {};
      rows.forEach((r) => { const k = r[catKey] || "其他"; groups[k] = (groups[k] || 0) + toN(r[numKey]); });
      // 按名称哈希生成唯一色
      const toColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return `hsl(${Math.abs(h) % 360}, 65%, 55%)`; };
      return Object.entries(groups).slice(0, 8).map(([name, value]) => ({ name, value, color: toColor(name) }));
    }
    case "TABLE":
      return rows.slice(0, 50);
    case "STAT": {
      return numKeys.map((nk) => {
        const vals = rows.map((r) => toN(r[nk])).filter((n) => n > 0);
        const sum = vals.reduce((a, b) => a + b, 0);
        return { name: nk, value: Math.round(sum * 100) / 100, avg: Math.round(sum / vals.length * 100) / 100 || 0, count: vals.length, prefix: /金额|价格|收入|利润/i.test(nk) ? "¥" : "" };
      });
    }
    default:
      return [];
  }
}

// ─── DB 源：连接查询表数据 ──────────────────────────
async function fetchDbTableData(
  dbSource: { dbType: string; host: string; port: number; dbName: string; dbUser: string; dbPwd: string },
  tableName: string
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const { dbType, host, port, dbName, dbUser, dbPwd } = dbSource;

  switch (dbType) {
    case "postgres": {
      const { Pool } = await import("pg");
      const pool = new Pool({
        host, port: port || 5432, user: dbUser, password: dbPwd,
        database: dbName, connectionTimeoutMillis: 10000, max: 1,
      });
      try {
        const escapedTable = `"${tableName.replace(/"/g, '""')}"`;
        const result = await pool.query(`SELECT * FROM ${escapedTable}`);
        await pool.end();
        const hdrs = result.fields.map((f: any) => f.name);
        const rws = result.rows.map((r: any) => {
          const row: Record<string, string> = {};
          hdrs.forEach((h: string) => { row[h] = r[h] != null ? String(r[h]) : ""; });
          return row;
        });
        return { headers: hdrs, rows: rws };
      } catch (err: any) {
        await pool.end().catch(() => {});
        throw new Error(`PostgreSQL 查询失败: ${err.message}`);
      }
    }
    case "mysql": {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection({
        host, port: port || 3306, user: dbUser, password: dbPwd,
        database: dbName, connectTimeout: 10000,
      });
      try {
        const escaped = "`" + tableName.replace(/`/g, "``") + "`";
        const [rws] = await conn.execute(`SELECT * FROM ${escaped}`) as [any[], any];
        await conn.end();
        const hdrs = rws.length > 0 ? Object.keys(rws[0]) : [];
        const rows = rws.map((r: any) => {
          const row: Record<string, string> = {};
          hdrs.forEach((h: string) => { row[h] = r[h] != null ? String(r[h]) : ""; });
          return row;
        });
        return { headers: hdrs, rows };
      } catch (err: any) {
        await conn.end().catch(() => {});
        throw new Error(`MySQL 查询失败: ${err.message}`);
      }
    }
    default:
      throw new Error(`不支持的数据库类型: ${dbType}`);
  }
}

// ─── POST ────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { dashboardId, dataSourceId, tableName } = await request.json();
    if (!dashboardId) return NextResponse.json({ success: false, error: "缺少 dashboardId" }, { status: 400 });

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId }, include: { widgets: true },
    });
    if (!dashboard || dashboard.userId !== userId) return NextResponse.json({ success: false, error: "看板不可用" }, { status: 403 });

    if (!dataSourceId) return NextResponse.json({ success: false, error: "请先选择数据源" }, { status: 400 });
    const ds = await prisma.dataSource.findUnique({
      where: { id: dataSourceId }, include: { fileSource: true, dbSource: true },
    });
    if (!ds || ds.userId !== userId) return NextResponse.json({ success: false, error: "数据源不可用" }, { status: 403 });

    let headers: string[] = [];
    let rows: Record<string, string>[] = [];

    // ── 文件数据源：解码 CSV ──
    if (ds.type === "file") {
      if (!ds.fileSource?.fileUrl) return NextResponse.json({ success: false, error: "数据源文件为空，请重新上传" }, { status: 400 });
      ({ headers, rows } = decodeCSV(ds.fileSource.fileUrl));
    }
    // ── 数据库源：连接查询表数据 ──
    else if (ds.type === "external_db") {
      if (!ds.dbSource) return NextResponse.json({ success: false, error: "数据库连接信息缺失" }, { status: 400 });
      if (!tableName) return NextResponse.json({ success: false, error: "请选择要分析的数据表" }, { status: 400 });
      const result = await fetchDbTableData(ds.dbSource, tableName);
      headers = result.headers;
      rows = result.rows;
    }

    if (rows.length === 0) return NextResponse.json({ success: false, error: "数据解析失败" }, { status: 400 });

    await prisma.dashboard.update({ where: { id: dashboardId }, data: { dataSourceId } });

    // ─── 逐条 AI 处理：每条需求标签独立发给 AI ───
    const { userHasAIKeys: checkKeys } = await import("@/lib/ai-user");
    const hasAI = await checkKeys(userId).catch(() => false);

    const results = await Promise.all(dashboard.widgets.map(async (w) => {
      // 每条指令单独发给 AI：widget.title 是用户选中的需求标签
      const tag = w.title;
      const sample = rows.map((r) => JSON.stringify(r)).join("\n");
      let chartType = w.type;
      let chartData: any[] = [];

      if (hasAI) {
        try {
          const { callAIWithUserKeys } = await import("@/lib/ai-user");
          const resp = await callAIWithUserKeys(userId, [
            { role: "system", content: `你是数据分析师。根据用户需求和原始数据，完成数据处理并返回结果。
用户需求: "${tag}"
字段: ${headers.join(", ")}
数据行数: ${rows.length}
样本:\n${sample}

返回 JSON（只返回 JSON，不要 markdown）:
{"chartType":"LINE|BAR|PIE|TABLE|STAT","title":"${tag}","data":[...]}
规则: chartType按需求选最合适的。LINE数据[{日期字段,数值字段...}]，BAR/PIE数据[{name,value}]，TABLE返回原始行，STAT返回[{name,value,avg,count}]。**重要:BAR/PIE必须包含全部类别,不得省略任何数据。**只返回JSON。` },
            { role: "user", content: `请处理：${tag}` },
          ], { temperature: 0.3 });
          const cleaned = resp.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          try {
            const parsed = JSON.parse(cleaned);
            if (parsed.chartType) chartType = parsed.chartType;
            if (parsed.data?.length) chartData = parsed.data;
          } catch {}
        } catch { /* AI失败→本地处理 */ }
      }

      if (chartData.length === 0) {
        chartData = localProcess({ ...w, type: chartType }, rows, headers);
      }

      return { widgetId: w.id, type: chartType, title: tag, data: chartData };
    }));

    return NextResponse.json({
      success: true,
      data: { dashboardId, dataSourceId, fields: headers, totalRows: rows.length, widgets: results, message: `已处理 ${rows.length} 行数据，${results.length} 个组件就绪` },
    });
  } catch (err: any) {
    console.error("[PROCESS_DATA]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
