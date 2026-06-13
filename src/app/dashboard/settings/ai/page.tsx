import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AIKeysForm } from "@/components/settings/ai-keys-form";

export default async function AIKeysPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  return <AIKeysForm />;
}
