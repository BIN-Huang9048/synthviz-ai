/**
 * 数据表格组件
 * 用于列表类数据展示
 */
"use client";

import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableWidgetProps<T> {
  data: T[];
  columns: Column<T>[];
  height?: number;
}

export function DataTableWidget<T extends Record<string, any>>({
  data,
  columns,
  height = 360,
}: DataTableWidgetProps<T>) {
  if (!data || data.length === 0) return null;

  return (
    <div className="overflow-x-auto" style={{ maxHeight: height }}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map((item, rowIdx) => (
            <tr key={rowIdx} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300",
                    col.className
                  )}
                >
                  {col.render
                    ? col.render(item)
                    : item[col.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
