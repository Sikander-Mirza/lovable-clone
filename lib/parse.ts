export type ParsedFiles = {
  files: Record<string, string>;
  /** path of a file block that is still streaming (no closing tag yet) */
  openPath?: string;
  /** assistant prose with file blocks removed */
  text: string;
};

const BLOCK = /<file path="([^"]+)">\n?([\s\S]*?)<\/file>/g;

export function parseAssistant(raw: string): ParsedFiles {
  const files: Record<string, string> = {};
  let text = raw.replace(BLOCK, (_m, path: string, body: string) => {
    files[path] = body.replace(/\n$/, "");
    return "";
  });

  let openPath: string | undefined;
  const open = text.match(/<file path="([^"]+)">\n?([\s\S]*)$/);
  if (open) {
    openPath = open[1];
    files[openPath] = open[2];
    text = text.slice(0, open.index);
  }
  return { files, openPath, text: text.replace(/\n{3,}/g, "\n\n").trim() };
}
