"use client";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { useSession } from "next-auth/react";

export default function DataSourcesLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const user = session?.user ? { name: session.user.name || null, email: session.user.email || "" } : null;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Navbar sidebarCollapsed={collapsed} user={user} />
      <main className="pt-16 transition-all duration-300" style={{ marginLeft: collapsed ? "68px" : "256px" }}>{children}</main>
    </div>
  );
}
