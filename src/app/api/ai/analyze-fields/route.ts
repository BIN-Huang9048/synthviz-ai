/**
 * 数据集字段分析 API
 * POST /api/ai/analyze-fields
 * Body: { dataSourceId, tableName? }
 *
 * 支持文件数据源（CSV base64）和外部数据库（PostgreSQL / MySQL 表级查询）
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── 字段类型识别规则 ────────────────────────────
const NUM_KEYS = /金额|价格|收入|成本|利润|数量|销量|人数|金额|总额|总计|平均|amount|price|cost|qty|rate|sum|avg|count/i;
const DATE_KEYS = /时间|日期|date|time|下单|创建|年|月/i;

function inferFields(headers: string[], rows: Record<string, string>[]) {
  return headers.map((name) => {
    if (DATE_KEYS.test(name)) return { name, type: "date" as const };
    if (NUM_KEYS.test(name)) return { name, type: "number" as const };
    const samples = rows.slice(0, 20).map((r) => r[name]).filter(Boolean);
    const numCount = samples.filter((v) => !isNaN(parseFloat(String(v)))).length;
    if (numCount > samples.length * 0.6) return { name, type: "number" as const };
    if (samples.length <= 30) return { name, type: "category" as const };
    return { name, type: "text" as const };
  });
}

// ─── DB 源：连接并查询表结构与样本数据 ─────────────
async function analyzeDbTable(
  dbSource: { dbType: string; host: string; port: number; dbName: string; dbUser: string; dbPwd: string },
  tableName: string
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const { dbType, host, port, dbName, dbUser, dbPwd } = dbSource;

  switch (dbType) {
    case "postgres": {
      const { Pool } = await import("pg");
      const pool = new Pool({
        host, port: port || 5432, user: dbUser, password: dbPwd,
        database: dbName, connectionTimeoutMillis: 5000, max: 1,
      });
      try {
        // 获取列名 + 样本行
        const result = await pool.query(
          `SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT 5`
        );
        await pool.end();
        const headers = result.fields.map((f: any) => f.name);
        const rows = result.rows.map((r: any) => {
          const row: Record<string, string> = {};
          headers.forEach((h: string) => { row[h] = r[h] != null ? String(r[h]) : ""; });
          return row;
        });
        return { headers, rows };
      } catch (err: any) {
        await pool.end().catch(() => {});
        throw new Error(`PostgreSQL 查询失败: ${err.message}`);
      }
    }

    case "mysql": {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection({
        host, port: port || 3306, user: dbUser, password: dbPwd,
        database: dbName, connectTimeout: 5000,
      });
      try {
        const escaped = "`" + tableName.replace(/`/g, "``") + "`";
        const [rows] = await conn.execute(`SELECT * FROM ${escaped} LIMIT 5`) as [any[], any];
        await conn.end();
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        const strRows = rows.map((r: any) => {
          const row: Record<string, string> = {};
          headers.forEach((h: string) => { row[h] = r[h] != null ? String(r[h]) : ""; });
          return row;
        });
        return { headers, rows: strRows };
      } catch (err: any) {
        await conn.end().catch(() => {});
        throw new Error(`MySQL 查询失败: ${err.message}`);
      }
    }

    default:
      throw new Error(`不支持的数据库类型: ${dbType}（目前仅支持 PostgreSQL / MySQL 表级分析）`);
  }
}

// ─── POST ────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    const userId = (session.user as Record<string, unknown>).id as string;

    const { dataSourceId, tableName } = await request.json();
    if (!dataSourceId)
      return NextResponse.json({ success: false, error: "缺少 dataSourceId" }, { status: 400 });

    const ds = await prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      include: { fileSource: true, dbSource: true },
    });
    if (!ds || ds.userId !== userId)
      return NextResponse.json({ success: false, error: "数据源不可用" }, { status: 403 });

    let headers: string[] = [];
    let rows: Record<string, string>[] = [];

    // ── 文件数据源：解码 CSV ──
    if (ds.type === "file") {
      if (!ds.fileSource?.fileUrl)
        return NextResponse.json({ success: false, error: "数据源文件为空" }, { status: 400 });

      const bytes = Buffer.from(ds.fileSource.fileUrl, "base64");
      const text = new TextDecoder("utf-8").decode(bytes);
      const lines = text.trim().split("\n").filter((l) => l.trim());
      if (lines.length < 2)
        return NextResponse.json({ success: false, error: "数据格式无效" }, { status: 400 });

      headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
      rows = lines.slice(1).filter((l) => l.trim()).map((line) => {
        const vals = line.split(",").map((v: string) => v.trim().replace(/"/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      });
    }

    // ── 数据库源：连接查询表结构 ──
    else if (ds.type === "external_db") {
      if (!ds.dbSource)
        return NextResponse.json({ success: false, error: "数据库连接信息缺失" }, { status: 400 });
      if (!tableName)
        return NextResponse.json({ success: false, error: "请选择要分析的数据表" }, { status: 400 });

      const result = await analyzeDbTable(
        {
          dbType: ds.dbSource.dbType,
          host: ds.dbSource.host,
          port: ds.dbSource.port,
          dbName: ds.dbSource.dbName,
          dbUser: ds.dbSource.dbUser,
          dbPwd: ds.dbSource.dbPwd,
        },
        tableName
      );
      headers = result.headers;
      rows = result.rows;
    }

    if (headers.length === 0)
      return NextResponse.json({ success: false, error: "未能解析到任何字段" }, { status: 400 });

    const fields = inferFields(headers, rows);

    return NextResponse.json({
      success: true,
      data: {
        fields,
        sampleData: rows.slice(0, 5),
        totalRows: rows.length,
        sourceName: ds.name + (tableName ? ` / ${tableName}` : ""),
      },
    });
  } catch (err: any) {
    console.error("[ANALYZE_FIELDS]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
