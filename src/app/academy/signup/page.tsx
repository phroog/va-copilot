"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/context";

export default function AcademySignup() {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    if (!email || !password) { setError(t("fillAllFields")); return; }
    if (password.length < 6) { setError(t("passwordTooShort")); return; }
    if (password !== confirmPw) { setError(t("passwordsDontMatch")); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/academy/dashboard` },
    });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    router.push("/academy/dashboard");
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🎓</div>
          <CardTitle className="text-xl">{t("academySignup")}</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("academySignupDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div>
            <Label>{t("email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div>
            <Label>{t("password")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <div>
            <Label>{t("confirmPassword")}</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSignup()} placeholder="Confirm password" />
          </div>
          <Button variant="primary" className="w-full" onClick={handleSignup} disabled={loading}>
            {loading ? t("loading") + "..." : "🎓 " + t("createAccount")}
          </Button>
          <p className="text-center text-sm text-slate-500">
            {t("haveAccount")}{" "}
            <Link href="/academy/login" className="text-kawaii-purple dark:text-kawaii-lavender font-bold hover:underline">{t("login")}</Link>
          </p>
          <p className="text-center text-xs text-slate-400">
            {t("academyExistingTool")}{" "}
            <Link href="/auth/login" className="text-kawaii-purple dark:text-kawaii-lavender underline">{t("login")}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
