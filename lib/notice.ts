// The generate route may start its stream with a one-line "[notice] ..." (for example when it had
// to switch to a backup model). The UI shows it as a banner instead of part of the reply.

export const NOTICE_PREFIX = "[notice] ";

export function splitNotice(raw: string): { raw: string; notice: string | null } {
  if (!raw.startsWith(NOTICE_PREFIX)) return { raw, notice: null };
  const nl = raw.indexOf("\n");
  if (nl < 0) return { raw: "", notice: raw.slice(NOTICE_PREFIX.length).trim() || null };
  return { raw: raw.slice(nl + 1), notice: raw.slice(NOTICE_PREFIX.length, nl).trim() || null };
}
