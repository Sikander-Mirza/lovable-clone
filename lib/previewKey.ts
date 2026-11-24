// A preview page bakes in things that cannot be swapped by a hot update: the Tailwind config (the
// brand color scale), the Google Fonts link and the <html lang/dir>. They all come from /theme.json
// and the language in /site.json. When the page was started before those files existed (the empty
// shell that loads while the AI is still writing), its style key differs from the finished site's,
// and the preview must be reloaded once at the end of the build.

import { parseSite } from "./site";

export function styleKey(files: Record<string, string>): string {
  return `${files["/theme.json"] ?? ""}|${parseSite(files).seo.lang}`;
}
