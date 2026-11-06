"use client";

import { Sparkles } from "lucide-react";

/** A page skeleton that "assembles itself" with a scanning line, shown before the first file exists. */
export default function BuildingWireframe({ label = "Designing and writing your site" }: { label?: string }) {
  // Each block fades in a little after the previous one, so the page seems to be drawn top to bottom.
  const blk = (i: number) => ({ animationDelay: `${i * 0.22}s` });
  const bar = "shimmer block-in rounded-md";

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[#0b0b11] p-6">
      <div className="bg-glow pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative w-full max-w-3xl">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0e0e15] shadow-2xl shadow-violet-950/30">
          <div className="scan-line" />

          {/* window chrome */}
          <div className="flex items-center gap-1.5 border-b border-white/[.06] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <div className="shimmer ml-3 h-4 w-48 rounded-full" />
          </div>

          <div className="space-y-6 p-6">
            {/* navbar */}
            <div className="flex items-center gap-4">
              <div className={`${bar} h-5 w-24`} style={blk(0)} />
              <div className="ml-auto flex gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className={`${bar} h-3 w-12`} style={blk(n * 0.5)} />
                ))}
              </div>
            </div>

            {/* hero */}
            <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-3">
                <div className={`${bar} h-8 w-11/12`} style={blk(4)} />
                <div className={`${bar} h-8 w-3/4`} style={blk(5)} />
                <div className={`${bar} mt-4 h-3 w-full`} style={blk(6)} />
                <div className={`${bar} h-3 w-5/6`} style={blk(7)} />
                <div className="flex gap-3 pt-2">
                  <div className={`${bar} h-9 w-28 !rounded-lg`} style={blk(8)} />
                  <div className={`${bar} h-9 w-24 !rounded-lg`} style={blk(9)} />
                </div>
              </div>
              <div className={`${bar} h-44 !rounded-xl`} style={blk(6)} />
            </div>

            {/* sections */}
            <div className="grid grid-cols-3 gap-4">
              {[10, 11, 12].map((n) => (
                <div key={n} className="space-y-2">
                  <div className={`${bar} h-24 !rounded-lg`} style={blk(n)} />
                  <div className={`${bar} h-3 w-2/3`} style={blk(n + 0.5)} />
                  <div className={`${bar} h-3 w-full`} style={blk(n + 1)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-violet-200/80">
          <Sparkles size={15} className="animate-pulse" />
          <span className="caret">{label}</span>
        </div>
      </div>
    </div>
  );
}
