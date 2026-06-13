/**
 * 数据源管理 API
 * GET  /api/datasources - 获取用户所有数据源
 * POST /api/datasources - 创建数据源
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const userId = (session.user as Record<string, unknown>).id as string;

  const sources = await prisma.dataSource.findMany({
    where: { userId },
    include: { fileSource: true, dbSource: true, _count: { select: { dashboards: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const data = sources.map((s) => ({
    id: s.id, name: s.name, description: s.description, type: s.type, status: s.status,
    createdAt: s.createdAt, updatedAt: s.updatedAt,
    dashboardCount: s._count.dashboards,
    fileSource: s.fileSource ? { fileType: s.fileSource.fileType, fileName: s.fileSource.fileName, fileSize: s.fileSource.fileSize, rowCount: s.fileSource.rowCount, columnInfo: s.fileSource.columnInfo } : null,
    dbSource: s.dbSource ? { dbType: s.dbSource.dbType, host: s.dbSource.host, port: s.dbSource.port, dbName: s.dbSource.dbName, dbUser: s.dbSource.dbUser, tableList: s.dbSource.tableList } : null,
  }));

  return NextResponse.json({ success: true, data });
}

const createSchema = z.object({
  name: z.string().min(1), description: z.string().optional(),
  type: z.enum(["file", "external_db"]),
  file: z.object({ fileType: z.enum(["csv","excel"]), fileName: z.string(), fileSize: z.number(), fileUrl: z.string(), rowCount: z.number(), columnInfo: z.any() }).optional(),
  db: z.object({ dbType: z.string(), host: z.string(), port: z.number(), dbName: z.string(), dbUser: z.string(), dbPwd: z.string(), tableList: z.any() }).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const userId = (session.user as Record<string, unknown>).id as string;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: "输入无效" }, { status: 400 });

    const { name, description, type, file, db } = parsed.data;

    const ds = await prisma.dataSource.create({
      data: {
        name, description, type, userId,
        fileSource: file ? { create: { fileType: file.fileType, fileName: file.fileName, fileUrl: file.fileUrl, fileSize: file.fileSize, rowCount: file.rowCount, columnInfo: file.columnInfo?.columns || [] } } : undefined,
        dbSource: db ? { create: { dbType: db.dbType, host: db.host, port: db.port, dbName: db.dbName, dbUser: db.dbUser, dbPwd: db.dbPwd, tableList: db.tableList } } : undefined,
      },
      include: { fileSource: true, dbSource: true },
    });

    return NextResponse.json({ success: true, data: ds }, { status: 201 });
  } catch (err) {
    console.error("[DATASOURCE_CREATE]", err);
    return NextResponse.json({ success: false, error: "创建失败" }, { status: 500 });
  }
}
