import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "注册" };

export default function SignUpPage() {
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
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(126,34,206,0.35)" }} />
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.10)" }} />

        <div className="max-w-md text-center relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png" alt="Logo"
            className="mx-auto h-20 w-20 mb-6 rounded-2xl object-contain bg-white/10 p-2 ring-1 ring-white/20"
          />
          <h1 className="mb-3 text-3xl font-bold text-white"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
            加入 锐鹰数视
          </h1>
          <p className="text-lg text-white/90"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
            创建账号，开启 AI 驱动数据可视化之旅
          </p>
          <div className="mt-10 space-y-3 text-left">
            {[
              "📊  拖拽式仪表盘，5 种可视化组件",
              "👥  团队协作，精细 RBAC 权限管理",
              "🤖  AI 智能分析，自动生成数据洞察",
              "⚡  实时数据刷新，响应式适配全设备",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg py-3 px-4 text-sm text-white/90 hover:scale-[1.02] transition-all"
                style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(4px)", textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 右侧表单区 ─── */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-8 bg-white relative"
        style={{ boxShadow: "-4px 0 16px rgba(0,0,0,0.08)" }}
      >
        <div className="mb-8 text-center lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" className="mx-auto h-12 w-12 rounded-xl object-contain" />
          <h2 className="mt-3 text-2xl font-bold text-gray-900">锐鹰数视</h2>
        </div>
        <div className="w-full max-w-sm text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">创建账号</h2>
          <p className="mt-2 text-sm text-gray-500">填写以下信息开始使用</p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
