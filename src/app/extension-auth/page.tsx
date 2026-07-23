import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AuthBridge from "./auth-bridge";

export default async function ExtensionAuthPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?returnUrl=/extension-auth");
  }

  return <AuthBridge />;
}
