"use client";

import { useCallback, useEffect, useState } from "react";

export type Connections = {
  github: { configured: boolean; connected: boolean; login: string | null };
  vercel: { configured: boolean; connected: boolean };
};

/** OAuth connection status from the server; refreshes whenever `active` becomes true. */
export function useConnections(active: boolean) {
  const [conn, setConn] = useState<Connections | null>(null);

  const refresh = useCallback(async () => {
    try {
      setConn(await (await fetch("/api/connections")).json());
    } catch {}
  }, []);

  useEffect(() => {
    if (active) refresh();
  }, [active, refresh]);

  const disconnect = async (provider: "github" | "vercel") => {
    await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    refresh();
  };

  /** Full-page redirect into the OAuth flow, returning to the current page afterwards. */
  const connectUrl = (provider: "github" | "vercel") =>
    `/api/auth/${provider}/login?return=${encodeURIComponent(
      typeof window === "undefined" ? "/" : window.location.pathname
    )}`;

  return { conn, refresh, disconnect, connectUrl };
}
