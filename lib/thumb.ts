// Small screenshots of each project's home page, taken by the preview itself and kept in this
// browser only (not synced). Shown on the project cards of the landing page.

const key = (projectId: string) => `lovable-clone:thumb:${projectId}`;
const MAX_CHARS = 90_000;

export const isThumb = (v: unknown): v is string =>
  typeof v === "string" && v.startsWith("data:image/jpeg;base64,") && v.length <= MAX_CHARS;

export function getThumb(projectId: string): string | null {
  try {
    const v = localStorage.getItem(key(projectId));
    return isThumb(v) ? v : null;
  } catch {
    return null;
  }
}

export function setThumb(projectId: string, data: unknown): boolean {
  if (!isThumb(data)) return false;
  try {
    localStorage.setItem(key(projectId), data);
    return true;
  } catch {
    return false;
  }
}

export function clearThumb(projectId: string) {
  try {
    localStorage.removeItem(key(projectId));
  } catch {}
}
