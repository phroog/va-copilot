import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WelcomeAnimation from "./welcome-animation";

export default async function WelcomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <WelcomeAnimation />;
}