import OpenAI from "openai";
import { SYSTEM_PROMPT, filesContext } from "@/lib/prompt";
import { guardRequest } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 300;

// Free-tier models are often overloaded (503) or stall before the first token.
// Try the primary model, retry briefly, then fall back to the next model, as long
// as nothing has been streamed to the user yet.
// Slower "thinking" models (e.g. pro) may need a larger value: LLM_FIRST_TOKEN_TIMEOUT_MS.
const FIRST_TOKEN_TIMEOUT_MS = Number(process.env.LLM_FIRST_TOKEN_TIMEOUT_MS) || 45_000;
const ATTEMPTS_PER_MODEL = 2;

const isAbort = (e: any) =>
  e?.name === "AbortError" || /abort/i.test(e?.constructor?.name ?? "") || /aborted/i.test(e?.message ?? "");

const isTransient = (e: any) => {
  const s = e?.status;
  return s === 429 || s === 500 || s === 502 || s === 503 || s === 504 || isAbort(e) || e?.code === "ETIMEDOUT";
};

const friendly = (e: any) => {
  const s = e?.status;
  if (s === 503 || s === 429 || isAbort(e))
    return "The AI model is busy right now (high demand). Please press Retry in a moment.";
  if (s === 401 || s === 403 || s === 400)
    return "The AI service rejected the request. Check LLM_API_KEY and LLM_MODEL in .env.local (Gemini reports a bad key as 400), or the attached image.";
  return e?.message ?? "Generation failed.";
};

export async function POST(req: Request) {
  const blocked = await guardRequest(req);
  if (blocked) return blocked;

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return new Response("Missing LLM_API_KEY. Copy .env.example to .env.local and set it.", {
      status: 500,
    });
  }

  const { messages, files } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string; images?: string[] }[];
    files: Record<string, string>;
  };

  // Targets are tried in order: the primary provider's models, then (optionally) a backup
  // provider such as OpenRouter. The backup is skipped for image requests (vision support varies).
  const list = (v: string | undefined, dflt: string) =>
    (v ?? dflt).split(",").map((m) => m.trim()).filter(Boolean);
  const primary = new OpenAI({ apiKey, baseURL: process.env.LLM_BASE_URL, maxRetries: 0 });
  const targets: { client: OpenAI; model: string; provider: string }[] = [
    process.env.LLM_MODEL || "gemini-3-flash-preview",
    ...list(process.env.LLM_FALLBACK_MODELS, "gemini-3.1-flash-lite"),
  ]
    .filter((m, i, a) => a.indexOf(m) === i)
    .map((model) => ({ client: primary, model, provider: "primary" }));

  const hasImages = messages.some((m) => m.images?.length);
  if (process.env.LLM_BACKUP_API_KEY && !hasImages) {
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

  // Attach the current project files to the latest user turn.
  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === "user") {
      const text = `${filesContext(files)}\n\nRequest: ${m.content}`;
      if (!m.images?.length) return { role: "user", content: text };
      return {
        role: "user",
        content: [
          { type: "text", text: `${text}\n\n(The attached image(s) are a design/screenshot to recreate or draw from.)` },
          ...m.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        ],
      };
    }
    return { role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam;
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let started = false;
      let lastError: any = null;
      const deadProviders = new Set<string>(); // providers whose key was rejected
      const t0 = Date.now();
      try {
        for (const { client, model, provider } of targets) {
          if (deadProviders.has(provider)) continue;
          for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
            const ac = new AbortController();
            const timer = setTimeout(() => ac.abort(), FIRST_TOKEN_TIMEOUT_MS);
            try {
              const s = await client.chat.completions.create(
                {
                  model,
                  stream: true,
                  messages: [{ role: "system", content: SYSTEM_PROMPT }, ...msgs],
                },
                { signal: ac.signal }
              );
              for await (const chunk of s) {
                const t = chunk.choices[0]?.delta?.content;
                if (!t) continue;
                if (!started) {
                  started = true;
                  clearTimeout(timer); // got the first token: no more stall timeout
                  console.log(`[generate] ${provider}/${model} first token after ${Date.now() - t0}ms`);
                }
                controller.enqueue(encoder.encode(t));
              }
              clearTimeout(timer);
              if (started) return;
              lastError = new Error("The model returned an empty response.");
            } catch (e: any) {
              clearTimeout(timer);
              lastError = e;
              if (started) throw e; // mid-stream failure: can't switch models without duplicating text
              console.warn(`[generate] ${provider}/${model} failed: ${e?.status ?? e?.name ?? "error"} ${String(e?.message ?? "").slice(0, 100)}`);
              if (e?.status === 401 || e?.status === 403) {
                deadProviders.add(provider); // this provider's key is rejected: try the next provider
                break;
              }
              if (!isTransient(e)) break; // e.g. model not found: skip straight to the next model
            }
            // brief backoff before retrying / switching model
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          }
        }
        if (!started) throw lastError ?? new Error("Generation failed.");
      } catch (e: any) {
        controller.enqueue(encoder.encode(`${started ? "\n\n" : ""}[error] ${friendly(e)}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
