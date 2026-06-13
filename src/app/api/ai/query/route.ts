/**
 * AI 自然语言查询 API
 * POST /api/ai/query
 * Body: { question: string }
 *
 * 接收中文问题 → 调用大模型 → 生成模拟查询结果 → 返回图表数据
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { userHasAIKeys } from "@/lib/ai-user";
import prisma from "@/lib/prisma";

// 数据库 Schema 描述（给 AI 理解数据结构）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DB_SCHEMA = `
- User: 用户表 (id, email, name, role, createdAt)
- Team: 团队表 (id, name, ownerId)
- TeamMember: 团队成员表 (id, teamId, userId, role: OWNER|ADMIN|VIEWER)
- Dashboard: 仪表盘表 (id, teamId, userId, name, description, config JSON)
- DataWidget: 数据组件表 (id, dashboardId, type: LINE|BAR|PIE|TABLE|STAT, title, dataSource JSON, position JSON)
`;

function generateMockData(query: Record<string, any>): any[] {
  const type = query.type || "table";
  const timeRange = query.timeRange || "7d";
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 7;

  switch (type) {
    case "line":
      return Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          value: Math.floor(100 + Math.random() * 900),
          growth: Math.floor(Math.random() * 30),
        };
      });

    case "bar":
      return ["搜索", "社交", "直接", "邮件", "广告", "推荐"].map((name) => ({
        name,
        value: Math.floor(200 + Math.random() * 800),
        percent: Math.floor(10 + Math.random() * 40),
      }));

    case "pie":
      return ["华东", "华南", "华北", "西南", "海外"].map((name) => ({
        name,
        value: Math.floor(100 + Math.random() * 500),
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
      }));

    case "stat":
      return [
        { name: query.metrics?.[0] || "指标", value: Math.floor(1000 + Math.random() * 9000), change: (Math.random() * 20 - 5).toFixed(1), trend: Math.random() > 0.3 ? "up" : "down" },
      ];

    case "table":
    default:
      return Array.from({ length: 10 }, (_, i) => ({
        id: `R-${1000 + i}`,
        name: `数据项 ${i + 1}`,
        value: Math.floor(Math.random() * 10000),
        status: i < 3 ? "正常" : i < 6 ? "关注" : "异常",
      }));
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const hasKeys = await userHasAIKeys(userId);

    const { question, dataSourceId, tableName } = await request.json();
    if (!question || typeof question !== "string" || question.trim().length < 2) {
      return NextResponse.json({ success: false, error: "请输入至少 2 个字的问题" }, { status: 400 });
    }

    // 读取数据源（支持文件 + 数据库表）
    let sourceRows: Record<string, string>[] = [];
    let sourceHeaders: string[] = [];
    if (dataSourceId) {
      try {
        const ds = await prisma.dataSource.findUnique({
          where: { id: dataSourceId }, include: { fileSource: true, dbSource: true },
        });
        if (!ds || ds.userId !== userId) { /* 静默跳过 */ }
        // 文件源
        else if (ds.type === "file" && ds.fileSource?.fileUrl) {
          const bytes = Buffer.from(ds.fileSource.fileUrl, "base64");
          const text = new TextDecoder("utf-8").decode(bytes);
          const lines = text.trim().split("\n").filter((l) => l.trim());
          if (lines.length > 1) {
            sourceHeaders = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
            sourceRows = lines.slice(1).filter((l) => l.trim()).map((line) => {
              const vals = line.split(",").map((v: string) => v.trim().replace(/"/g, ""));
              const row: Record<string, string> = {};
              sourceHeaders.forEach((h, i) => { row[h] = vals[i] || ""; });
              return row;
            });
          }
        }
        // 数据库源：连接查询表数据
        else if (ds.type === "external_db" && ds.dbSource && tableName) {
          const sb = ds.dbSource;
          if (sb.dbType === "postgres") {
            const { Pool } = await import("pg");
            const pool = new Pool({ host: sb.host, port: sb.port || 5432, user: sb.dbUser, password: sb.dbPwd, database: sb.dbName, connectionTimeoutMillis: 5000, max: 1 });
            try {
              const res = await pool.query(`SELECT * FROM "${(tableName as string).replace(/"/g, '""')}" LIMIT 500`);
              sourceHeaders = res.fields.map((f: any) => f.name);
              sourceRows = res.rows.map((r: any) => { const row: Record<string, string> = {}; sourceHeaders.forEach((h: string) => { row[h] = r[h] != null ? String(r[h]) : ""; }); return row; });
              await pool.end();
            } catch { await pool.end().catch(() => {}); }
          } else if (sb.dbType === "mysql") {
            const mysql = await import("mysql2/promise");
            const conn = await mysql.createConnection({ host: sb.host, port: sb.port || 3306, user: sb.dbUser, password: sb.dbPwd, database: sb.dbName, connectTimeout: 5000 });
            try {
              const [rws] = await conn.execute(`SELECT * FROM \`${(tableName as string).replace(/`/g, "``")}\` LIMIT 500`) as [any[], any];
              sourceHeaders = rws.length > 0 ? Object.keys(rws[0]) : [];
              sourceRows = rws.map((r: any) => { const row: Record<string, string> = {}; sourceHeaders.forEach((h: string) => { row[h] = r[h] != null ? String(r[h]) : ""; }); return row; });
              await conn.end();
            } catch { await conn.end().catch(() => {}); }
          }
        }
      } catch {}
    }

    // 尝试用 AI 解析问题
    let queryConfig: any = null;
    let aiExplanation = "";

    if (hasKeys && sourceRows.length > 0) {
      try {
        const { callAIWithUserKeys } = await import("@/lib/ai-user");
        // 小数据集(<500行)全量发给AI；大数据集发摘要统计
        const isSmall = sourceRows.length < 500;
        const dataContent = isSmall
          ? `全部数据(${sourceRows.length}行):\n${sourceRows.map((r) => JSON.stringify(r)).join("\n")}`
          : `样本:\n${sourceRows.slice(0, 5).map((r) => JSON.stringify(r)).join("\n")}\n字段统计:\n${sourceHeaders.map((h) => {
              const vals = sourceRows.map((r) => parseFloat(r[h])).filter((n) => !isNaN(n));
              return `${h}: ${vals.length > 0 ? `数值(最小${Math.min(...vals).toFixed(0)}-最大${Math.max(...vals).toFixed(0)})` : "文本"}`;
            }).join("\n")}`;
        const result = await callAIWithUserKeys(userId, [
          { role: "system", content: `你是一个数据分析助手。用户提供数据集和问题，请返回可视化结果。返回 JSON: { "type": "line|bar|pie|table", "chartTitle": "...", "explanation": "...", "data": [...] }。LINE数据[{date,value,...}]，BAR/PIE数据[{name,value}]，TABLE数据为原始行。数据量少时必须包含用户提供的全部数据行。只返回JSON。` },
          { role: "user", content: `问题: ${question.trim()}\n字段: ${sourceHeaders.join(", ")}\n${dataContent}` },
        ], { temperature: 0.3 });
        const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.data?.length) {
          queryConfig = { type: parsed.type, chartTitle: parsed.chartTitle, data: parsed.data };
          aiExplanation = parsed.explanation || "";
        }
      } catch { /* 降级到关键词匹配 */ }
    }

    if (!queryConfig) {
      // 降级：根据关键词匹配
      const q = question.toLowerCase();
      if (q.includes("趋势") || q.includes("增长") || q.includes("变化")) {
        queryConfig = { type: "line", chartTitle: "趋势分析", dataQuery: { timeRange: "7d", metrics: ["value"] } };
      } else if (q.includes("对比") || q.includes("比较") || q.includes("排名")) {
        queryConfig = { type: "bar", chartTitle: "对比分析", dataQuery: {} };
      } else if (q.includes("占比") || q.includes("分布") || q.includes("比例")) {
        queryConfig = { type: "pie", chartTitle: "占比分布", dataQuery: {} };
      } else {
        queryConfig = { type: "table", chartTitle: "数据列表", dataQuery: {} };
      }
      aiExplanation = hasKeys ? "AI 解析失败，使用关键词匹配" : "未配置 AI 密钥，使用关键词匹配";
    }

    const data = queryConfig?.data || generateMockData(queryConfig?.dataQuery || {});

    return NextResponse.json({
      success: true,
      data: {
        type: queryConfig?.type || "table",
        chartTitle: queryConfig?.chartTitle || "查询结果",
        explanation: aiExplanation || "根据关键词匹配",
        result: data,
      },
    });
  } catch (err: any) {
    console.error("[AI_QUERY]", err);
    return NextResponse.json(
      { success: false, error: err.message || "AI 查询失败" },
      { status: 500 }
    );
  }
}
