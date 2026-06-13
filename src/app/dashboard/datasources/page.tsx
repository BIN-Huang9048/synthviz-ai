import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DataSourceManager } from "@/components/datasources/datasource-manager";

export default async function DataSourcesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  return <DataSourceManager />;
}
