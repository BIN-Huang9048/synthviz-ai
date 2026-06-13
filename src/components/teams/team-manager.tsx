/**
 * 团队管理客户端组件
 * 创建团队、查看成员、邀请成员、角色管理
 */
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Plus, Trash2, X, UserPlus, CheckSquare, Square, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  id: string; name: string; ownerId: string;
  createdAt: string; updatedAt: string;
  _count?: { members: number; dashboards: number };
  owner?: { id: string; name: string | null; email: string };
  myRole?: "OWNER" | "ADMIN" | "VIEWER" | null; // 当前用户在该团队的角色
}

interface Member {
  id: string; userId: string; teamId: string;
  role: "OWNER" | "ADMIN" | "VIEWER";
  joinedAt: string;
  user?: { id: string; email: string; name: string | null };
}

export function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [delMsg, setDelMsg] = useState("");

  const didLoad = useRef(false);

  async function fetchTeams() {
    setLoading(true);
    try {
      const res = await fetch("/api/teams"); const json = await res.json();
      if (json.success) setTeams(json.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    fetchTeams();
  }, []);

  // 团队列表加载后自动拉取所有成员
  useEffect(() => {
    teams.forEach((t) => { if (!members[t.id]) fetchMembers(t.id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (json.success) { setTeams((prev) => [json.data, ...prev]); setNewName(""); setCreating(false); }
      else setError(json.error || "创建失败");
    } catch { setError("网络错误"); }
  }

  async function fetchMembers(teamId: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`); const json = await res.json();
      if (json.success) setMembers((prev) => ({ ...prev, [teamId]: json.data?.members || json.data || [] }));
    } catch {}
  }

  async function handleInvite(teamId: string) {
    if (!inviteEmail.trim()) return;
    setInviteMsg("");
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: "VIEWER" }),
      });
      const json = await res.json();
      if (json.success) { fetchMembers(teamId); setInviteEmail(""); setInviteMsg(json.data ? "邀请已发送" : json.message || "已发送"); }
      else setInviteMsg(json.error || "邀请失败");
    } catch { setInviteMsg("网络错误"); }
  }

  async function handleAcceptInvite(invitationId: string, teamId: string) {
    await fetch(`/api/teams/${teamId}/members`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", invitationId }) });
    fetchTeams();
  }

  async function handleDeclineInvite(invitationId: string, teamId: string) {
    await fetch(`/api/teams/${teamId}/members`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decline", invitationId }) });
    fetchTeams();
  }

  async function handleChangeRole(teamId: string, memberId: string, newRole: string) {
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "changeRole", memberId, newRole }),
    });
    const json = await res.json();
    if (json.success) {
      fetchMembers(teamId);
    } else {
      alert(json.error || "操作失败");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  function toggleSel(id: string) { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setDelMsg(""); }
  function toggleAll() { if (selected.size === teams.length) setSelected(new Set()); else setSelected(new Set(teams.map((t) => t.id))); setDelMsg(""); }

  async function handleDelete(teamId: string, name: string) {
    if (!confirm(`确定删除团队「${name}」？将同时删除所有看板。`)) return;
    try {
      await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      setSelected((p) => { const n = new Set(p); n.delete(teamId); return n; });
    } catch {}
  }

  async function handleBatchDel() {
    if (selected.size === 0) { setDelMsg("请至少选中一个团队"); return; }
    // 仅允许删除自己为 OWNER 的团队
    const canDeleteIds = teams.filter((t) => t.myRole === "OWNER" && selected.has(t.id)).map((t) => t.id);
    if (canDeleteIds.length === 0) { setDelMsg("你没有权限删除所选团队（仅拥有者可删除）"); return; }
    if (!confirm(`确定删除选中的 ${canDeleteIds.length} 个团队？此操作不可撤销。`)) return;
    let c = 0;
    for (const id of canDeleteIds) { try { await fetch(`/api/teams/${id}`, { method: "DELETE" }); c++; } catch {} }
    setSelected(new Set()); setTeams((prev) => prev.filter((t) => !canDeleteIds.includes(t.id)));
    setDelMsg(`已删除 ${c} 个`); setTimeout(() => setDelMsg(""), 3000);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">团队管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理你的团队和成员权限</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> 创建团队
        </Button>
      </div>

      {/* 创建弹窗 */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCreating(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">创建团队</h2>
              <button onClick={() => setCreating(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
            </div>
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <Input label="团队名称" placeholder="例如：产品研发组" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreating(false)}>取消</Button>
              <Button onClick={handleCreate}>创建</Button>
            </div>
          </div>
        </div>
      )}

      {/* 团队列表 */}
      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="h-16 w-16" />
          <p className="mt-4 text-lg font-medium">暂无团队</p>
          <p className="mt-1 text-sm">创建你的第一个团队开始协作</p>
          <Button className="mt-4" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> 创建团队</Button>
        </div>
      ) : (
        <>
        {/* ─── 收到的邀请 ─── */}
        <InvitationsPanel onAccept={handleAcceptInvite} onDecline={handleDeclineInvite} />
        <div className="mb-3 flex items-center gap-3">
          <button onClick={toggleAll} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600">
            {selected.size === teams.length && teams.length > 0 ? <CheckSquare className="h-4 w-4 text-violet-600" /> : <Square className="h-4 w-4" />}
            全选 ({selected.size}/{teams.length})
          </button>
          {selected.size > 0 && <Button size="sm" variant="danger" onClick={handleBatchDel}><Trash2 className="mr-1 h-3.5 w-3.5" /> 删除选中 ({selected.size})</Button>}
          {delMsg && <span className={`text-xs ${delMsg.includes("请") ? "text-amber-500" : "text-green-600"}`}>{delMsg}</span>}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const isOwner = team.myRole === "OWNER";
            const isAdmin = team.myRole === "ADMIN";
            const canManage = isOwner || isAdmin; // 可管理看板
            const canDelete = isOwner; // 仅拥有者可删除团队

            return (
            <Card key={team.id} className={`${selected.has(team.id) ? "ring-2 ring-violet-400" : ""}`}>
              <button onClick={() => toggleSel(team.id)} className="absolute top-3 left-3 z-10 rounded p-0.5 text-gray-400 hover:text-violet-600">
                {selected.has(team.id) ? <CheckSquare className="h-4 w-4 text-violet-600" /> : <Square className="h-4 w-4" />}
              </button>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{team.name}</CardTitle>
                    <CardDescription>
                      {team._count?.members ?? 0} 成员 · {team._count?.dashboards ?? 0} 看板
                      {team.myRole && (
                        <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          isOwner ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          isAdmin ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {team.myRole === "OWNER" ? "拥有者" : team.myRole === "ADMIN" ? "管理员" : "观察者"}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {/* 仅 OWNER 可见删除按钮 */}
                  {canDelete && (
                    <button onClick={() => handleDelete(team.id, team.name)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="删除团队">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* 成员列表 + 角色修改 */}
                  {members[team.id] && members[team.id].length > 0 ? (
                    members[team.id].map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium truncate block">{m.user?.name || m.user?.email || m.userId}</span>
                          {m.role && (
                            <span className={`text-xs ${
                              m.role === "OWNER" ? "text-amber-600" : m.role === "ADMIN" ? "text-blue-600" : "text-gray-400"
                            }`}>
                              {m.role === "OWNER" ? "拥有者" : m.role === "ADMIN" ? "管理员" : "观察者"}
                            </span>
                          )}
                        </div>
                        {/* 仅 OWNER 可修改他人角色 */}
                        {isOwner ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeRole(team.id, m.id, e.target.value)}
                            className="ml-2 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs flex-shrink-0 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          >
                            <option value="OWNER">拥有者</option>
                            <option value="ADMIN">管理员</option>
                            <option value="VIEWER">观察者</option>
                          </select>
                        ) : (
                          <span className="ml-2 text-xs text-gray-400 flex-shrink-0">仅拥有者可改</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">暂无成员数据</p>
                  )}

                  {/* 邀请区域 — OWNER/ADMIN 可邀请 */}
                  {canManage && (
                    <div className="border-t border-gray-100 pt-2 dark:border-gray-700">
                      {inviting === team.id ? (
                        <div className="flex gap-2">
                          <Input placeholder="输入邮箱邀请成员" value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleInvite(team.id)} />
                          <Button size="sm" onClick={() => handleInvite(team.id)}>邀请</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setInviting(null); setInviteEmail(""); setInviteMsg(""); }}>
                            <X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <button onClick={() => { setInviting(team.id); setInviteMsg(""); }}
                          className="flex w-full items-center justify-center gap-1 rounded-lg p-2 text-xs text-gray-400 hover:bg-gray-50 hover:text-violet-600 dark:hover:bg-gray-800">
                          <UserPlus className="h-3.5 w-3.5" /> 邀请成员
                        </button>
                      )}
                      {inviteMsg && <p className={cn("mt-1 text-xs", inviteMsg === "邀请成功" ? "text-green-600" : "text-red-500")}>{inviteMsg}</p>}
                    </div>
                  )}
                </div>
                {/* 团队看板 — 传入权限 */}
                <TeamDashboards teamId={team.id} canManage={canManage} />
              </CardContent>
            </Card>
          );
          })}
        </div>
      </>
      )}
    </div>
  );
}

/** 团队看板子组件 — 支持权限控制 */
function TeamDashboards({ teamId, canManage }: { teamId: string; canManage: boolean }) {
  const [dashboards, setDashboards] = useState<any[]>([]);

  const fetchDashboards = () => {
    fetch(`/api/dashboards?teamId=${teamId}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setDashboards(json.data || []); });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDashboards(); }, [teamId]);

  async function handleDeleteDashboard(dashId: string, dashName: string) {
    if (!confirm(`确定删除看板「${dashName}」？`)) return;
    try {
      await fetch(`/api/dashboards/${dashId}`, { method: "DELETE" });
      setDashboards((prev) => prev.filter((d) => d.id !== dashId));
    } catch { alert("删除失败"); }
  }

  if (dashboards.length === 0) return null;
  return (
    <div className="border-t border-gray-100 pt-3 mt-3 dark:border-gray-700">
      <h4 className="text-xs font-medium text-gray-500 mb-2">团队看板 ({dashboards.length})</h4>
      <div className="space-y-1.5">
        {dashboards.slice(0, 8).map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 hover:bg-violet-50 dark:bg-gray-800 dark:hover:bg-violet-950/20 group">
            <Link href={`/dashboard/${d.id}`} className="flex-1 min-w-0">
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">{d.name}</span>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <Link href={`/dashboard/${d.id}`} className="rounded p-0.5 text-gray-400 hover:text-violet-500">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              {/* 仅 OWNER/ADMIN 可删除看板 */}
              {canManage && (
                <button onClick={() => handleDeleteDashboard(d.id, d.name)}
                  className="rounded p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除看板">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {dashboards.length > 8 && <p className="text-xs text-gray-400">...共 {dashboards.length} 个</p>}
      </div>
    </div>
  );
}

/** 收到的邀请面板 */
function InvitationsPanel({ onAccept, onDecline }: { onAccept: (invId: string, teamId: string) => void; onDecline: (invId: string, teamId: string) => void }) {
  const [invites, setInvites] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/user/invitations").then((r) => r.json()).then((json) => { if (json.success) setInvites(json.data); });
  }, []);

  if (invites.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
      <h3 className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-2">收到的邀请 ({invites.length})</h3>
      {invites.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between rounded-lg bg-white/80 p-2 mb-2 last:mb-0 dark:bg-gray-900/50">
          <div>
            <span className="text-sm font-medium">{inv.team?.name}</span>
            <span className="text-xs text-gray-400 ml-2">来自 {inv.inviter?.name || inv.inviter?.email}</span>
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={() => onAccept(inv.id, inv.teamId)}>接受</Button>
            <Button size="sm" variant="ghost" onClick={() => onDecline(inv.id, inv.teamId)}>拒绝</Button>
          </div>
        </div>
      ))}
    </div>
  );
}