/**
 * Next.js Middleware - 路由守卫
 *
 * ⚠️ Middleware 运行在 Edge Runtime，不能 import Prisma/pg。
 * 使用轻量 JWE 解密（jose + hkdf）验证 NextAuth v5 会话。
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecrypt } from "jose";
import hkdf from "@panva/hkdf";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-production-abc123xyz";

const publicRoutes = ["/auth/signin", "/auth/signup", "/api/auth"];
const ignoredPrefixes = ["/_next", "/favicon.ico", "/public", "/logo.png", "/lunch.png"];

/**
 * 从 AUTH_SECRET 派生加密密钥
 * 与 NextAuth v5 (@auth/core) 一致的 HKDF 派生算法
 * salt = cookie name, info = "Auth.js Generated Encryption Key ({salt})"
 */
async function deriveKey(secret: string, salt: string): Promise<Uint8Array> {
  return await hkdf(
    "sha256",
    secret,
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64
  );
}

/**
 * 解密 NextAuth v5 的 JWE Cookie
 */
async function getSessionFromCookie(req: NextRequest) {
  const authToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!authToken) return null;

  try {
    const cookieName =
      req.cookies.has("authjs.session-token")
        ? "authjs.session-token"
        : "__Secure-authjs.session-token";
    const key = await deriveKey(AUTH_SECRET, cookieName);
    const { payload } = await jwtDecrypt(authToken, key);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ignoredPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 已登录用户访问登录/注册页 → 重定向到仪表盘
  const session = await getSessionFromCookie(req);
  const isAuthPage = pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/signup");

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!session) {
    const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
