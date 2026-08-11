"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Invalid credentials");
      }
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FFF0F5] dark:bg-dark-bg p-4">
      <div className="blob w-96 h-96 bg-kawaii-purple top-[-10%] left-[-20%]" />
      <div className="blob w-80 h-80 bg-kawaii-pink bottom-[-10%] right-[-20%]" />
      <Card className="w-full max-w-sm relative z-10">
        <CardHeader className="text-center">
          <div className="text-3xl mb-2">🔐</div>
          <CardTitle className="text-2xl">Sari Admin</CardTitle>
          <CardDescription>Private operator access</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-user">Username</Label>
              <Input id="admin-user" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-pass">Password</Label>
              <Input id="admin-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking..." : "Access Admin ✨"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}