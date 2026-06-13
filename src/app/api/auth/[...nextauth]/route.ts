/**
 * NextAuth API 路由 - /api/auth/*
 * 处理登录、注册、登出、会话等
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
