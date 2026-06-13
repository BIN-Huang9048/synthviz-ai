"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Key, Trash2, TestTube, Shield, AlertCircle, CheckCircle2, Eye, EyeOff, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Provider = {
  id: string; name: string; icon: string;
  defaultBaseUrl: string; defaultModel: string;
  models: string[]; openaiCompat: boolean;
  description: string;
  configured: boolean; apiKeyMasked: string | null;
  baseUrl: string;
};

export function AIKeysForm() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 当前选中供应商的表单
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customId, setCustomId] = useState("");
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    fetch("/api/user/ai-keys").then((r) => r.json()).then((json) => {
      if (json.success) {
        setProviders(json.data);
        if (json.data.length > 0 && !selectedId) setSelectedId(json.data[0].id);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = providers.find((p) => p.id === selectedId);

  // 切换供应商时初始化表单
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    if (selected) {
      setApiKey(selected.apiKeyMasked || "");
      setBaseUrl(selected.baseUrl || selected.defaultBaseUrl || "");
      setModel(selected.defaultModel || "");
      setShowKey(false);
      setMsg(null);
    }
  }, [selectedId, selected?.id]);

  async function handleSave() {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/user/ai-keys", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: selectedId,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
          defaultModel: model || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setProviders((prev) => prev.map((p) => p.id === selectedId ? { ...p, configured: true, apiKeyMasked: "****" + (apiKey.slice(-4) || "****") } : p));
        setMsg({ type: "success", text: "配置已保存" });
      } else {
        setMsg({ type: "error", text: json.error });
      }
    } catch { setMsg({ type: "error", text: "保存失败" }); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`确定删除「${selected?.name}」的密钥配置？`)) return;
    try {
      await fetch(`/api/user/ai-keys?providerId=${selectedId}`, { method: "DELETE" });
      setProviders((prev) => prev.map((p) => p.id === selectedId ? { ...p, configured: false, apiKeyMasked: null } : p));
      setApiKey(""); setMsg({ type: "success", text: "配置已删除" });
    } catch { setMsg({ type: "error", text: "删除失败" }); }
  }

  async function handleTest() {
    setTesting(true); setMsg(null);
    try {
      // 先保存密钥，再测试连接
      await fetch("/api/user/ai-keys", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: selectedId, apiKey: apiKey || undefined, baseUrl: baseUrl || undefined, defaultModel: model || undefined }),
      });
      const res = await fetch("/api/user/ai-keys/test", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setProviders((prev) => prev.map((p) => p.id === selectedId ? { ...p, configured: true } : p));
        setMsg({ type: "success", text: "连接成功！" });
      } else {
        setMsg({ type: "error", text: json.error || "连接失败" });
      }
    } catch { setMsg({ type: "error", text: "测试请求失败" }); }
    finally { setTesting(false); }
  }

  function handleAddCustom() {
    if (!customId.trim() || !customName.trim()) return;
    const newProvider: Provider = {
      id: customId.trim().toLowerCase().replace(/\s+/g, "-"),
      name: customName.trim(), icon: "⚡",
      defaultBaseUrl: "", defaultModel: "",
      models: [], openaiCompat: true, description: "自定义供应商",
      configured: false, apiKeyMasked: null, baseUrl: "",
    };
    setProviders((prev) => [...prev, newProvider]);
    setSelectedId(newProvider.id);
    setShowCustomForm(false);
    setCustomId(""); setCustomName("");
  }

  if (loading) {
    return <div className="flex min-h-[300px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">API 密钥设置</h1>
        <p className="mt-1 text-sm text-gray-500">配置你的私有大模型 API 密钥，各模型密钥独立存储，只需配置你想用的模型即可</p>
      </div>

      {/* 安全提示 */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
        <Shield className="mt-0.5 h-5 w-5 text-violet-600" />
        <p className="text-sm text-violet-800 dark:text-violet-300">密钥加密存储在你的账号下，仅用于你的 AI 功能调用</p>
      </div>

      {/* 主体：左侧供应商列表 + 右侧配置表单 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── 左侧：供应商列表 ─── */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">供应商</h3>
            <button onClick={() => setShowCustomForm(!showCustomForm)}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-500 font-medium">
              <Plus className="h-3 w-3" /> 自定义
            </button>
          </div>

          {/* 自定义供应商表单 */}
          {showCustomForm && (
            <div className="rounded-xl border border-violet-200 bg-white p-3 space-y-2 dark:border-violet-800 dark:bg-gray-900">
              <Input placeholder="供应商 ID (如: qwen)" value={customId} onChange={(e) => setCustomId(e.target.value)} className="text-xs" />
              <Input placeholder="显示名称 (如: 通义千问)" value={customName} onChange={(e) => setCustomName(e.target.value)} className="text-xs" />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleAddCustom} disabled={!customId || !customName}>添加</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCustomForm(false)}>取消</Button>
              </div>
            </div>
          )}

          {/* 供应商列表 */}
          <div className="space-y-1">
            {providers.map((p) => (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200",
                  selectedId === p.id
                    ? "border-2 border-violet-400 bg-violet-50 shadow-[0_0_12px_rgba(124,58,237,0.15)] dark:border-violet-500 dark:bg-violet-950/40"
                    : "border-2 border-transparent bg-white hover:border-gray-200 dark:bg-gray-900 dark:hover:border-gray-700"
                )}>
                <span className="text-2xl">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</span>
                    {p.configured && <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0 pulse-dot online" title="已配置" />}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{p.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* ─── 右侧：配置表单 ─── */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card><CardContent className="py-10 text-center text-gray-400 text-sm">请从左侧选择一个 AI 供应商</CardContent></Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selected.icon}</span>
                    <div>
                      <CardTitle>{selected.name}</CardTitle>
                      <CardDescription>{selected.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {selected.configured && (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        ✓ 已配置
                      </span>
                    )}
                    {selected.configured && (
                      <button onClick={handleDelete} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="删除配置">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* API Key */}
                <div className="relative">
                  <Input label="API Key" type={showKey ? "text" : "password"}
                    value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    placeholder={selected.configured ? "••••••••（已保存，仅需修改时填写）" : `输入 ${selected.name} API Key...`} />
                  <button onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-8 rounded p-1 text-gray-400 hover:text-gray-600">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Base URL */}
                <Input label="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={selected.defaultBaseUrl} hint="默认使用官方地址，可修改为代理/私有化地址" />

                {/* 模型选择 */}
                {selected.models.length > 0 && (
                  <div className="w-full">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">默认模型</label>
                    <select value={model} onChange={(e) => setModel(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                      {selected.models.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}

                {!selected.models.length && (
                  <Input label="模型名称" value={model} onChange={(e) => setModel(e.target.value)}
                    placeholder="输入模型名称，如：gpt-4o" hint="自定义供应商需手动填写模型名" />
                )}

                {/* 操作按钮 */}
                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={handleSave} isLoading={saving}><Key className="mr-1.5 h-4 w-4" /> 保存</Button>
                  <Button onClick={handleTest} isLoading={testing} disabled={!selected.configured && !apiKey} variant="outline">
                    <TestTube className="mr-1.5 h-4 w-4" /> 测试连接
                  </Button>
                </div>

                {/* 结果提示 */}
                {msg && (
                  <div className={cn("flex items-center gap-2 rounded-xl p-4 text-sm",
                    msg.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400")}>
                    {msg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {msg.text}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
