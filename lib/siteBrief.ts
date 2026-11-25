// One short model call before a new site is built. It answers two questions about the request:
// which style playbook (lib/styles.ts) fits, and which Unsplash searches would find fitting photos
// (lib/unsplash.ts). Both are best effort: a failed call just means the site is built without them.

import { STYLE_IDS, styleMenu } from "./styles";
import { parseQueries } from "./unsplash";

export type Brief = { style: string | null; queries: string[] };

export const BRIEF_SYSTEM = `You prepare a website request for the designer, before anything is built.
Reply with ONLY a JSON object: {"style": "<id>", "queries": ["...", "..."]}

"style" is the id of the visual playbook that best fits this business, audience and tone (choose by feel, not by industry alone):
${styleMenu()}
Use "none" if the request is a small single-purpose tool (counter, calculator, timer, converter, to-do list, quiz).

"queries" is 2 to 4 short English search queries (2 to 4 words each) for Unsplash photos that fit the site's real subject (what it sells or shows), not generic business clichés. Cover different needs, for example a wide hero scene, detail close-ups, and people if the site needs them. Use [] if the site needs no photos.`;

/** Reads the model's reply: an object, or (for older replies) a bare array of queries. Never throws. */
export function parseBrief(raw: string): Brief {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      const d = JSON.parse(raw.slice(a, b + 1));
      const style = typeof d?.style === "string" && STYLE_IDS.includes(d.style) ? d.style : null;
      return { style, queries: parseQueries(JSON.stringify(Array.isArray(d?.queries) ? d.queries : [])) };
    } catch {
      /* fall through to the bare-array form */
    }
  }
  return { style: null, queries: parseQueries(raw) };
}
