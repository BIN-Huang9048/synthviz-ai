"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogOut, User, ChevronDown, Bell, Check, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface NavbarProps { sidebarCollapsed: boolean; user?: { name: string | null; email: string } | null }

export function Navbar({ sidebarCollapsed, user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 获取邀请数量
  useEffect(() => {
    fetch("/api/user/invitations").then((r) => r.json()).then((json) => { if (json.success) setInvites(json.data || []); });
  }, []);

  async function handleAccept(invId: string, teamId: string) {
    await fetch(`/api/teams/${teamId}/members`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", invitationId: invId }) });
    setInvites((prev) => prev.filter((i) => i.id !== invId));
  }
  async function handleDecline(invId: string, teamId: string) {
    await fetch(`/api/teams/${teamId}/members`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decline", invitationId: invId }) });
    setInvites((prev) => prev.filter((i) => i.id !== invId));
  }

  const bc = pathname.split("/").filter(Boolean).map((s, i, arr) => ({ label: s, href: "/" + arr.slice(0, i + 1).join("/"), isLast: i === arr.length - 1 }));
  const labelMap: Record<string, string> = { dashboard: "仪表盘", "ai-create": "AI 创建看板", datasources: "数据源", teams: "团队管理", settings: "设置", ai: "AI 密钥", auth: "认证", signin: "登录", signup: "注册" };

  return (
    <header className={cn("fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80", sidebarCollapsed ? "left-[68px]" : "left-64")} style={{ left: sidebarCollapsed ? "68px" : "256px" }}>
      <nav className="flex items-center gap-1.5 text-sm">
        {bc.length > 0 && (<>
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">首页</Link>
          {bc.map((c) => (
            <span key={c.href} className="flex items-center gap-1.5"><span className="text-gray-300">/</span>
              {c.isLast ? <span className="font-medium text-gray-900 dark:text-gray-100">{labelMap[c.label] || c.label}</span>
                        : <Link href={c.href} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">{labelMap[c.label] || c.label}</Link>}
            </span>))}
        </>)}
      </nav>
      <div className="flex items-center gap-3">
        {/* ─── 消息通知 ─── */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
            <Bell className="h-4 w-4" />
            {invites.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{invites.length}</span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-gray-200 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">消息通知</h4>
              </div>
              {/* 团队邀请 */}
              {invites.length > 0 ? (
                <div className="max-h-60 overflow-y-auto">
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 dark:border-gray-800">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 dark:text-white truncate">
                          <span className="font-medium">{inv.inviter?.name || inv.inviter?.email}</span> 邀请你加入
                        </p>
                        <p className="text-xs text-gray-500">{inv.team?.name}</p>
                      </div>
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <button onClick={() => handleAccept(inv.id, inv.teamId)} className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><Check className="h-4 w-4" /></button>
                        <button onClick={() => handleDecline(inv.id, inv.teamId)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-400">暂无新通知</div>
              )}
              {/* 未来：系统公告 */}
              <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-700">
                <button onClick={() => { setNotifOpen(false); router.push("/teams"); }} className="text-xs text-violet-600 hover:text-violet-500">查看全部 →</button>
              </div>
            </div>
          )}
        </div>

        {/* ─── 用户菜单 ─── */}
        {user && (
          <div className="relative flex items-center gap-2 border-l border-gray-200 pl-3 dark:border-gray-700" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">{user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}</div>
              <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 md:block">{user.name || user.email}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 md:block" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <button onClick={() => { setMenuOpen(false); router.push("/settings"); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"><User className="h-4 w-4" /> 个人信息</button>
                <button onClick={async () => { await signOut({ redirect: false }); router.push("/auth/signin"); router.refresh(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"><LogOut className="h-4 w-4" /> 退出登录</button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
