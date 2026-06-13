/**
 * 模拟数据 API - 最新订单列表
 * GET /api/data/orders?limit=10
 */
import { NextResponse } from "next/server";

const customers = ["张三", "李四", "王五", "赵六", "陈七", "周八", "吴九", "郑十"];
const products = ["企业版订阅", "专业版订阅", "基础版订阅", "插件市场", "API 额度", "定制服务"];
const statuses = ["completed", "pending", "processing", "refunded"] as const;
const statusMap: Record<string, { label: string; className: string }> = {
  completed: { label: "已完成", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  pending: { label: "待支付", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  processing: { label: "处理中", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  refunded: { label: "已退款", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function generateOrder(id: number) {
  const customer = customers[Math.floor(Math.random() * customers.length)];
  const product = products[Math.floor(Math.random() * products.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const amount = Math.round((99 + Math.random() * 9900) * 100) / 100;

  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));

  return {
    id: `ORD-${String(id).padStart(4, "0")}`,
    customer,
    product,
    amount,
    status,
    statusLabel: statusMap[status].label,
    statusClass: statusMap[status].className,
    createdAt: date.toISOString(),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  await new Promise((r) => setTimeout(r, 350));

  const orders = Array.from({ length: limit }, (_, i) => generateOrder(i + 1));

  return NextResponse.json({
    success: true,
    data: orders,
    meta: { total: orders.length, updatedAt: new Date().toISOString() },
  });
}
