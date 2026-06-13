/**
 * Prisma Client 单例
 *
 * 支持多种 PostgreSQL 托管方案:
 * - 本地开发: Docker PostgreSQL (TCP 连接)
 * - Vercel Postgres: 使用 @vercel/postgres + @prisma/adapter-pg
 * - Neon Serverless: 使用 @neondatabase/serverless + @prisma/adapter-neon
 *
 * 连接池策略:
 * - 开发环境: 全局单例复用 (HMR 安全)
 * - 生产环境 (Serverless): 每次请求创建新连接 (函数实例间不共享)
 */
import { PrismaClient } from "../generated/prisma/client";

// ─── 开发模式: 标准 pg Pool ──────────────────────────
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * 创建 PrismaClient 实例
 *
 * Serverless 环境 (Vercel / AWS Lambda):
 * 每次函数调用创建新实例，连接池上限设为 1-3 避免耗尽数据库连接。
 *
 * 传统服务器 (Docker / VPS):
 * 全局单例，连接池上限可设为 5-10。
 */
function createPrismaClient(): PrismaClient {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: isServerless ? 3 : 5,
    idleTimeoutMillis: isServerless ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  });

  const adapter = new PrismaPg(pool);
  globalForPrisma.pool = pool;

  return new PrismaClient({ adapter });
}

// 开发环境复用实例；生产环境每次冷启动重建
export const prisma =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** 优雅关闭数据库连接 (用于进程退出 hooks) */

export default prisma;
