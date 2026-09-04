"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useLocale } from "@/lib/i18n/context";
import { trackEvent } from "@/components/meta-pixel";

export default function SignupPage() {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      fetch("/api/emails/welcome", { method: "POST" }).catch(() => {});
      trackEvent("CompleteRegistration", { content_name: "signup", status: "true" });
      router.push("/welcome");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FFF0F5] dark:bg-dark-bg p-4">
      <div className="blob w-96 h-96 bg-kawaii-pink top-[-10%] right-[-20%]" />
      <div className="blob w-80 h-80 bg-kawaii-peach bottom-[-10%] left-[-20%]" />
      <Card className="w-full max-w-md relative z-10">
        <div className="absolute top-3 right-3"><LanguageDropdown /></div>
        <CardHeader className="text-center">
          <Link href="/" className="text-3xl mb-2 block">🚀</Link>
          <CardTitle className="text-2xl">{t("signupTitle")}</CardTitle>
          <CardDescription>{t("signupSub")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("creatingAccount") + "..." : t("getStarted") + " ✨"}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            {t("haveAccount")}{" "}
            <Link href="/auth/login" className="text-kawaii-purple font-semibold hover:underline">{t("logIn")}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}