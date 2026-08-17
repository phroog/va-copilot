/* Seed 3 test accounts (free / basic / pro). Idempotent: re-running only sets
   the tier/credits/profile for users that already exist.
   Usage: node scripts/seed-accounts.mjs */
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

async function findOrCreateUser(email, password, name) {
  const { data: existing, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (!listErr) {
    const found = (existing.users || []).find((u) => u.email === email);
    if (found) {
      await supabase.auth.admin.updateUserById(found.id, { password });
      return { userId: found.id, created: false };
    }
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) {
    if (/already registered/i.test(error.message)) {
      const again = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = (again.data?.users || []).find((u) => u.email === email);
      if (found) {
        await supabase.auth.admin.updateUserById(found.id, { password });
        return { userId: found.id, created: false };
      }
    }
    throw new Error(`${name}: ${error.message}`);
  }
  return { userId: data.user.id, created: true };
}

const results = [];

for (const t of TIERS) {
  const password = crypto.randomBytes(10).toString("base64url").slice(0, 14);
  const publicId = "user_" + crypto.randomBytes(5).toString("hex");

  let userId, created;
  try {
    ({ userId, created } = await findOrCreateUser(t.email, password, t.name));
  } catch (e) { console.error(e.message); continue; }

  const ups = async (table, row, onConflict) => {
    const { error } = await supabase.from(table).upsert(row, { onConflict });
    if (error) console.error(t.plan, table, error.message);
  };

  await ups("subscriptions", { user_id: userId, plan: t.plan, status: "active" }, "user_id");
  await ups("ai_credits", { user_id: userId, balance: t.credits, total_used: 0 }, "user_id");
  await ups(
    "profiles",
    { user_id: userId, full_name: t.name, public_id: publicId, daily_job_limit: t.dailyLimit ?? 0, monthly_ai_credits: t.credits },
    "user_id"
  );

  results.push({
    plan: t.plan,
    email: t.email,
    password,
    name: t.name,
    publicId,
  });
}

console.log("\n=== ACCOUNTS ===");
for (const r of results) {
  console.log(`${r.plan.toUpperCase()} | ${r.email} | ${r.password} | ${r.name} | ${r.publicId}`);
}
