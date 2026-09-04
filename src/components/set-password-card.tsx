"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

/* Set a password for magic-link users (or change it). With an active session,
   Supabase lets you set/change the password without the old one — this is how a
   magic-link user starts logging in with email + password instead. */

export default function SetPasswordCard() {
  const { showToast } = useToast();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (password !== confirm) {
      showToast("Passwords don't match", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      showToast("🔒 Password set — you can now log in with email + password");
    } catch (e: any) {
      showToast(e?.message || "Failed to set password", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🔒 Password</CardTitle>
        <CardDescription>
          Set a password so you can log in without a magic link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">New password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Confirm password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" />
        </div>
        <Button variant="primary" onClick={save} disabled={saving || !password || !confirm}>
          {saving ? "Saving…" : "Set password"}
        </Button>
      </CardContent>
    </Card>
  );
}