import type { Metadata } from "next";
import { SignInForm } from "@/components/auth";

export const metadata: Metadata = { title: "登录" };

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* ─── 左侧品牌区：lunch.png 夜景背景 + 双层遮罩 ─── */}
      <div
        className="hidden flex-[1.618] flex-col items-center justify-center p-12 lg:flex relative overflow-hidden"
        style={{
          backgroundImage: "url(/lunch.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* 紫色品牌遮罩 (opacity 0.35 — 降低以透出夜景细节) */}
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(126,34,206,0.35)" }} />
        {/* 黑色柔光遮罩 (opacity 0.10 — 仅微压暗背景) */}
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.10)" }} />

        <div className="max-w-md text-center relative z-10">
          {/* Logo — 白色背景托底，夜景中可见 */}
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png" alt="Logo"
            className="mx-auto h-20 w-20 mb-6 rounded-2xl object-contain bg-white/10 p-2 ring-1 ring-white/20"
          />
          {/* 标题 — 白色 + 强投影 (低遮罩下需要更强对比) */}
          <h1
            className="text-3xl font-bold mb-3 text-white"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
          >
            锐鹰数视
          </h1>
          {/* 副标题 */}
          <p
            className="text-lg text-white/90"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
          >
            AI 驱动的全栈 SaaS 数据仪表盘
          </p>
          {/* 功能卡片 — 半透明白底 */}
          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { v: "实时", l: "数据可视化" },
              { v: "RBAC", l: "权限管理" },
              { v: "多团队", l: "协作管理" },
              { v: "AI", l: "智能分析" },
            ].map((item) => (
              <div
                key={item.l}
                className="rounded-xl py-4 text-center transition-all hover:scale-[1.03]"
                style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(4px)" }}
              >
                <div
                  className="text-2xl font-bold text-white"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
                >
                  {item.v}
                </div>
                <div className="text-xs text-white/70 mt-1">{item.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 右侧表单区 (38.2%)：白底 + 左阴影分割 ─── */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-8 bg-white relative"
        style={{ boxShadow: "-4px 0 16px rgba(0,0,0,0.08)" }}
      >
        {/* 移动端 Logo */}
        <div className="mb-8 text-center lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" className="mx-auto h-12 w-12 rounded-xl object-contain" />
          <h2 className="mt-3 text-2xl font-bold text-gray-900">锐鹰数视</h2>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
