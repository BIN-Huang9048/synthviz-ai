/**
 * 基于用户私有 AI 密钥的调用封装 v2
 * 从 aiProviders JSON 字段读取配置，支持任意供应商
 */

import prisma from "@/lib/prisma";

type AIProviderEntry = {
  id: string; name: string; apiKey: string; baseUrl: string;
  defaultModel: string; openaiCompat: boolean;
};

interface AICallOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── 内置供应商默认配置（无已存配置时使用） ──────────

const BUILTIN_DEFAULTS: Record<string, Partial<AIProviderEntry>> = {
  openai: { name: "OpenAI", defaultModel: "gpt-4o", baseUrl: "https://api.openai.com/v1", openaiCompat: true },
  anthropic: { name: "Anthropic Claude", defaultModel: "claude-sonnet-4-6", baseUrl: "https://api.anthropic.com/v1", openaiCompat: false },
  deepseek: { name: "DeepSeek", defaultModel: "deepseek-chat", baseUrl: "https://api.deepseek.com", openaiCompat: true },
};

// ─── 核心调用 ────────────────────────────────────────

export async function callAIWithUserKeys(
  userId: string,
  messages: AIMessage[],
  options: AICallOptions = {}
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProviders: true, preferredAiProvider: true, openaiApiKey: true, anthropicApiKey: true, deepseekApiKey: true },
  });
  if (!user) throw new Error("用户不存在");

  // 从 JSON 获取所有已配置供应商
  const stored: AIProviderEntry[] = (user.aiProviders as any[]) || [];

  // 向后兼容：从旧字段迁移到列表
  if (user.openaiApiKey && !stored.find((p) => p.id === "openai")) {
    stored.push({ id: "openai", name: "OpenAI", apiKey: user.openaiApiKey, baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o", openaiCompat: true });
  }
  if (user.anthropicApiKey && !stored.find((p) => p.id === "anthropic")) {
    stored.push({ id: "anthropic", name: "Anthropic Claude", apiKey: user.anthropicApiKey, baseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-4-6", openaiCompat: false });
  }
  if (user.deepseekApiKey && !stored.find((p) => p.id === "deepseek")) {
    stored.push({ id: "deepseek", name: "DeepSeek", apiKey: user.deepseekApiKey, baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-chat", openaiCompat: true });
  }

  if (stored.length === 0) throw new Error("未配置任何 AI 密钥，请在个人中心设置");

  // 确定使用的供应商
  const providerId = options.provider || (user.preferredAiProvider as string) || stored[0].id;
  const entry = stored.find((p) => p.id === providerId);
  if (!entry) throw new Error(`未找到供应商配置: ${providerId}`);
  if (!entry.apiKey) throw new Error(`未配置 ${entry.name} 密钥`);

  // 填充默认值
  const defaults = BUILTIN_DEFAULTS[providerId] || {};
  const cfg: AIProviderEntry = {
    id: entry.id, name: entry.name || defaults.name || entry.id,
    apiKey: entry.apiKey,
    baseUrl: entry.baseUrl || defaults.baseUrl || "",
    defaultModel: entry.defaultModel || defaults.defaultModel || "",
    openaiCompat: entry.openaiCompat ?? defaults.openaiCompat ?? true,
  };

  if (!cfg.openaiCompat) {
    return callAnthropic(cfg, messages, options);
  }
  return callOpenAICompat(cfg, messages, options);
}

// ─── OpenAI 兼容调用（OpenAI / DeepSeek 通用） ──────

async function callOpenAICompat(cfg: AIProviderEntry, messages: AIMessage[], options: AICallOptions): Promise<string> {
  const model = options.model || cfg.defaultModel;
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model, messages, temperature: options.temperature ?? 0.7 }),
  });
  const json: any = await res.json();
  if (json.error) throw new Error(`${cfg.name}: ${json.error.message}`);
  return json.choices[0]?.message?.content || "";
}

async function callAnthropic(cfg: AIProviderEntry, messages: AIMessage[], options: AICallOptions): Promise<string> {
  const model = options.model || cfg.defaultModel;
  const systemMsg = messages.filter((m) => m.role === "system");
  const conversation = messages.filter((m) => m.role !== "system");
  const res = await fetch(`${cfg.baseUrl}/messages`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, system: systemMsg.map((m) => m.content).join("\n\n") || undefined, messages: conversation.map((m) => ({ role: m.role, content: m.content })), max_tokens: 128000, temperature: options.temperature ?? 0.7 }),
  });
  const json: any = await res.json();
  if (json.error) throw new Error(`Claude: ${json.error.message}`);
  return json.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") || "";
}

// ─── 工具函数 ────────────────────────────────────────

export async function userHasAIKeys(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProviders: true, openaiApiKey: true, anthropicApiKey: true, deepseekApiKey: true },
  });
  const stored: any[] = (user?.aiProviders as any[]) || [];
  const hasStored = stored.some((p: any) => !!p.apiKey);
  const hasLegacy = !!(user?.openaiApiKey || user?.anthropicApiKey || user?.deepseekApiKey);
  return hasStored || hasLegacy;
}
