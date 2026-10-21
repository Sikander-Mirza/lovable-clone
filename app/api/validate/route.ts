import { validateProject } from "@/lib/validate";

export const runtime = "nodejs";

// Static checks on generated files. Cheap (no AI), so the client calls it after each generation.
export async function POST(req: Request) {
  try {
    const { files } = (await req.json()) as { files?: Record<string, string> };
    if (!files || typeof files !== "object") return Response.json({ issues: [] });
    return Response.json({ issues: await validateProject(files) });
  } catch {
    return Response.json({ issues: [] }); // never block the user on a validator failure
  }
}
