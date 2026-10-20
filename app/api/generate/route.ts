import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, filesContext } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("Missing ANTHROPIC_API_KEY. Copy .env.example to .env.local and set it.", {
      status: 500,
    });
  }

  const { messages, files } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    files: Record<string, string>;
  };

  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

  // Attach the current project files to the latest user turn.
  const msgs = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { role: m.role, content: `${filesContext(files)}\n\nRequest: ${m.content}` }
      : { role: m.role, content: m.content }
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = client.messages.stream({
          model,
          max_tokens: 32000,
          system: SYSTEM_PROMPT,
          messages: msgs,
        });
        s.on("text", (t) => controller.enqueue(encoder.encode(t)));
        await s.finalMessage();
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
