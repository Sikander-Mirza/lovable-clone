export type Message = { role: "user" | "assistant"; content: string };

export type Project = {
  id: string;
  name: string;
  messages: Message[];
  files: Record<string, string>;
  updatedAt: number;
};

const KEY = "lovable-clone:projects";

function readAll(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(list: Project[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export const listProjects = () => readAll().sort((a, b) => b.updatedAt - a.updatedAt);

export const getProject = (id: string) => readAll().find((p) => p.id === id);

export function saveProject(p: Project) {
  const list = readAll().filter((x) => x.id !== p.id);
  list.push({ ...p, updatedAt: Date.now() });
  writeAll(list);
}

export function deleteProject(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function createProject(prompt: string): Project {
  const p: Project = {
    id: Math.random().toString(36).slice(2, 10),
    name: prompt.slice(0, 40) || "Untitled",
    messages: [{ role: "user", content: prompt }],
    files: {},
    updatedAt: Date.now(),
  };
  saveProject(p);
  return p;
}
