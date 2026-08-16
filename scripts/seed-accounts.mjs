/* Seed 3 test accounts (free / basic / pro).
   Usage: add SUPABASE_SERVICE_ROLE_KEY to .env.local, then:
     node scripts/seed-accounts.mjs
   Requires the 020_add_subscription_and_limits migration to be applied. */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import crypto from "crypto";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const TIERS = [
  { plan: "free", email: "test.free@sari.test", name: "Free Tester", dailyLimit: 20, credits: 5 },
  { plan: "basic", email: "test.basic@sari.test", name: "Basic Tester", dailyLimit: 100, credits: 50 },
  { plan: "pro", email: "test.pro@sari.test", name: "Pro Tester", dailyLimit: null, credits: 200 },
];

const results = [];

for (const t of TIERS) {
  const password = crypto.randomBytes(10).toString("base64url").slice(0, 14);
  const publicId = "user_" + crypto.randomBytes(5).toString("hex");

  const { data: user, error } = await supabase.auth.admin.createUser({
    email: t.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: t.name },
  });
  if (error) { console.error(t.plan, "createUser failed:", error.message); continue; }

  const userId = user.id;

  const { error: subErr } = await supabase
    .from("subscriptions")
    .upsert({ user_id: userId, plan: t.plan, status: "active" }, { onConflict: "user_id" });
  if (subErr) console.error(t.plan, "subscription:", subErr.message);

  const { error: credErr } = await supabase
    .from("ai_credits")
    .upsert({ user_id: userId, balance: t.credits, total_used: 0 }, { onConflict: "user_id" });
  if (credErr) console.error(t.plan, "credits:", credErr.message);

  const { error: profErr } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        full_name: t.name,
        public_id: publicId,
        daily_job_limit: t.dailyLimit,
        monthly_ai_credits: t.credits,
      },
      { onConflict: "user_id" }
    );
  if (profErr) console.error(t.plan, "profile:", profErr.message);

  results.push({ plan: t.plan, email: t.email, password, name: t.name, publicId });
}

console.log("\n=== ACCOUNTS ===");
for (const r of results) {
  console.log(`${r.plan.toUpperCase()} | ${r.email} | ${r.password} | ${r.name} | ${r.publicId}`);
}
