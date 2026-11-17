"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buildPreviewDoc } from "@/lib/previewDoc";
import { loadShare, type PublicShare } from "@/lib/share";
import { getSupabase } from "@/lib/supabase";

/** Public, read-only view of a shared project. Anyone with the link can open it. */
export default function SharedSite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [share, setShare] = useState<PublicShare | null | undefined>(undefined);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadShare(id).then(setShare);
  }, [id]);

  useEffect(() => {
    if (share) document.title = share.name;
  }, [share]);

  const doc = useMemo(() => (share ? buildPreviewDoc(share.files, {}, false) : ""), [share]);

  // Forms on a shared site save to the owner's Data tab, like on the live site.
  useEffect(() => {
    if (!share) return;
    const onMsg = async (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data;
      if (d?.type !== "form-submit" || typeof d.name !== "string") return;
      const payload = d.data && typeof d.data === "object" ? d.data : {};
      let ok = false;
      if (JSON.stringify(payload).length <= 10_000) {
        const res = await getSupabase()?.from("submissions").insert({
          project_id: share.projectId,
          form: d.name.slice(0, 40) || "form",
          data: payload,
        });
        ok = !!res && !res.error;
      }
      frame.current?.contentWindow?.postMessage({ type: "submit-result", id: d.id, ok }, "*");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [share]);

  if (share === undefined) {
    return (
      <main id="main" className="flex h-[100dvh] items-center justify-center text-sm text-white/65">
        Loading…
      </main>
    );
  }
  if (share === null) {
    return (
      <main id="main" className="flex h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold">This link isn&apos;t available</h1>
        <p className="max-w-sm text-sm text-white/65">The site may have stopped being shared, or the link is mistyped.</p>
        <Link href="/" className="btn-primary h-9 px-4">
          Build your own
        </Link>
      </main>
    );
  }
  return (
    <main id="main" className="relative h-[100dvh] bg-white">
      <iframe
        ref={frame}
        title={share.name}
        srcDoc={doc}
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        className="h-full w-full border-0"
      />
      <Link
        href="/"
        className="fixed bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0d0d14]/90 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur hover:bg-[#0d0d14]"
      >
        <Sparkles size={12} className="text-violet-300" /> Made with Lovable Clone
      </Link>
    </main>
  );
}
