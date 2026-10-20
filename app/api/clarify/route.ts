import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export type ClarifyQuestion = { question: string; options: string[]; multi: boolean };

const SYSTEM = `You help refine a request to build a web app before it is built.
Given the user's request, write 3 to 5 short, specific questions whose answers would most improve the result. Cover what matters and is NOT already stated: purpose/audience, visual style and colors, key sections or pages, must-have features, content or brand name. Never ask about technology.
For each question give 3 to 5 concise suggested answers the user can tap (tailored to THIS request, not generic). Set "multi" to true when several answers can apply (e.g. sections, features), otherwise false.
Write the questions and answers in the same language as the user's request.
Respond with ONLY a JSON object, no markdown: {"questions":[{"question":"...","options":["..."],"multi":false}]}`;

function parse(text: string): ClarifyQuestion[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  try {
    const data = JSON.parse(text.slice(start, end + 1));
    return (Array.isArray(data.questions) ? data.questions : [])
      .map((q: any) => ({
        question: String(q?.question ?? "").trim().slice(0, 200),
        options: (Array.isArray(q?.options) ? q.options : [])
          .map((o: unknown) => String(o).trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 6),
        multi: !!q?.multi,
      }))
      .filter((q: ClarifyQuestion) => q.question && q.options.length >= 2)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return Response.json({ questions: [] });

  const { prompt, hasImage } = (await req.json()) as { prompt?: string; hasImage?: boolean };
  const text = String(prompt ?? "").trim().slice(0, 4000);
  if (!text) return Response.json({ questions: [] });

  try {
    const client = new OpenAI({ apiKey, baseURL: process.env.LLM_BASE_URL, timeout: 40_000, maxRetries: 1 });
    const res = await client.chat.completions.create({
      model: process.env.LLM_MODEL || "gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `User request:\n${text}${hasImage ? "\n\n(The user also attached a reference image.)" : ""}`,
        },
      ],
    });
    return Response.json({ questions: parse(res.choices[0]?.message?.content ?? "") });
  } catch {
    // Questions are optional: on any failure the UI just builds directly.
    return Response.json({ questions: [] });
  }
}
