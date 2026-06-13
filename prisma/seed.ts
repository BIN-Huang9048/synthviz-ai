/**
 * 数据库种子脚本
 * 用法: npx tsx prisma/seed.ts
 * 或:  npm run db:seed
 *
 * 创建测试账号: test@example.com / 123456
 * 同时创建一个默认团队和示例仪表盘
 *
 * 前置条件: PostgreSQL 服务已运行，DATABASE_URL 已配置
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

// 需要手动加载 .env (seed 脚本不经过 Next.js)
import "dotenv/config";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 开始填充种子数据...\n");

  // ─── 1. 创建测试用户 ────────────────────────────────
  const passwordHash = await hash("123456", 12);

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "测试用户",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("✅ 测试账号:");
  console.log("   邮箱: test@example.com");
  console.log("   密码: 123456");
  console.log("   角色: ADMIN");
  console.log("   ID:  ", user.id);
  console.log("");

  // ─── 2. 创建默认团队 ────────────────────────────────
  const team = await prisma.team.upsert({
    where: { id: "default-team" },
    update: {},
    create: {
      id: "default-team",
      name: "默认团队",
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  console.log("✅ 默认团队:");
  console.log("   名称:", team.name);
  console.log("   ID:  ", team.id);
  console.log("");

  // ─── 3. 创建示例仪表盘 ──────────────────────────────
  const dashboard = await prisma.dashboard.upsert({
    where: { id: "demo-dashboard" },
    update: {},
    create: {
      id: "demo-dashboard",
      name: "销售数据大屏",
      description: "示例仪表盘 - 展示所有图表类型",
      teamId: team.id,
      userId: user.id,
      config: {
        layout: "grid",
        theme: "light",
      },
      widgets: {
        create: [
          {
            type: "LINE",
            title: "月度收入趋势",
            dataSource: {
              api: "/api/data/revenue",
              refreshInterval: 60,
            },
            position: { x: 0, y: 0, w: 12, h: 6 },
          },
          {
            type: "BAR",
            title: "各渠道来源统计",
            dataSource: {
              api: "/api/data/channels",
              refreshInterval: 300,
            },
            position: { x: 0, y: 6, w: 6, h: 6 },
          },
          {
            type: "PIE",
            title: "用户地域分布",
            dataSource: {
              api: "/api/data/regions",
              refreshInterval: 600,
            },
            position: { x: 6, y: 6, w: 6, h: 6 },
          },
          {
            type: "TABLE",
            title: "最新订单列表",
            dataSource: {
              api: "/api/data/orders",
              refreshInterval: 30,
            },
            position: { x: 0, y: 12, w: 12, h: 6 },
          },
          {
            type: "STAT",
            title: "核心指标总览",
            dataSource: {
              api: "/api/data/kpi",
              refreshInterval: 15,
            },
            position: { x: 0, y: 18, w: 12, h: 3 },
          },
        ],
      },
    },
  });

  console.log("✅ 示例仪表盘:");
  console.log("   名称:", dashboard.name);
  console.log("   组件: 5 个 (LINE / BAR / PIE / TABLE / STAT)");
  console.log("");

  // ─── 汇总 ──────────────────────────────────────────
  const userCount = await prisma.user.count();
  const teamCount = await prisma.team.count();
  const dashCount = await prisma.dashboard.count();
  const widgetCount = await prisma.dataWidget.count();

  console.log("📊 数据库统计:");
  console.log(`   用户: ${userCount}`);
  console.log(`   团队: ${teamCount}`);
  console.log(`   仪表盘: ${dashCount}`);
  console.log(`   小组件: ${widgetCount}`);
  console.log("\n🎉 种子数据填充完成！运行 `npm run dev` 启动应用");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("❌ 种子数据填充失败:");
  console.error(e);
  process.exit(1);
});
