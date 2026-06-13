"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Settings, ChevronLeft, Wand2, Database, Key } from "lucide-react";

const navigation = [
  { name: "仪表盘", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI 创建看板", href: "/dashboard/ai-create", icon: Wand2 },
  { name: "数据源管理", href: "/dashboard/datasources", icon: Database },
  { name: "团队管理", href: "/teams", icon: Users },
  { name: "API 密钥设置", href: "/dashboard/settings/ai", icon: Key },
  { name: "设置", href: "/settings", icon: Settings },
] as const;

interface SidebarProps { collapsed: boolean; onToggle?: () => void }

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-950",
      collapsed ? "w-[68px]" : "w-64"
    )}>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-lg font-bold text-violet-600">锐鹰数视</span>
          </Link>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {collapsed && <img src="/logo.png" alt="Logo" className="mx-auto h-7 w-7 rounded-lg object-contain" />}
        <button onClick={onToggle} className={cn("rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300", collapsed && "mx-auto mt-4")}>
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400"
                         : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.name : undefined}>
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <p className="text-xs text-gray-400">AI-Powered SaaS Dashboard</p>
        </div>
      )}
    </aside>
  );
}
