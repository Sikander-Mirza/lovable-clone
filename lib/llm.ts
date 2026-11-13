// Small non-streaming completion helper with the same provider chain as /api/generate
// (primary models, then the optional backup provider). Used for short structured outputs
// such as the site plan.
import OpenAI from "openai";

export type Target = { client: OpenAI; model: string; provider: string };

export function buildTargets(): Target[] {
  const apiKey = process.env.LLM_API_KEY;
  const list = (v: string | undefined, dflt: string) => (v ?? dflt).split(",").map((m) => m.trim()).filter(Boolean);
  const targets: Target[] = [];
  if (apiKey) {
    const primary = new OpenAI({ apiKey, baseURL: process.env.LLM_BASE_URL, maxRetries: 0 });
    for (const model of [process.env.LLM_MODEL || "gemini-3-flash-preview", ...list(process.env.LLM_FALLBACK_MODELS, "gemini-3.1-flash-lite")]
      .filter((m, i, a) => a.indexOf(m) === i)) {
      targets.push({ client: primary, model, provider: "primary" });
    }
  }
  if (process.env.LLM_BACKUP_API_KEY) {
    const backup = new OpenAI({
      apiKey: process.env.LLM_BACKUP_API_KEY,
      baseURL: process.env.LLM_BACKUP_BASE_URL || "https://openrouter.ai/api/v1",
      maxRetries: 0,
      defaultHeaders: { "HTTP-Referer": process.env.APP_URL || "http://localhost:3000", "X-Title": "Lovable Clone" },
    });
    for (const model of list(process.env.LLM_BACKUP_MODELS, "cohere/north-mini-code:free")) {
      targets.push({ client: backup, model, provider: "backup" });
    }
  }
  return targets;
}

/** Returns the model's text, or throws the last error when every target failed. */
export async function complete(system: string, user: string, timeoutMs = 45_000): Promise<string> {
  let last: unknown = new Error("No AI provider is configured.");
  const dead = new Set<string>();
  for (const { client, model, provider } of buildTargets()) {
    if (dead.has(provider)) continue;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await client.chat.completions.create(
        { model, messages: [{ role: "system", content: system }, { role: "user", content: user }] },
        { signal: ac.signal }
      );
      const text = res.choices[0]?.message?.content ?? "";
      if (text.trim()) return text;
      last = new Error("empty response");
    } catch (e: any) {
      last = e;
      if (e?.status === 401 || e?.status === 403) dead.add(provider);
    } finally {
      clearTimeout(timer);
    }
  }
  throw last;
}
