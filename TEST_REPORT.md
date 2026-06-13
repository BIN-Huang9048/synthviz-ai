# 锐鹰数视 (RuiYing) — 全面功能测试报告

> **测试日期**: 2026-06-13
> **测试范围**: 全量代码审查（静态分析，未执行运行时测试）
> **测试方法**: 逐文件阅读、接口契约检查、数据流追踪、权限矩阵验证
> **测试文件数**: 75+ 源文件
> **总体评估**: ⚠️ 基本可用，存在若干安全与权限缺陷需修复

---

## 一、系统架构概览

| 层级 | 技术栈 | 文件数 |
|------|--------|--------|
| 框架 | Next.js 15.5 (App Router) | — |
| 语言 | TypeScript 5 + React 19 | 28 组件 |
| 数据库 | PostgreSQL + Prisma 7 + pg Pool | 8 模型 |
| 认证 | NextAuth v5 (JWT + JWE Cookie) | 1 配置 + 1 中间件 |
| AI 集成 | 多供应商 (OpenAI/Claude/DeepSeek/通义千问/豆包/文心/Kimi + 自定义) | 6 API |
| 图表 | Recharts 3.8 | 5 组件 |
| 缓存 | localForage (IndexedDB) | 1 工具 |
| 样式 | Tailwind CSS v4 + CSS Variables | — |

---

## 二、功能清单与测试状态

### 2.1 用户系统

| 功能点 | 状态 | 说明 |
|--------|------|------|
| 邮箱注册 | ✅ 正常 | `POST /api/auth/register`，bcryptjs 12轮盐值哈希，Zod 校验 |
| 邮箱登录 | ✅ 正常 | NextAuth v5 Credentials Provider，JWT 策略 |
| 会话持久化 | ✅ 正常 | JWE 加密 Cookie (`authjs.session-token`) |
| 路由守卫 (Middleware) | ⚠️ 有风险 | 见 3.1 |
| 个人信息修改 | ✅ 正常 | `PUT /api/user/profile` |
| 密码修改 | ✅ 正常 | `PUT /api/user/password`，需验证当前密码 |
| 登出 | ✅ 正常 | `signOut()` → 清除 Cookie → 跳转登录页 |
| AI 密钥管理 | ✅ 正常 | 7 内置供应商 + 自定义，支持保存/删除/测试连接 |
| 密钥存储 | ✅ 正常 | `aiProviders` JSON 字段，向后兼容旧版独立字段 |

### 2.2 AI 智能查询

| 功能点 | 状态 | 说明 |
|--------|------|------|
| 自然语言查询 | ✅ 正常 | `POST /api/ai/query`，支持文件 CSV 和 DB 表数据源 |
| 关键词降级 | ✅ 正常 | 未配 AI 密钥或 AI 失败时，按关键词匹配趋势/对比/占比/列表 |
| 模拟数据兜底 | ✅ 正常 | `generateMockData()` 生成 7d/30d/90d 时间序列 |
| 查询界面 | ✅ 正常 | `AIQueryBox`：文件/DB 标签切换，两级联动选表，示例问题 |
| 图表渲染 | ✅ 正常 | 支持 LINE/BAR/PIE/TABLE 四种图表 |

### 2.3 数据看板

| 功能点 | 状态 | 说明 |
|--------|------|------|
| 看板列表 | ✅ 正常 | `GET /api/dashboards`，分页查询，支持按 teamId 过滤 |
| 看板创建 | ✅ 正常 | `POST /api/dashboards`，自动创建团队（如不存在） |
| 看板详情 | ✅ 正常 | `GET /api/dashboards/[id]`，含 widgets 排序 |
| 看板更新 | ⚠️ 权限缺陷 | 见 3.3 |
| 看板删除 | ⚠️ 权限缺陷 | 见 3.3 |
| AI 创建看板 | ✅ 正常 | 完整流程：选数据源 → AI 分析字段 → 推荐可视化需求 → 生成看板 |
| 看板缓存 | ✅ 正常 | localForage IndexedDB，读取/写入/清除，完整性校验 |
| 响应式布局 | ✅ 正常 | 1列(手机) → 2列(平板) → 12列网格(桌面) |
| 批量删除 | ✅ 正常 | 多选 + 批量删除看板 |
| 强制刷新 | ✅ 正常 | 清除缓存 → 重新调用 AI process-data |

### 2.4 团队管理

| 功能点 | 状态 | 说明 |
|--------|------|------|
| 创建团队 | ✅ 正常 | `POST /api/teams`，自动创建 OWNER 成员记录 |
| 团队列表 | ✅ 正常 | `GET /api/teams`，含 `myRole` 字段 |
| 删除团队 | ✅ 正常 | API 层面校验仅 OWNER 可删除 |
| 成员列表 | ✅ 正常 | `GET /api/teams/[id]/members`，含待处理邀请 |
| 邀请成员 | ⚠️ API 权限缺陷 | 见 3.4 |
| 接受/拒绝邀请 | ✅ 正常 | `PUT /api/teams/[id]/members`，校验邀请归属 |
| 修改角色 | ✅ 正常 | API 校验仅 OWNER 可修改 |
| 角色徽章 | ✅ 正常 | OWNER(金色)/ADMIN(蓝色)/VIEWER(灰色) |

### 2.5 消息通知

| 功能点 | 状态 | 说明 |
|--------|------|------|
| 邀请通知 | ✅ 正常 | Navbar 铃铛图标 + 红点计数 |
| 通知面板 | ✅ 正常 | 接受/拒绝按钮，点击外部关闭 |
| 邀请面板 | ✅ 正常 | 团队管理页面顶部显示待处理邀请 |
| 邀请 API | ✅ 正常 | `GET /api/user/invitations` 返回待处理邀请 |

### 2.6 权限控制

| 功能点 | 状态 | 说明 |
|--------|------|------|
| 路由守卫 (页面) | ✅ 正常 | 未登录重定向到 `/auth/signin?callbackUrl=...` |
| 路由守卫 (API) | ✅ 正常 | 未登录返回 401 JSON |
| 团队角色 (OWNER) | ✅ 正常 | 可修改角色、删除团队、邀请成员、管理看板 |
| 团队角色 (ADMIN) | ⚠️ API 不完整 | 见 3.3, 3.4 |
| 团队角色 (VIEWER) | ✅ 正常 | 只读查看，UI 已正确限制 |
| 数据源隔离 | ✅ 正常 | 用户只能访问自己的数据源 |

### 2.7 看板持久化

| 功能点 | 状态 | 说明 |
|--------|------|------|
| IndexedDB 读写 | ✅ 正常 | localForage 独立实例 `ruiying_dashboards/dashboard_cache` |
| 缓存校验 | ✅ 正常 | 检查 dashboardId、widgets 非空、每个 widget 含 widgetId+data |
| 脏数据清理 | ✅ 正常 | 校验失败自动 removeItem |
| 缓存写入时机 | ✅ 正常 | AI 成功返回后写入，创建看板后写入 |
| 缓存读取时机 | ✅ 正常 | 打开看板详情页优先读缓存 |
| 强制刷新 | ✅ 正常 | 先 clearCache → 调 AI → 写新缓存 |
| 竞态修复 | ✅ 正常 | `skipNextFetch` ref 避免 fetchWidgetData 与缓存路径冲突 |

### 2.8 数据源管理

| 功能点 | 状态 | 说明 |
|--------|------|------|
| 文件上传 (CSV) | ✅ 正常 | 客户端解析 CSV/Excel (xlsx库)，Base64 编码存储 |
| 文件上传 (Excel) | ✅ 正常 | 支持 .xlsx/.xls |
| DB 连接 (MySQL) | ✅ 正常 | 动态导入 mysql2，SHOW TABLES |
| DB 连接 (PostgreSQL) | ✅ 正常 | 动态导入 pg，查询 information_schema.tables |
| DB 连接 (ClickHouse) | ✅ 正常 | HTTP 接口，Basic Auth |
| DB 连接 (Elasticsearch) | ✅ 正常 | HTTP 接口，_cat/indices |
| DB 连接 (其他5种) | ✅ 正常 | 返回驱动安装指引 |
| 测试后创建 | ✅ 正常 | 前端强制 test-before-create，按钮 disabled + 文案提示 |
| 表列表缓存 | ✅ 正常 | 测试成功后 tableList 写入 DbSource |
| 批量删除 | ✅ 正常 | 多选 + 批量删除 |
| 密码保护 | ⚠️ 明文存储 | 见 3.6 |

---

## 三、发现的问题与风险

### 🔴 3.1 严重：Middleware 硬编码 AUTH_SECRET 回退值

**文件**: [src/middleware.ts:12](src/middleware.ts#L12)
```typescript
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-production-abc123xyz";
```

**问题**: 如果生产环境未设置 `AUTH_SECRET` 环境变量，系统会使用硬编码的弱密钥。攻击者可以伪造 JWE Cookie 绕过认证。

**风险等级**: 🔴 严重
**建议**: 移除硬编码回退值，在启动时强制校验 `AUTH_SECRET` 必须存在且长度 ≥ 32 字符。

---

### 🔴 3.2 严重：数据库密码明文存储

**文件**: [src/app/api/datasources/route.ts:56](src/app/api/datasources/route.ts#L56)
```typescript
dbSource: db ? { create: { ..., dbPwd: db.dbPwd, ... } } : undefined
```

**问题**: 外部数据库连接密码直接以明文存入 `DbSource` 表的 `db_pwd` 字段。数据库泄露即意味着所有外部数据源密码泄露。

**风险等级**: 🔴 严重
**建议**: 使用 `crypto.createCipheriv` (AES-256-GCM) 加密存储，密钥从环境变量读取；API 返回时脱敏（仅返回 `****`）。

---

### 🟡 3.3 中等：Dashboard API 权限与 UI 不一致

**文件**: 
- [src/app/api/dashboards/[id]/route.ts:81](src/app/api/dashboards/[id]/route.ts#L81) (PUT)
- [src/app/api/dashboards/[id]/route.ts:138](src/app/api/dashboards/[id]/route.ts#L138) (DELETE)

```typescript
if (existing.userId !== (session.user as any).id) {
  return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
}
```

**问题**: API 仅允许看板创建者（userId）编辑/删除。但 UI 端 (`team-manager.tsx:353`) 对 ADMIN 角色显示了删除按钮，ADMIN 点击删除会收到 403 错误。

**风险等级**: 🟡 中等
**建议**: API 层增加团队角色检查：OWNER 或 ADMIN 均可编辑/删除团队看板。

---

### 🟡 3.4 中等：邀请 API 缺少权限校验

**文件**: [src/app/api/teams/[id]/members/route.ts:35-64](src/app/api/teams/[id]/members/route.ts#L35-L64) (POST)

```typescript
export async function POST(request: Request, { params }) {
  // ... 验证登录 ...
  // ❌ 缺少：检查 inviter 是否是团队的 OWNER 或 ADMIN
  const inv = await prisma.invitation.create({ ... });
}
```

**问题**: API 层未校验邀请人是否有邀请权限。虽然 UI 对 VIEWER 隐藏了邀请按钮，但 VIEWER 可以直接调用 API 发送邀请。

**风险等级**: 🟡 中等
**建议**: 在 POST 处理中加入：查询当前用户在团队的角色，仅 OWNER/ADMIN 可发送邀请。

---

### 🟡 3.5 中等：数据源密码在 GET 响应中已正确脱敏但 DB 密码仍需加密

**文件**: [src/app/api/datasources/route.ts:27](src/app/api/datasources/route.ts#L27)

**正面发现**: GET 响应确实已排除 `dbPwd`：
```typescript
dbSource: s.dbSource ? { dbType: ..., host: ..., port: ..., dbName: ..., dbUser: ..., tableList: ... } : null
// ✅ 无 dbPwd
```

但正如 3.2 所述，数据库中存储的是明文。GET 响应安全，但数据库不安全。

---

### 🟡 3.6 低-中：AI API 中数据源权限检查的控制流不清晰

**文件**: [src/app/api/ai/query/route.ts:92-131](src/app/api/ai/query/route.ts#L92-L131)

```typescript
if (!ds || ds.userId !== userId) { /* 静默跳过 */ }
// 空 if 体，然后继续 else if 链
else if (ds.type === "file" && ds.fileSource?.fileUrl) { ... }
else if (ds.type === "external_db" && ds.dbSource && tableName) { ... }
```

**问题**: 权限拒绝依赖于空的 if 块 + else if 链的语义 —— 虽然功能正确（未授权用户拿不到数据），但控制流隐晦，容易在重构时引入漏洞。

**风险等级**: 🟢 低
**建议**: 显式 return 403 或使用早返回模式。

---

### 🟢 3.7 低：Back Arrow 按钮亮色模式样式异常

**文件**: [src/components/dashboard/dashboard-detail-view.tsx:273-275](src/components/dashboard/dashboard-detail-view.tsx#L273-L275)

```tsx
<Link href="/dashboard"
  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
>
```

**问题**: `hover:bg-slate-800/50` 和 `hover:text-slate-300` 是纯暗色模式样式，在亮色背景下悬停时会出现深色背景 + 浅色文字，与页面亮色主题不协调。

**风险等级**: 🟢 低（仅影响 UI 美观）
**建议**: 改为 `hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800/50 dark:hover:text-slate-300`

---

### 🟢 3.8 低：看板数据可能过期

**文件**: [src/lib/dashboard-cache.ts](src/lib/dashboard-cache.ts)

**问题**: 缓存没有 TTL（过期时间）机制。对于数据库表数据源，数据可能已更新但看板仍显示旧缓存。用户需要手动点击"刷新数据"才能获取最新数据。

**风险等级**: 🟢 低
**建议**: 增加可选 TTL 配置（如 30 分钟），在 `getCachedDashboard` 中检查 `cachedAt` 与当前时间的差值。

---

### 🟢 3.9 低：缺少 API 速率限制

**问题**: 所有 API 路由（特别是 AI 相关）没有速率限制。恶意用户可高频调用 AI API 消耗大量 token 费用。

**风险等级**: 🟢 低（需要用户自己的 API Key，自担成本）
**建议**: 为 AI API 增加基于用户 ID 的速率限制（如每分钟 10 次）。

---

### 📘 3.10 信息：多次类型断言为 any

**涉及文件**: 所有 API 路由文件，`dashboard-detail-view.tsx`

```typescript
const userId = (session.user as Record<string, unknown>).id as string;
const userId = (session.user as any).id;
```

**问题**: 每次访问 `session.user.id` 都需要类型断言。这表明 NextAuth 类型扩展未正确配置。虽然不影响功能，但降低了类型安全性。

**建议**: 在 `src/types/next-auth.d.ts` 中声明模块扩展：
```typescript
declare module "next-auth" {
  interface User { id: string; role: string; }
  interface Session { user: User & { id: string; role: string; }; }
}
```

---

## 四、权限矩阵验证

### 4.1 UI 层

| 操作 | OWNER | ADMIN | VIEWER |
|------|-------|-------|--------|
| 查看团队 | ✅ | ✅ | ✅ |
| 查看成员 | ✅ | ✅ | ✅ |
| 查看看板 | ✅ | ✅ | ✅ |
| 邀请成员 | ✅ (按钮可见) | ✅ (按钮可见) | ❌ (隐藏) |
| 删除看板 | ✅ (按钮可见) | ✅ (按钮可见) | ❌ (隐藏) |
| 修改成员角色 | ✅ (下拉可用) | ❌ (显示"仅拥有者可改") | ❌ (显示"仅拥有者可改") |
| 删除团队 | ✅ (按钮可见) | ❌ (隐藏) | ❌ (隐藏) |

### 4.2 API 层

| 操作 | API 校验逻辑 | 与 UI 一致性 |
|------|-------------|-------------|
| 删除团队 | `team.ownerId !== userId` → 403 | ✅ 一致 |
| 修改角色 | 查询当前用户是否为 OWNER | ✅ 一致 |
| 邀请成员 | **无角色校验** | ❌ 不一致 (UI 限制但 API 未限制) |
| 删除看板 | `existing.userId !== userId` → 403 | ❌ 不一致 (UI 允许 ADMIN 操作但 API 拒绝) |
| 编辑看板 | `existing.userId !== userId` → 403 | ❌ 同上 |

---

## 五、功能完整度总结

| 模块 | 完整度 | 备注 |
|------|--------|------|
| 用户认证 | 95% | 功能完备，Middleware 安全问题待修 |
| AI 查询 | 90% | 支持文件和 DB，关键词降级兜底良好 |
| AI 创建看板 | 95% | 端到端流程完整，字段分析准确 |
| 数据看板 CRUD | 90% | 基本完备，ADMIN 权限待修复 |
| 团队管理 | 85% | 邀请 API 缺少权限校验 |
| 通知系统 | 80% | 仅支持邀请通知，无系统公告/数据告警 |
| 数据源管理 | 85% | 4/9 数据库支持，密码加密缺失 |
| 看板缓存 | 90% | localForage 实现稳固，缺 TTL |
| 图表渲染 | 95% | 5 种图表类型，响应式布局 |
| API 密钥管理 | 95% | 7 内置 + 自定义供应商，体验良好 |

**总体完整度**: ~90%

---

## 六、建议修复优先级

| 优先级 | 问题 | 影响 |
|--------|------|------|
| P0 | Middleware AUTH_SECRET 硬编码回退 | 认证可被绕过 |
| P0 | DB 密码明文存储 | 数据源凭据泄露 |
| P1 | Dashboard API 缺少 ADMIN 权限 | 团队管理员无法执行 UI 允许的操作 |
| P1 | 邀请 API 缺少权限校验 | VIEWER 可绕过 UI 限制发送邀请 |
| P2 | AI API 数据源权限控制流不清晰 | 重构风险 |
| P2 | 缺少 API 速率限制 | AI token 滥用风险 |
| P3 | Back Arrow 按钮亮色模式样式 | UI 不协调 |
| P3 | 看板缓存缺少 TTL | 数据可能过时 |
| P3 | 类型断言过于频繁 | 代码质量 |
