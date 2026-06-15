# 锐鹰数视 (RuiYing) — AI 智能数据可视化平台

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Prisma-7-darkblue?logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<p align="center">
  <b>上传数据 → AI 分析字段 → 智能推荐可视化需求 → 一键生成交互式数据看板</b>
</p>

---

## 📖 目录

- [项目简介](#-项目简介)
- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [部署指南](#-部署指南)
- [项目结构](#-项目结构)
- [使用说明](#-使用说明)
- [API 参考](#-api-参考)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## 📖 项目简介

<a href="https://synthviz-ai.vercel.app" target="_blank">
  <img src="https://img.shields.io/badge/在线演示-点击体验-blue?style=for-the-badge&logo=vercel" alt="在线演示">
</a>

![演示](testipmtyui.gif)

**锐鹰数视** 是一个 AI 智能数据可视化平台。用户只需上传数据集（CSV / Excel）或连接外部数据库，AI 即可自动分析字段结构、智能推荐可视化需求，并一键生成包含折线图、柱状图、饼图、表格、统计卡片的交互式数据看板。

### 核心价值

- **零门槛数据分析** — 无需编写 SQL 或配置图表，自然语言即可完成数据探索
- **AI 驱动的看板生成** — 从字段识别到可视化推荐，全流程 AI 自动化
- **团队协作开箱即用** — 三级角色权限（OWNER / ADMIN / VIEWER），邀请制团队管理
- **多数据源统一接入** — 支持 CSV / Excel 文件上传 + 9 种外部数据库直连
- **多 AI 供应商灵活切换** — 内置 OpenAI、Claude、DeepSeek、通义千问、豆包、文心一言、Kimi 七大供应商，支持自定义 OpenAI 兼容接口

### 典型应用场景

| 场景 | 说明 |
|------|------|
| **电商运营** | 导入订单 CSV → AI 分析销售趋势、地区分布、品类占比 |
| **SaaS 数据看板** | 连接 PostgreSQL 业务库 → 实时监控用户增长、留存、付费转化 |
| **金融风控** | 上传交易流水 → AI 识别异常波动、生成风险指标卡片 |
| **学术研究** | Excel 实验数据 → AI 统计分析、可视化呈现研究结果 |
| **团队 BI** | 创建团队看板 → 成员按角色共享数据洞察 |

---

## ✨ 功能特性

### 🔐 用户认证与安全

- **邮箱注册 / 登录** — bcryptjs 12 轮盐值哈希，Zod 4 输入校验
- **JWT 会话管理** — NextAuth v5 (JWT 策略)，JWE 加密 Cookie 传输
- **Edge Middleware 路由守卫** — 基于 `jose` + `@panva/hkdf` 的轻量 JWE 解密，未登录自动重定向
- **密码修改** — 需验证当前密码，bcrypt 比对后更新
- **个人信息管理** — 姓名、头像、基础设置

### 🤖 AI 智能数据引擎

- **自然语言查询** — 选择数据源，输入中文问题，AI 自动生成可视化图表
- **智能字段分析** — 自动识别日期、数值、分类字段，推断数据类型与聚合方式
- **可视化需求推荐** — AI 根据字段组合智能推荐分析维度（趋势 / 对比 / 占比 / 明细）
- **一键生成看板** — 勾选需求标签 → AI 逐条处理 → 前端 Recharts 动态渲染
- **动态图表匹配** — 支持 LINE（折线图）、BAR（柱状图）、PIE（饼图）、TABLE（数据表）、STAT（统计卡片）五种图表类型
- **多层级降级策略** — AI 调用失败 → 关键词规则匹配 → 模拟数据兜底，保障可用性
- **大数据集自适应** — 小数据集（< 500 行）全量发送 AI，大数据集发送统计摘要

### 📊 数据看板

- **看板 CRUD** — 创建、编辑、删除、列表分页查询
- **团队看板共享** — 创建时绑定团队，成员按权限访问
- **看板详情展示** — 12 列响应式网格布局，自动适配手机 / 平板 / 桌面
- **本地缓存持久化** — localForage (IndexedDB) 缓存看板渲染数据，页面刷新不丢失
- **强制刷新** — 一键清除缓存 → 重新调用 AI → 获取最新数据
- **批量操作** — 多选批量删除看板
- **图表图片导出** — Canvas 服务端渲染，支持导出 Base64 PNG

### 👥 团队管理

- **团队创建与删除** — 每个用户可创建多个团队，OWNER 专属删除权限
- **三级角色体系** — OWNER（全部权限）/ ADMIN（管理成员与看板）/ VIEWER（只读查看）
- **邀请制加入** — 通过邮箱邀请成员，被邀方接受 / 拒绝
- **角色管理** — OWNER 可修改成员角色，实时生效
- **通知中心** — 导航栏铃铛图标 + 红点计数，实时展示待处理邀请
- **权限矩阵** — UI 层按钮显隐 + API 层服务端校验，双重保障

### 🗄️ 数据源管理

- **文件上传** — 支持 CSV (.csv) 和 Excel (.xlsx / .xls)，`xlsx` 库客户端解析，Base64 编码存储
- **外部数据库连接** — 支持 9 种数据库：

| 数据库 | 连接方式 | 支持程度 |
|--------|---------|---------|
| MySQL | `mysql2` 动态导入 | ✅ 完整支持 |
| PostgreSQL | `pg` 动态导入 | ✅ 完整支持 |
| ClickHouse | HTTP 接口 + Basic Auth | ✅ 完整支持 |
| Elasticsearch | HTTP 接口 `_cat/indices` | ✅ 完整支持 |
| SQL Server | — | 📋 驱动安装指引 |
| Oracle | — | 📋 驱动安装指引 |
| SQLite | — | 📋 驱动安装指引 |
| MongoDB | — | 📋 驱动安装指引 |
| Redis | — | 📋 驱动安装指引 |

- **连接测试** — 前端强制 test-before-create，测试通过后方可创建
- **两级联动选表** — 数据源选择后 → 自动加载表列表 → 选择目标表
- **用户数据隔离** — 数据源按 `userId` 严格隔离，不可跨用户访问
- **批量删除** — 多选 + 批量删除数据源

### 🔑 AI 密钥管理

- **7 个内置供应商** — OpenAI / Claude / DeepSeek / 通义千问 / 豆包 / 文心一言 / Kimi
- **自定义供应商** — 支持任意 OpenAI 兼容 API 接口
- **密钥独立存储** — 每个用户独立配置，`aiProviders` JSON 字段存储
- **向后兼容** — 兼容旧版独立字段（`openaiApiKey` 等），自动迁移至新格式
- **连接测试** — 「测试连接」按钮自动保存后验证 API 可用性
- **多模型支持** — 每个供应商可配置默认模型，调用时可覆盖

### 🎨 UI / UX

- **双主题支持** — Tailwind CSS v4 `dark:` 变量，亮色 / 暗色自动切换
- **响应式布局** — 移动端 / 平板 / 桌面三档自适应
- **Geist 字体** — Next.js 官方推荐字体，中文渲染优雅
- **Lucide 图标** — 统一图标系统，语义化命名
- **加载与空状态** — 全站统一 Skeleton / Spinner / Empty State

---

## 🛠 技术栈

### 核心框架

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | [Next.js](https://nextjs.org/) (App Router) | 15.5 |
| UI 库 | [React](https://react.dev/) | 19 |
| 类型系统 | [TypeScript](https://www.typescriptlang.org/) | 5 |
| 样式方案 | [Tailwind CSS](https://tailwindcss.com/) | v4 |
| 图标库 | [Lucide React](https://lucide.dev/) | 1.17 |

### 后端与数据

| 层级 | 技术 | 版本 |
|------|------|------|
| ORM | [Prisma](https://www.prisma.io/) | 7.8 |
| 数据库 | [PostgreSQL](https://www.postgresql.org/) | 16+ |
| 连接池 | `@prisma/adapter-pg` + `pg` Pool | — |
| 校验 | [Zod](https://zod.dev/) | 4.4 |
| 密码哈希 | [bcryptjs](https://www.npmjs.com/package/bcryptjs) | 3.0 |

### 认证与会话

| 层级 | 技术 | 版本 |
|------|------|------|
| 认证框架 | [NextAuth.js](https://authjs.dev/) (Auth.js v5) | 5.0-beta |
| 会话策略 | JWT + JWE 加密 Cookie | — |
| Edge 解密 | [`jose`](https://github.com/panva/jose) + [`@panva/hkdf`](https://github.com/panva/hkdf) | — |

### AI / 数据 / 图表

| 层级 | 技术 | 版本 |
|------|------|------|
| 图表渲染 | [Recharts](https://recharts.org/) | 3.8 |
| 图表导出 | [Chart.js](https://www.chartjs.org/) + [canvas](https://www.npmjs.com/package/canvas) | — |
| CSV 解析 | [csv-parse](https://csv.js.org/) | 6.2 |
| Excel 解析 | [xlsx](https://sheetjs.com/) | 0.18 |
| 客户端缓存 | [localForage](https://localforage.github.io/localForage/) | 1.10 |
| 样式合并 | [tailwind-merge](https://github.com/dcastil/tailwind-merge) + [clsx](https://github.com/lukeed/clsx) | — |

### 数据库驱动（按需动态导入）

| 数据库 | 驱动 | 版本 |
|--------|------|------|
| MySQL | `mysql2` | 3.22 |
| PostgreSQL | `pg` | 8.21 |

### 开发工具

| 工具 | 用途 |
|------|------|
| [ESLint](https://eslint.org/) | 代码检查 |
| [`tsx`](https://github.com/privatenumber/tsx) | 运行 TypeScript 种子脚本 |
| [Prisma Studio](https://www.prisma.io/studio) | 数据库 GUI 管理 |
| [Docker Compose](https://docs.docker.com/compose/) | 本地 PostgreSQL 环境 |

---

## 🚀 快速开始

### 前置条件

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 18+ | 推荐 20 LTS |
| PostgreSQL | 16+ | 本地可用 Docker 启动 |
| npm | 9+ | 或 yarn / pnpm |

### 1. 克隆项目

```bash
git clone <your-repo-url> saas-dashboard
cd saas-dashboard
```

### 2. 启动 PostgreSQL

**方式 A：Docker Compose（推荐）**

```bash
docker compose up -d
```

**方式 B：本地安装**

确保 PostgreSQL 服务已运行，并创建数据库：

```sql
CREATE DATABASE saas_dashboard;
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，至少配置以下变量：

```env
# 应用地址
AUTH_URL="http://localhost:3000"

# NextAuth 密钥 (生成方式: openssl rand -base64 32)
AUTH_SECRET="your-generated-secret-at-least-32-chars"

# 数据库连接
DATABASE_URL="postgresql://postgres:password@localhost:5432/saas_dashboard?schema=public"

# 可选：AI 大模型密钥（至少配置一项以启用 AI 功能）
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

> ⚠️ **安全提示**：生产环境务必使用强随机密钥替换 `AUTH_SECRET`，切勿使用默认值或弱密钥。

### 4. 安装依赖

```bash
npm install
```

> 安装后 `postinstall` 脚本会自动执行 `prisma generate` 生成 Prisma Client。

### 5. 初始化数据库

```bash
# 推送 Schema 到数据库
npm run db:push

# 可选：填充种子数据（含测试账号）
npm run db:seed
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 种子测试账号

| 邮箱 | 密码 | 角色 |
|------|------|------|
| `test@example.com` | `123456` | ADMIN |

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (Turbopack) |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | ESLint 代码检查 |
| `npm run db:migrate` | Prisma 迁移 (生成迁移文件) |
| `npm run db:push` | 直接推送 Schema (无迁移文件) |
| `npm run db:studio` | 打开 Prisma Studio (数据库 GUI) |
| `npm run db:seed` | 运行种子数据脚本 |

---

## 🚢 部署指南

### 方案 A：Vercel（推荐 — 零配置 Serverless）

Vercel 是 Next.js 官方托管平台，原生支持 App Router 和 Serverless Functions。

**步骤：**

1. **导入仓库** — 在 [Vercel](https://vercel.com/) 中导入 GitHub 仓库
2. **配置环境变量** (Settings → Environment Variables)：

```env
AUTH_URL="https://your-app.vercel.app"
AUTH_SECRET="<生成强随机密钥>"

# 数据库方案选择：
# 选项 1: Vercel Postgres (自动注入)
# 选项 2: Neon Serverless
DATABASE_URL="postgresql://..."

# AI 密钥 (至少一个)
OPENAI_API_KEY="sk-..."
```

3. **部署** — Vercel 自动检测 Next.js 项目，无需额外配置

**注意事项：**
- Prisma 7 的 `@prisma/adapter-pg` + `pg` Pool 需要配置 `serverExternalPackages`（已在 `next.config.ts` 中完成）
- 连接池上限已在 `src/lib/prisma.ts` 中针对 Serverless 环境自动设为 3
- 冷启动时 Prisma Client 会重新创建实例，符合 Serverless 最佳实践

### 方案 B：Railway（全托管后端）

[Railway](https://railway.app/) 提供 PostgreSQL 数据库 + 应用托管一体化服务。

**步骤：**

1. 在 Railway 中创建新项目
2. 添加 PostgreSQL 服务（自动注入 `DATABASE_URL`）
3. 部署应用服务：

```bash
# Railway 自动识别 package.json，执行：
npm run build
npm start
```

4. 配置环境变量：`AUTH_URL`、`AUTH_SECRET`、AI 密钥

### 方案 C：传统 VPS / 云服务器

适用于阿里云 ECS、腾讯云 CVM、AWS EC2 等。

**前置条件：** Node.js 20+、PostgreSQL 16+、Nginx（反向代理）

**步骤：**

```bash
# 1. 克隆并安装
git clone <repo-url> && cd saas-dashboard
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入生产配置

# 3. 数据库迁移
npm run db:push

# 4. 构建
npm run build

# 5. 使用 PM2 启动（推荐）
npm install -g pm2
pm2 start npm --name "saas-dashboard" -- start
pm2 save
pm2 startup
```

**Nginx 反向代理配置示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 方案 D：Docker 自部署

可以自行编写 Dockerfile 构建容器镜像：

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "start"]
```

### 环境变量参考

| 变量 | 必需 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `AUTH_SECRET` | ✅ | JWT 签名密钥（≥ 32 字符） |
| `AUTH_URL` | ✅ | 应用部署地址 |
| `OPENAI_API_KEY` | 可选 | OpenAI API 密钥 |
| `ANTHROPIC_API_KEY` | 可选 | Anthropic Claude API 密钥 |
| `GITHUB_ID` / `GITHUB_SECRET` | 可选 | GitHub OAuth |
| `GOOGLE_ID` / `GOOGLE_SECRET` | 可选 | Google OAuth |
| `VERCEL` | 自动 | Vercel 环境自动注入，用于 Serverless 检测 |

---

## 📁 项目结构

```
saas-dashboard/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义 (8 模型 / 6 枚举)
│   └── seed.ts                # 种子数据脚本
├── public/
│   ├── logo.png               # 应用图标
│   └── lunch.png              # 启动页图片
├── src/
│   ├── app/                   # Next.js App Router 页面与 API
│   │   ├── layout.tsx         # 根布局 (Geist 字体 / SessionProvider / 主题)
│   │   ├── page.tsx           # 首页 (Landing Page)
│   │   ├── globals.css        # 全局样式 (Tailwind v4 + CSS 变量)
│   │   ├── auth/              # 认证页面
│   │   │   ├── layout.tsx     # 认证布局 (居中卡片)
│   │   │   ├── signin/        # 登录页
│   │   │   └── signup/        # 注册页
│   │   ├── dashboard/         # 看板功能页面
│   │   │   ├── layout.tsx     # 看板布局 (Sidebar + Navbar)
│   │   │   ├── page.tsx       # 看板总览列表
│   │   │   ├── [id]/          # 看板详情 (动态路由)
│   │   │   ├── ai-create/     # AI 创建看板
│   │   │   └── datasources/   # 数据源管理
│   │   ├── teams/             # 团队管理页面
│   │   ├── settings/          # 个人设置页面
│   │   └── api/               # 25 个 API 路由
│   │       ├── auth/          # [...nextauth] / register
│   │       ├── ai/            # 6 AI 端点 (查询 / 分析 / 处理 / 推荐 / 看板生成)
│   │       ├── dashboards/    # 看板 CRUD
│   │       ├── datasources/   # 数据源管理 / DB 测试
│   │       ├── teams/         # 团队 / 成员 / 邀请
│   │       └── user/          # 个人信息 / 密码 / AI 密钥 / 邀请
│   ├── components/            # React 组件
│   │   ├── ui/                # 通用 UI (Button / Card / Input)
│   │   ├── layout/            # 布局组件 (Sidebar / Navbar + 通知中心)
│   │   ├── auth/              # 认证表单 (SignInForm / SignUpForm)
│   │   ├── dashboard/         # 看板组件
│   │   │   ├── dashboard-list.tsx         # 看板列表 (含批量操作)
│   │   │   ├── dashboard-overview.tsx     # 看板概览
│   │   │   ├── dashboard-detail-view.tsx  # 看板详情视图
│   │   │   └── charts/                    # 图表组件
│   │   │       ├── line-chart-widget.tsx  # 折线图
│   │   │       ├── bar-chart-widget.tsx   # 柱状图
│   │   │       ├── pie-chart-widget.tsx   # 饼图
│   │   │       ├── data-table-widget.tsx  # 数据表
│   │   │       └── stat-card-widget.tsx   # 统计卡片
│   │   ├── ai/                # AI 功能组件
│   │   │   ├── ai-query-box.tsx           # AI 自然语言查询
│   │   │   └── ai-create-dashboard-form.tsx # AI 创建看板表单
│   │   ├── datasources/       # 数据源管理组件
│   │   ├── teams/             # 团队管理组件 (含邀请/角色)
│   │   └── settings/          # 设置组件 (个人信息 / AI 密钥)
│   ├── lib/                   # 工具库
│   │   ├── auth.ts            # NextAuth v5 配置 (Credentials + JWT)
│   │   ├── prisma.ts          # Prisma Client 单例 (pg Pool 适配)
│   │   ├── ai-user.ts         # 用户私有 AI 密钥调用封装
│   │   ├── dashboard-cache.ts # localForage 看板缓存工具
│   │   └── utils.ts           # 通用工具函数 (cn 等)
│   ├── middleware.ts          # Edge Middleware (JWE 解密 + 路由守卫)
│   ├── types/                 # TypeScript 类型定义
│   │   └── index.ts
│   └── generated/             # Prisma 生成的客户端代码
│       └── prisma/
├── docker-compose.yml         # 本地 PostgreSQL 容器
├── .env.example               # 环境变量模板
├── next.config.ts             # Next.js 配置
├── tsconfig.json              # TypeScript 配置
├── eslint.config.mjs          # ESLint 配置
└── package.json
```

### 关键文件说明

| 文件 | 职责 |
|------|------|
| `src/middleware.ts` | Edge Runtime 路由守卫，JWE Cookie 解密验证会话 |
| `src/lib/auth.ts` | NextAuth v5 配置，Credentials Provider + JWT 回调 |
| `src/lib/prisma.ts` | Prisma Client 单例，pg Pool 适配，Serverless 环境感知 |
| `src/lib/ai-user.ts` | 多 AI 供应商统一调用封装 (OpenAI 兼容 / Anthropic 原生) |
| `src/lib/dashboard-cache.ts` | IndexedDB 缓存工具，完整性校验 + 脏数据自动清理 |
| `prisma/schema.prisma` | 数据库 Schema：8 模型 6 枚举，含完整关系映射 |
| `next.config.ts` | npm 包外部化 + `node:` 协议兼容处理 |

---

## 📘 使用说明

### 1. 注册与登录

1. 访问应用 → 点击「注册」→ 输入邮箱、密码
2. 注册成功后自动跳转登录页
3. 输入凭证登录 → 进入看板总览页
4. 如使用种子数据：`test@example.com` / `123456`

### 2. 配置 AI 密钥

AI 功能需要用户配置自己的大模型 API Key：

1. 左侧导航 → 「AI 设置」
2. 左侧列表选择供应商（如 OpenAI）
3. 填入 API Key、Base URL（可选）、默认模型
4. 点击「测试连接」验证可用性
5. 支持配置多个供应商，可在使用时切换

### 3. 上传数据源

**文件方式：**
1. 侧边栏 → 「数据源」→ 点击「上传文件」
2. 选择 CSV 或 Excel 文件 → 系统自动解析字段
3. 预览数据确认 → 确认上传

**数据库方式：**
1. 切换到「数据库连接」标签
2. 选择数据库类型（MySQL / PostgreSQL 等）
3. 填入连接信息（主机、端口、用户名、密码）
4. 点击「测试连接」→ 成功后选择目标表 → 创建数据源

### 4. AI 智能查询

1. 侧边栏 → 点击「AI 查询」
2. 选择数据源：
   - 文件数据源：直接选择
   - 数据库数据源：先选连接 → 再选表（两级联动）
3. 在输入框输入自然语言问题，例如：
   - 「近三个月的销售趋势如何？」
   - 「各地区销售额占比」
   - 「Top 10 客户列表」
4. AI 返回可视化图表，支持 LINE / BAR / PIE / TABLE 四种类型

### 5. AI 创建看板

1. 侧边栏 → 点击「AI 创建看板」
2. 选择数据源（同 AI 查询流程）
3. AI 自动分析字段结构，识别日期 / 数值 / 分类字段
4. AI 生成可视化需求建议（趋势分析 / 分类对比 / 占比分布等）
5. 勾选需要的需求项 → 点击「生成看板」
6. AI 逐条处理需求，生成对应图表组件
7. 看板数据自动缓存至浏览器 IndexedDB

### 6. 团队协作

1. 侧边栏 → 「团队管理」
2. 点击「创建团队」→ 输入团队名称
3. 在团队卡片中点击「邀请成员」→ 输入对方邮箱
4. 被邀请方在导航栏铃铛图标收到通知
5. 被邀请方接受邀请后成为团队成员
6. OWNER 可修改成员角色、删除团队；ADMIN 可邀请成员、管理看板

### 7. 看板管理

1. 看板总览页展示所有可访问的看板
2. 点击看板卡片 → 查看详情（图表 + 数据）
3. 如需最新数据，点击「刷新数据」清除缓存重新加载
4. 可多选看板进行批量删除
5. 看板详情页点击返回箭头回到列表

---

## 📡 API 参考

### 认证 API

| 方法 | 路由 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/api/auth/register` | 邮箱注册 | 否 |
| `*` | `/api/auth/[...nextauth]` | NextAuth 全端点 | — |

### 看板 API

| 方法 | 路由 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/api/dashboards` | 看板列表 (分页 / 按 teamId 过滤) | ✅ |
| `POST` | `/api/dashboards` | 创建看板 | ✅ |
| `GET` | `/api/dashboards/[id]` | 看板详情 (含 widgets) | ✅ |
| `PUT` | `/api/dashboards/[id]` | 更新看板 (仅创建者) | ✅ |
| `DELETE` | `/api/dashboards/[id]` | 删除看板 (仅创建者) | ✅ |

### 数据源 API

| 方法 | 路由 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/api/datasources` | 数据源列表 | ✅ |
| `POST` | `/api/datasources` | 创建数据源 | ✅ |
| `DELETE` | `/api/datasources/[id]` | 删除数据源 | ✅ |
| `POST` | `/api/datasources/test-db` | 测试数据库连接 | ✅ |

### 团队 API

| 方法 | 路由 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/api/teams` | 团队列表 (含 myRole) | ✅ |
| `POST` | `/api/teams` | 创建团队 | ✅ |
| `DELETE` | `/api/teams/[id]` | 删除团队 (仅 OWNER) | ✅ |
| `GET` | `/api/teams/[id]/members` | 成员列表 (含待处理邀请) | ✅ |
| `POST` | `/api/teams/[id]/members` | 邀请成员 | ✅ |
| `PUT` | `/api/teams/[id]/members` | 接受/拒绝邀请 / 修改角色 | ✅ |

### 用户 API

| 方法 | 路由 | 说明 | 认证 |
|------|------|------|------|
| `PUT` | `/api/user/profile` | 更新个人信息 | ✅ |
| `PUT` | `/api/user/password` | 修改密码 | ✅ |
| `GET` | `/api/user/invitations` | 收到的邀请 | ✅ |
| `GET` | `/api/user/ai-keys` | AI 密钥列表 | ✅ |
| `PUT` | `/api/user/ai-keys` | 保存 AI 密钥 | ✅ |
| `DELETE` | `/api/user/ai-keys` | 删除 AI 密钥 | ✅ |
| `POST` | `/api/user/ai-keys/test` | 测试 AI 连接 | ✅ |

### AI API

| 方法 | 路由 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/api/ai/query` | AI 自然语言查询 | ✅ |
| `POST` | `/api/ai/analyze` | AI 数据分析 | ✅ |
| `POST` | `/api/ai/process-data` | AI 处理数据 (图表渲染) | ✅ |
| `POST` | `/api/ai/analyze-fields` | AI 字段结构分析 | ✅ |
| `POST` | `/api/ai/generate-recommendations` | AI 可视化需求推荐 | ✅ |
| `POST` | `/api/ai/generate-dashboard` | AI 生成看板 | ✅ |

### 模拟数据 API

| 方法 | 路由 | 说明 |
|------|------|------|
| `GET` | `/api/data/revenue` | 模拟收入数据 |
| `GET` | `/api/data/orders` | 模拟订单数据 |
| `GET` | `/api/data/channels` | 模拟渠道数据 |
| `GET` | `/api/data/regions` | 模拟地区数据 |
| `GET` | `/api/data/kpi` | 模拟 KPI 数据 |

---

## ❓ 常见问题

### Q: 注册后登录失败，提示「未登录」？

检查 `.env.local` 中 `AUTH_SECRET` 是否已配置且长度 ≥ 32 字符。Middleware 需要此密钥解密 JWE Cookie。

### Q: AI 查询返回「未配置 AI 密钥」？

AI 功能使用用户自己的 API Key，不会消耗平台费用。请在「AI 设置」页面配置至少一个供应商的 API Key。

### Q: AI 查询返回模拟数据？

表示 AI 调用失败或未配置密钥。系统会自动降级到关键词规则匹配 + 模拟数据，确保功能可用性。

### Q: 数据库连接测试失败？

- 确认数据库服务已启动且网络可达
- 检查防火墙是否放行数据库端口
- 对于 Vercel / Serverless 部署，确保数据库可从公网访问（或使用 Vercel Postgres / Neon 等 Serverless 友好方案）

### Q: 看板数据不是最新的？

看板数据默认缓存至浏览器 IndexedDB。点击「刷新数据」按钮可清除缓存并重新获取最新数据。

### Q: 团队成员无法删除看板？

当前版本看板删除权限仅限创建者本人。UI 对 ADMIN 角色显示的删除按钮可能导致 403 错误，后续版本将修复此权限不一致问题。

### Q: 支持哪些数据库作为数据源？

完整支持 MySQL、PostgreSQL、ClickHouse、Elasticsearch 四种数据库。SQL Server、Oracle、SQLite、MongoDB、Redis 目前提供驱动安装指引，暂未实现完整连接逻辑。

### Q: 如何自定义 AI 供应商？

在「AI 设置」页面点击「自定义供应商」，填入名称、API Key、Base URL 和默认模型即可。支持任意兼容 OpenAI Chat Completions 接口的服务。

---

## 🤝 贡献指南

本项目欢迎 Issue 和 Pull Request！

### 提交 Issue

- 使用清晰的标题描述问题
- 提供复现步骤、期望行为、实际行为
- 附上相关截图或日志
- 标注问题类型：Bug / Feature Request / Documentation

### 提交 Pull Request

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/your-feature-name`
3. 遵循现有代码风格：
   - 使用 TypeScript 严格模式
   - 组件使用函数式 + Hooks
   - API 路由使用 `src/app/api/` 目录结构
   - 样式使用 Tailwind CSS v4 工具类
   - 中文注释 (public-facing 文本使用中文，代码标识符使用英文)
4. 提交前确保通过 lint 检查：`npm run lint`
5. 提交 commit：`git commit -m "feat: 功能描述"`
6. 推送分支并创建 Pull Request

### Commit 规范

本项目推荐使用约定式提交：

- `feat:` — 新功能
- `fix:` — Bug 修复
- `docs:` — 文档更新
- `style:` — 样式调整
- `refactor:` — 代码重构
- `perf:` — 性能优化
- `test:` — 测试相关
- `chore:` — 构建/工具变更

### 代码规范

- **组件命名** — PascalCase，文件名与组件名一致
- **文件组织** — 每个组件独立目录，通过 `index.ts` 统一导出
- **API 错误处理** — 统一返回 `{ success: boolean, error?: string, data?: any }` 格式
- **权限校验** — API 层必须进行服务端权限验证，不得仅依赖 UI 层隐藏按钮

---

## 📄 许可证

本项目基于 MIT 许可证开源。

---
