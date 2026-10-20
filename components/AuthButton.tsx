"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { importLocalProjects, localProjectCount } from "@/lib/store";

export default function AuthButton({ onChange }: { onChange: () => void }) {
  const sb = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      // Defer: supabase-js must not be called synchronously inside this callback.
      setTimeout(async () => {
        if (session?.user && localProjectCount() > 0) await importLocalProjects();
        onChange();
      }, 0);
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sb) {
    return (
      <span
        className="text-xs text-white/30"
        title="Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable login"
      >
        Saved in this browser only
      </span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/60">
        <span className="max-w-[180px] truncate">{user.email}</span>
        <button onClick={() => sb.auth.signOut()} className="hover:text-white" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setMsg("");
    const { data, error } =
      mode === "in"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === "up" && !data.session) {
      return setMsg("Check your email to confirm your account, then sign in.");
    }
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
      >
        Sign in
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm space-y-3 rounded-2xl border border-white/15 bg-[#14141c] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{mode === "in" ? "Sign in" : "Create account"}</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
            />
            {msg && <p className="text-xs text-amber-300">{msg}</p>}
            <button
              onClick={submit}
              disabled={busy || !email || !password}
              className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy ? "..." : mode === "in" ? "Sign in" : "Sign up"}
            </button>
            <button
              onClick={() => setMode(mode === "in" ? "up" : "in")}
              className="w-full text-xs text-white/50 hover:text-white"
            >
              {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
