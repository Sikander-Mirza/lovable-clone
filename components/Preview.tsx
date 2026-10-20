"use client";

import { useState } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import { Eye, Code2 } from "lucide-react";

const DEPENDENCIES = {
  "lucide-react": "^0.468.0",
  "react-router-dom": "^6.28.0",
  "framer-motion": "^11.15.0",
  recharts: "^2.15.0",
  "date-fns": "^4.1.0",
};

export default function Preview({ files }: { files: Record<string, string> }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const hasFiles = Object.keys(files).length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        {(
          [
            ["preview", Eye, "Preview"],
            ["code", Code2, "Code"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
              tab === id ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {!hasFiles ? (
          <div className="flex h-full items-center justify-center text-white/40">
            Your app will appear here.
          </div>
        ) : (
          <SandpackProvider
            template="react"
            theme="dark"
            files={files}
            customSetup={{ dependencies: DEPENDENCIES }}
            options={{
              externalResources: ["https://cdn.tailwindcss.com"],
              recompileMode: "delayed",
              recompileDelay: 600,
            }}
            style={{ height: "100%" }}
          >
            <div className="h-full" style={{ display: tab === "preview" ? "block" : "none" }}>
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                style={{ height: "100%" }}
              />
            </div>
            <div className="h-full" style={{ display: tab === "code" ? "flex" : "none" }}>
              <SandpackFileExplorer style={{ height: "100%", width: 200 }} />
              <SandpackCodeEditor style={{ height: "100%", flex: 1 }} showTabs={false} />
            </div>
          </SandpackProvider>
        )}
      </div>
    </div>
  );
}
