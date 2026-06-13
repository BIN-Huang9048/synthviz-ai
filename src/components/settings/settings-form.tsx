/**
 * 设置页面客户端组件
 * 个人信息编辑 + 密码修改
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Lock, Save, CheckCircle2, AlertCircle } from "lucide-react";

interface SettingsFormProps {
  user: { id: string; name: string | null; email: string; role: string };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name || "");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // 密码修改
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  async function handleSaveProfile() {
    setProfileMsg(null); setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (json.success) { setProfileMsg({ type: "success", text: "姓名已更新" }); router.refresh(); }
      else setProfileMsg({ type: "error", text: json.error || "保存失败" });
    } catch { setProfileMsg({ type: "error", text: "网络错误" }); }
    finally { setSaving(false); }
  }

  async function handleChangePassword() {
    setPwMsg(null);
    if (newPw.length < 6) { setPwMsg({ type: "error", text: "新密码至少 6 位" }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "error", text: "两次密码不一致" }); return; }
    setChangingPw(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (json.success) { setPwMsg({ type: "success", text: "密码已修改" }); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
      else setPwMsg({ type: "error", text: json.error || "修改失败" });
    } catch { setPwMsg({ type: "error", text: "网络错误" }); }
    finally { setChangingPw(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">设置</h1>
        <p className="mt-1 text-sm text-gray-500">管理你的账户信息和安全设置</p>
      </div>

      {/* 个人信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><User className="h-5 w-5 text-violet-600" /><CardTitle>个人信息</CardTitle></div>
          <CardDescription>修改你的公开信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="邮箱" value={user.email} disabled hint="邮箱不可修改" />
          <Input label="姓名" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入你的姓名" />
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              {user.role === "ADMIN" ? "管理员" : "成员"}
            </span>
            <Button onClick={handleSaveProfile} isLoading={saving} size="sm"><Save className="h-4 w-4" /> 保存</Button>
          </div>
          {profileMsg && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${profileMsg.type === "success" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}>
              {profileMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {profileMsg.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Lock className="h-5 w-5 text-violet-600" /><CardTitle>修改密码</CardTitle></div>
          <CardDescription>建议使用至少 6 位的强密码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="当前密码" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="输入当前密码" />
          <Input label="新密码" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="至少 6 位" />
          <Input label="确认新密码" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="再次输入新密码" />
          <Button onClick={handleChangePassword} isLoading={changingPw} size="sm"><Lock className="h-4 w-4" /> 修改密码</Button>
          {pwMsg && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${pwMsg.type === "success" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`}>
              {pwMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {pwMsg.text}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}