/**
 * NextAuth v5 配置
 * 支持邮箱密码登录 + 可扩展 OAuth
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";

// 登录表单验证 schema
const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 适配 Prisma 7 的边缘兼容模式
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            avatarUrl: true,
          },
        });

        if (!user) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // NextAuth Session user 类型扩展
        Object.assign(session.user, { id: token.id, role: token.role });
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
});
