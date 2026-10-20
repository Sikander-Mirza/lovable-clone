import OpenAI from "openai";
import { SYSTEM_PROMPT, filesContext } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
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

  const client = new OpenAI({ apiKey, baseURL: process.env.LLM_BASE_URL });
  const model = process.env.LLM_MODEL || "gemini-3-flash-preview";

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
      try {
        const s = await client.chat.completions.create({
          model,
          stream: true,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...msgs],
        });
        for await (const chunk of s) {
          const t = chunk.choices[0]?.delta?.content;
          if (t) controller.enqueue(encoder.encode(t));
        }
      } catch (e: any) {
        controller.enqueue(encoder.encode(`\n\n[error] ${e?.message ?? "generation failed"}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
