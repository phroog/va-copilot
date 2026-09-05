"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function LoginForm() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/welcome";
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push(returnUrl);
    }
  };

  const handleMagicLink = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: "https://getsari.com/dashboard" },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setMagicSent(true);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FFF0F5] dark:bg-dark-bg p-4">
      <div className="blob w-96 h-96 bg-kawaii-pink top-[-10%] left-[-20%]" />
      <div className="blob w-80 h-80 bg-kawaii-purple bottom-[-10%] right-[-20%]" />
      <Card className="w-full max-w-md relative z-10">
        <div className="absolute top-3 right-3"><LanguageDropdown /></div>
        <CardHeader className="text-center">
          <Link href="/" className="text-3xl mb-2 block">🚀</Link>
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSub")}</CardDescription>
        </CardHeader>
        <CardContent>
          {magicSent ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-3">📬</p>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Check your email!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                We sent a magic link to <b>{email}</b>. Click it to log in.
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("loggingIn") + "..." : t("logIn") + " ✨"}
                </Button>
              </form>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-kawaii-lavender/30" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white dark:bg-dark-card px-2 text-slate-400">{t("or")}</span></div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleMagicLink} disabled={loading}>
                📬 Email me a magic link
              </Button>
            </>
          )}
          <p className="text-center text-sm text-slate-500 mt-6">
            {t("noAccount")}{" "}
            <Link href="/auth/signup" className="text-kawaii-purple font-semibold hover:underline">{t("signUp")}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}