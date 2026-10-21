import { parseBlocks, type FileEdit } from "./edits";

export type ParsedFiles = {
  files: Record<string, string>;
  /** SEARCH/REPLACE patches for existing files (complete <edit> blocks only) */
  edits: FileEdit[];
  /** path of a file block that is still streaming (no closing tag yet) */
  openPath?: string;
  /** path of an edit block that is still streaming */
  openEditPath?: string;
  /** assistant prose with file/edit blocks removed */
  text: string;
};

const BLOCK = /<file path="([^"]+)">\n?([\s\S]*?)<\/file>/g;
const EDIT = /<edit path="([^"]+)">\n?([\s\S]*?)<\/edit>/g;

export function parseAssistant(raw: string): ParsedFiles {
  const files: Record<string, string> = {};
  const edits: FileEdit[] = [];

  let text = raw.replace(BLOCK, (_m, path: string, body: string) => {
    files[path] = body.replace(/\n$/, "");
    return "";
  });
  text = text.replace(EDIT, (_m, path: string, body: string) => {
    edits.push({ path, blocks: parseBlocks(body) });
    return "";
  });

  let openPath: string | undefined;
  let openEditPath: string | undefined;
  const open = text.match(/<file path="([^"]+)">\n?([\s\S]*)$/);
  if (open) {
    openPath = open[1];
    files[openPath] = open[2];
    text = text.slice(0, open.index);
  }
  const openEdit = text.match(/<edit path="([^"]+)">[\s\S]*$/);
  if (openEdit) {
    openEditPath = openEdit[1];
    text = text.slice(0, openEdit.index);
  }
  return { files, edits, openPath, openEditPath, text: text.replace(/\n{3,}/g, "\n\n").trim() };
}
