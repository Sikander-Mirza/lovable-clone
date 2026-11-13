import { complete } from "@/lib/llm";
import { guardRequest } from "@/lib/guard";
import { parsePlan } from "@/lib/plan";
import { FONTS } from "@/lib/theme";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM = `You are an art director and information architect planning a website BEFORE it is built.
Design specifically for this business, audience, and content. Establish a clear visual direction before anything else. Choose section layouts based on their purpose. Avoid automatically using centered heroes, equal-sized feature cards, decorative gradients, pill badges, and repeated rounded containers; use those patterns only when they support the chosen direction. Create character through typography, composition, imagery, and content hierarchy. Preserve usability and accessibility.

Respond with ONLY a JSON object (no markdown) of this shape:
{
  "kind": "site",
  "direction": "2 sentences: the specific visual direction for THIS business (typography, palette mood, composition)",
  "brand": "#rrggbb main accent color that fits the direction and any color the user asked for",
  "font": "one of: ${FONTS.join(", ")}",
  "headingFont": "one of the same list",
  "pages": ["Home"],
  "sections": [
    { "title": "short name", "purpose": "one line", "layout": "one concrete layout idea, different from the other sections", "content": "one line: the real, specific content it holds" }
  ],
  "features": ["interactive things it needs, e.g. booking form"]
}
Rules: 6 to 9 sections for a website, in page order, each with a different layout idea. Use Cairo or Noto Nastaliq Urdu for Arabic/Urdu sites. Write title/purpose/layout/content in the language the user wrote in.
If the request is a small single-purpose tool (counter, calculator, timer, converter, to-do, quiz...) respond with exactly {"kind":"tool"}.`;

export async function POST(req: Request) {
  const blocked = await guardRequest(req);
  if (blocked) return blocked;
  try {
    const { prompt, details } = (await req.json()) as { prompt?: string; details?: string };
    const request = `${String(prompt ?? "").slice(0, 3000)}${details ? `\n\n${String(details).slice(0, 3000)}` : ""}`.trim();
    if (!request) return Response.json({ plan: null });
    const raw = await complete(SYSTEM, `Plan this website request:\n\n${request}`);
    return Response.json({ plan: parsePlan(raw) });
  } catch {
    // Planning is optional: the client builds directly when it fails.
    return Response.json({ plan: null });
  }
}
