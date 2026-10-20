import type { Message } from "./store";

/** 1-based version number: counts assistant replies that carry a snapshot. */
export function versionNumber(messages: Message[], index: number): number {
  let n = 0;
  for (let i = 0; i <= index; i++) if (messages[i].role === "assistant" && messages[i].snapshot) n++;
  return n;
}

export function sameFiles(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}
