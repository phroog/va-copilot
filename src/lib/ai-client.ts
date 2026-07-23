import { createClient } from "@/lib/supabase/server";

const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

const PRICING = {
  input: 0.14 / 1_000_000,
  output: 0.28 / 1_000_000,
};

interface CallOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

interface CallResult {
  text: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function deductCredit(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: row } = await supabase
    .from("ai_credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (!row || row.balance <= 0) return false;

  const { error } = await supabase
    .from("ai_credits")
    .update({ balance: row.balance - 1, total_used: supabase.rpc("increment", { x: 1 }) as any })
    .eq("user_id", userId)
    .eq("balance", row.balance);

  if (error) {
    // Fallback: just do a simple update without optimistic locking
    const { error: fallbackErr } = await supabase
      .from("ai_credits")
      .update({ balance: row.balance - 1 })
      .eq("user_id", userId);

    if (fallbackErr) return false;
  }

  return true;
}

export async function checkCredits(userId: string): Promise<{ ok: boolean; balance: number }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  const balance = data?.balance ?? 0;
  return { ok: balance > 0, balance };
}

export async function logUsage(
  userId: string,
  endpoint: string,
  tokensInput: number,
  tokensOutput: number,
  cost: number
) {
  const supabase = createClient();
  await supabase.from("ai_usage_log").insert({
    user_id: userId,
    endpoint,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost,
  });
}

export async function callDeepSeek(
  userId: string,
  prompt: string,
  options: CallOptions = {}
): Promise<CallResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const hasCredits = await deductCredit(userId);
  if (!hasCredits) {
    const err = new Error("Insufficient AI credits") as any;
    err.status = 402;
    err.code = "INSUFFICIENT_CREDITS";
    throw err;
  }

  const model = options.model ?? DEEPSEEK_MODEL;
  const messages: any[] = [];

  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(Math.pow(2, attempt) * 1000);
    }

    try {
      const response = await fetch(DEEPSEEK_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        }),
      });

      if (response.status === 429) {
        lastError = new Error("Rate limited");
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`DeepSeek API error ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? "";

      const tokensInput = data.usage?.prompt_tokens ?? 0;
      const tokensOutput = data.usage?.completion_tokens ?? 0;
      const cost = tokensInput * PRICING.input + tokensOutput * PRICING.output;

      await logUsage(userId, "deepseek", tokensInput, tokensOutput, cost);

      return { text, tokensInput, tokensOutput, cost };
    } catch (err: any) {
      lastError = err;
      if (err.status === 402) throw err;
      if (err.message?.includes("INSUFFICIENT_CREDITS")) throw err;
    }
  }

  throw lastError ?? new Error("DeepSeek call failed after retries");
}
