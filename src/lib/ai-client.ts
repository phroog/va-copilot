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
    .select("balance, total_used")
    .eq("user_id", userId)
    .single();

  if (!row || row.balance <= 0) return false;

  const { error } = await supabase
    .from("ai_credits")
    .update({
      balance: row.balance - 1,
      total_used: (row.total_used ?? 0) + 1,
    })
    .eq("user_id", userId)
    .eq("balance", row.balance);

  if (error) {
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
    throw new Error("DeepSeek API key not configured.");
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
        signal: AbortSignal.timeout(30000),
      });

      if (response.status === 429) {
        console.warn("DeepSeek rate limited, retrying...");
        lastError = new Error("Rate limited");
        continue;
      }

      if (response.status === 401) {
        throw new Error("Invalid API key. Check your DEEPSEEK_API_KEY.");
      }

      if (response.status === 402) {
        throw new Error("Insufficient balance on DeepSeek account.");
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error(`DeepSeek API error ${response.status}:`, errBody);
        throw new Error(`AI service temporarily unavailable (HTTP ${response.status}).`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? "";

      if (!text) {
        throw new Error("AI returned empty response.");
      }

      const tokensInput = data.usage?.prompt_tokens ?? 0;
      const tokensOutput = data.usage?.completion_tokens ?? 0;
      const cost = tokensInput * PRICING.input + tokensOutput * PRICING.output;

      // Deduct credit only after a successful API response
      const hasCredits = await deductCredit(userId);
      if (!hasCredits) {
        throw Object.assign(new Error("Insufficient AI credits"), { status: 402, code: "INSUFFICIENT_CREDITS" });
      }

      await logUsage(userId, "deepseek", tokensInput, tokensOutput, cost);

      return { text, tokensInput, tokensOutput, cost };
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.message?.includes("timed out") || err.message?.includes("aborted")) {
        console.error("DeepSeek request timed out");
        lastError = new Error("AI service temporarily unavailable.");
        continue;
      }
      if (err.status === 402 || err.code === "INSUFFICIENT_CREDITS") throw err;
      if (err.message?.includes("API key")) throw err;
      console.error("DeepSeek call error:", err.message);
      lastError = err;
    }
  }

  throw lastError ?? new Error("AI service temporarily unavailable.");
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "DEEPSEEK_API_KEY is not set in environment variables." };
  }

  try {
    const response = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: "user", content: "Reply with just the word OK." }],
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 401) return { ok: false, message: "Invalid API key (401)." };
      if (response.status === 429) return { ok: false, message: "Rate limited (429)." };
      return { ok: false, message: `HTTP ${response.status}: ${body}` };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return { ok: text.includes("OK"), message: "Connected successfully." };
  } catch (err: any) {
    return { ok: false, message: `Connection failed: ${err.message}` };
  }
}
