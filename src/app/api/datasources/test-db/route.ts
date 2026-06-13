/**
 * 测试外部数据库连接
 * POST /api/datasources/test-db
 *
 * 支持 9 种数据库类型：
 * - 原生驱动：MySQL (mysql2) / PostgreSQL (pg)
 * - HTTP 接口：ClickHouse / Elasticsearch
 * - 其他类型：返回明确安装指引
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface TestDbBody {
  dbType: string;
  host: string;
  port: number;
  dbName: string;
  dbUser: string;
  dbPwd: string;
}

/** 各数据库类型默认端口 */
const DEFAULT_PORTS: Record<string, number> = {
  mysql: 3306,
  postgres: 5432,
  sqlserver: 1433,
  oracle: 1521,
  sqlite: 0,
  mongodb: 27017,
  redis: 6379,
  clickhouse: 8123,
  elasticsearch: 9200,
};

// ─── MySQL 连接测试 ──────────────────────────────────
async function testMySQL(body: TestDbBody) {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.createConnection({
    host: body.host,
    port: body.port || DEFAULT_PORTS.mysql,
    user: body.dbUser,
    password: body.dbPwd,
    database: body.dbName,
    connectTimeout: 5000,
  });
  const [tables] = await conn.execute("SHOW TABLES");
  await conn.end();
  const tableList = (tables as any[]).map((r) => Object.values(r)[0] as string);
  return { tables: tableList };
}

// ─── PostgreSQL 连接测试 ─────────────────────────────
async function testPostgres(body: TestDbBody) {
  const { Pool } = await import("pg");
  const pool = new Pool({
    host: body.host,
    port: body.port || DEFAULT_PORTS.postgres,
    user: body.dbUser,
    password: body.dbPwd,
    database: body.dbName,
    connectionTimeoutMillis: 5000,
    max: 1,
  });
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  await pool.end();
  const tables = result.rows.map((r: any) => r.table_name as string);
  return { tables };
}

// ─── ClickHouse 连接测试（HTTP 接口）─────────────────
async function testClickHouse(body: TestDbBody) {
  const base = `http://${body.host}:${body.port || DEFAULT_PORTS.clickhouse}`;
  const auth = body.dbUser
    ? `Basic ${Buffer.from(`${body.dbUser}:${body.dbPwd}`).toString("base64")}`
    : undefined;
  const res = await fetch(`${base}/?query=${encodeURIComponent("SHOW TABLES FORMAT TabSeparated")}`, {
    headers: auth ? { Authorization: auth } : {},
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  const text = await res.text();
  const tables = text.trim().split("\n").filter(Boolean);
  return { tables };
}

// ─── Elasticsearch 连接测试（HTTP 接口）──────────────
async function testElasticsearch(body: TestDbBody) {
  const base = `http://${body.host}:${body.port || DEFAULT_PORTS.elasticsearch}`;
  const auth = body.dbUser
    ? `Basic ${Buffer.from(`${body.dbUser}:${body.dbPwd}`).toString("base64")}`
    : undefined;
  const res = await fetch(`${base}/_cat/indices?format=json`, {
    headers: auth ? { Authorization: auth } : {},
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  const indices: any[] = await res.json();
  const tables = indices.map((i) => i.index as string);
  return { tables };
}

// ─── 尚不支持的数据库（需额外安装驱动） ──────────────
const DRIVER_GUIDE: Record<string, string> = {
  sqlserver: "npm i mssql",
  oracle: "npm i oracledb",
  sqlite: "SQLite 为嵌入式数据库，无需远程测试；请确认文件路径有效",
  mongodb: "npm i mongodb",
  redis: "npm i ioredis",
};

// ─── POST ────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body: TestDbBody = await request.json();
    const { dbType } = body;

    if (!dbType)
      return NextResponse.json({ success: false, error: "缺少 dbType" }, { status: 400 });

    // ── 分发到对应测试函数 ──
    switch (dbType) {
      case "mysql": {
        const { tables } = await testMySQL(body);
        return NextResponse.json({
          success: true,
          message: "连接成功",
          data: { tables },
        });
      }

      case "postgres": {
        const { tables } = await testPostgres(body);
        return NextResponse.json({
          success: true,
          message: "连接成功",
          data: { tables },
        });
      }

      case "clickhouse": {
        const { tables } = await testClickHouse(body);
        return NextResponse.json({
          success: true,
          message: "连接成功",
          data: { tables },
        });
      }

      case "elasticsearch": {
        const { tables } = await testElasticsearch(body);
        return NextResponse.json({
          success: true,
          message: "连接成功",
          data: { tables },
        });
      }

      case "sqlserver":
      case "oracle":
      case "sqlite":
      case "mongodb":
      case "redis": {
        const cmd = DRIVER_GUIDE[dbType] || "请查阅官方文档安装对应驱动";
        return NextResponse.json({
          success: false,
          error: `暂不支持 ${dbType} 的在线连接测试。如需使用，请手动安装驱动: ${cmd}`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `不支持的数据库类型: ${dbType}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[TEST_DB]", err);
    const detail = err.message || String(err);
    // 常见错误友好化
    if (detail.includes("ECONNREFUSED") || detail.includes("connect ETIMEDOUT"))
      return NextResponse.json({ success: false, error: "无法连接到主机，请检查地址和端口是否正确" }, { status: 502 });
    if (detail.includes("password authentication failed") || detail.includes("Access denied"))
      return NextResponse.json({ success: false, error: "认证失败，请检查用户名和密码" }, { status: 502 });
    if (detail.includes("does not exist") || detail.includes("Unknown database"))
      return NextResponse.json({ success: false, error: "数据库不存在，请检查数据库名" }, { status: 502 });
    return NextResponse.json({ success: false, error: `连接失败: ${detail}` }, { status: 502 });
  }
}
