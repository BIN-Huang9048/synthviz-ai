/**
 * 核心 TypeScript 类型定义
 * 与 Prisma Schema 保持一致
 */

// ─── 枚举 ─────────────────────────────────────────────
export type UserRole = "ADMIN" | "MEMBER";
export type TeamRole = "OWNER" | "ADMIN" | "VIEWER";
export type WidgetType = "LINE" | "BAR" | "PIE" | "TABLE" | "STAT";

// ─── 用户 ─────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithTeams extends User {
  ownedTeams: Team[];
  teamMembers: (TeamMember & { team: Team })[];
}

// ─── 团队 ─────────────────────────────────────────────
export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    dashboards: number;
  };
}

// ─── 团队成员 ─────────────────────────────────────────
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user?: Pick<User, "id" | "email" | "name" | "avatarUrl">;
}

// ─── 仪表盘 ───────────────────────────────────────────
export interface Dashboard {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  description: string | null;
  config: DashboardConfig;
  createdAt: string;
  updatedAt: string;
  widgets?: DataWidget[];
}

export interface DashboardConfig {
  layout?: "grid" | "freeform";
  theme?: "light" | "dark";
  widgets?: Record<string, unknown>;
}

// ─── 数据组件 ─────────────────────────────────────────
export interface DataWidget {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  dataSource: DataSourceConfig;
  position: WidgetPosition;
  createdAt: string;
}

export interface DataSourceConfig {
  api?: string;
  query?: string;
  filters?: Record<string, unknown>;
  refreshInterval?: number; // 自动刷新间隔 (秒)
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── API 响应 ─────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── NextAuth 扩展 ────────────────────────────────────
declare module "next-auth" {
  interface User {
    role?: UserRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
      image?: string | null;
    };
  }
}

// NextAuth v5 的 JWT 类型通过 callbacks.jwt 自动推断
// 如需扩展，在 auth.ts 的 jwt callback 中使用 token.id / token.role

// ─── 表单验证类型 ─────────────────────────────────────
export interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignInFormData {
  email: string;
  password: string;
}

export interface CreateDashboardFormData {
  name: string;
  description?: string;
  teamId: string;
}

export interface CreateTeamFormData {
  name: string;
}
