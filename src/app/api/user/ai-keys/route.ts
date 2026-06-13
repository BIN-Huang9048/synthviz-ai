/**
 * 用户 AI 密钥管理 API v3 — 基于 aiProviders JSON 存储
 * GET    /api/user/ai-keys       — 获取所有供应商配置（密钥掩码）
 * PUT    /api/user/ai-keys       — 保存/更新某个供应商配置
 * DELETE /api/user/ai-keys       — 删除指定供应商配置 ?providerId=xxx
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── 内置供应商定义 ──────────────────────────────────

type ProviderDef = {
  id: string; name: string; icon: string;
  defaultBaseUrl: string; defaultModel: string;
  models: string[]; openaiCompat: boolean;
  description: string;
};

const BUILTIN: ProviderDef[] = [
  { id: "openai", name: "OpenAI", icon: "🧠", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o", models: ["gpt-4o","gpt-4-turbo","gpt-3.5-turbo"], openaiCompat: true, description: "支持 GPT-4o / GPT-4-turbo / GPT-3.5-turbo" },
  { id: "anthropic", name: "Anthropic Claude", icon: "🔮", defaultBaseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-4-6", models: ["claude-sonnet-4-6","claude-opus-4-8","claude-haiku-4-5"], openaiCompat: false, description: "支持 Claude 3.5 Sonnet / Claude 3 Opus" },
  { id: "deepseek", name: "DeepSeek", icon: "🐋", defaultBaseUrl: "https://api.deepseek.com", defaultModel: "deepseek-chat", models: ["deepseek-chat","deepseek-reasoner"], openaiCompat: true, description: "DeepSeek-V3 / DeepSeek-R1，兼容 OpenAI 接口" },
  { id: "qwen", name: "通义千问", icon: "☁️", defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultModel: "qwen-turbo", models: ["qwen-plus","qwen-turbo","qwen-long"], openaiCompat: true, description: "支持 Qwen-Plus / Qwen-Turbo / Qwen-Long，兼容 OpenAI 接口" },
  { id: "doubao", name: "豆包", icon: "🫘", defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3", defaultModel: "doubao-lite-4k", models: ["doubao-lite-4k","doubao-pro-4k"], openaiCompat: true, description: "支持 Doubao-Lite / Doubao-Pro，兼容 OpenAI 接口" },
  { id: "ernie", name: "文心一言", icon: "🐻", defaultBaseUrl: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions", defaultModel: "ernie-4.0-8k", models: ["ernie-4.0-8k","ernie-3.5-8k","ernie-speed-8k"], openaiCompat: true, description: "支持 ERNIE-4.0 / ERNIE-3.5，兼容 OpenAI 接口" },
  { id: "kimi", name: "Kimi", icon: "🌙", defaultBaseUrl: "https://api.moonshot.cn/v1", defaultModel: "moonshot-v1-8k", models: ["moonshot-v1-8k","moonshot-v1-32k","moonshot-v1-128k"], openaiCompat: true, description: "支持 Moonshot-v1-8k / 32k / 128k，兼容 OpenAI 接口" },
];

function maskKey(key: string | null): string | null {
  if (!key || key.length < 8) return key;
  return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4);
}

// ─── GET: 返回供应商列表 + 已配置密钥 ────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const userId = (session.user as Record<string, unknown>).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProviders: true, preferredAiProvider: true, openaiApiKey: true, anthropicApiKey: true, deepseekApiKey: true },
  });

  // 解析已存储的配置
  const stored: any[] = (user?.aiProviders as any[]) || [];

  // 向后兼容：从旧字段获取已有密钥
  const legacyKeys: Record<string, string|null> = {
    openai: user?.openaiApiKey || null,
    anthropic: user?.anthropicApiKey || null,
    deepseek: user?.deepseekApiKey || null,
  };

  // 合并内置供应商 + 已配置状态
  const providers = BUILTIN.map((def) => {
    const saved = stored.find((s: any) => s.id === def.id);
    const hasKey = !!saved?.apiKey || !!legacyKeys[def.id];
    const { defaultBaseUrl, defaultModel, ...rest } = def;
    return {
      ...rest,
      configured: hasKey,
      apiKeyMasked: hasKey ? "****" : null,
      baseUrl: saved?.baseUrl || defaultBaseUrl,
      defaultModel: saved?.defaultModel || defaultModel,
    };
  });

  // 附加用户自定义供应商
  const custom = stored.filter((s: any) => !BUILTIN.find((d) => d.id === s.id)).map((s: any) => ({
    id: s.id,
    name: s.name,
    icon: "⚡",
    defaultBaseUrl: s.baseUrl || "",
    defaultModel: s.defaultModel || "",
    models: [s.defaultModel].filter(Boolean),
    openaiCompat: s.openaiCompat !== false,
    description: "自定义供应商",
    configured: !!s.apiKey,
    apiKeyMasked: maskKey(s.apiKey || null),
    baseUrl: s.baseUrl || "",
  }));

  return NextResponse.json({
    success: true,
    data: [...providers, ...custom],
    preferred: user?.preferredAiProvider || null,
  });
}

// ─── PUT: 保存/更新供应商配置 ─────────────────────────

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const userId = (session.user as Record<string, unknown>).id as string;

  const body = await request.json();
  const { providerId, apiKey, baseUrl, defaultModel, name, openaiCompat } = body;

  if (!providerId) return NextResponse.json({ success: false, error: "缺少 providerId" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiProviders: true } });
  const stored: any[] = (user?.aiProviders as any[]) || [];

  const idx = stored.findIndex((p: any) => p.id === providerId);
  const def = BUILTIN.find((d) => d.id === providerId);

  const entry = {
    id: providerId,
    name: name || def?.name || providerId,
    apiKey: apiKey || (idx >= 0 ? stored[idx].apiKey : ""),
    baseUrl: baseUrl || def?.defaultBaseUrl || "",
    defaultModel: defaultModel || def?.defaultModel || "",
    openaiCompat: openaiCompat ?? def?.openaiCompat ?? true,
  };

  if (idx >= 0) {
    stored[idx] = entry;
  } else {
    stored.push(entry);
  }

  // 同时更新旧版独立字段以保持兼容
  const legacyUpdate: Record<string, string | null> = {};
  if (providerId === "openai") legacyUpdate.openaiApiKey = apiKey || null;
  if (providerId === "anthropic") legacyUpdate.anthropicApiKey = apiKey || null;
  if (providerId === "deepseek") legacyUpdate.deepseekApiKey = apiKey || null;

  await prisma.user.update({
    where: { id: userId },
    data: { aiProviders: stored, ...legacyUpdate },
  });

  return NextResponse.json({ success: true, message: "配置已保存" });
}

// ─── DELETE: 删除供应商配置 ──────────────────────────

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  const userId = (session.user as Record<string, unknown>).id as string;

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiProviders: true } });
  let stored: any[] = (user?.aiProviders as any[]) || [];

  if (providerId) {
    stored = stored.filter((p: any) => p.id !== providerId);
  } else {
    stored = [];
  }

  const legacyUpdate: Record<string, null> = {};
  if (!providerId || providerId === "openai") legacyUpdate.openaiApiKey = null;
  if (!providerId || providerId === "anthropic") legacyUpdate.anthropicApiKey = null;
  if (!providerId || providerId === "deepseek") legacyUpdate.deepseekApiKey = null;

  await prisma.user.update({
    where: { id: userId },
    data: { aiProviders: stored, ...legacyUpdate },
  });

  return NextResponse.json({ success: true, message: "配置已删除" });
}
