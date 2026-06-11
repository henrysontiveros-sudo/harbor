"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CURRENT_VERSION, CHANGELOG, type ChangeType } from "@/lib/version";

const TYPE_CONFIG: Record<ChangeType, { label: string; cls: string }> = {
  feature:     { label: "New",      cls: "bg-imperial/10 text-imperial" },
  improvement: { label: "Improved", cls: "bg-cerulean/10 text-cerulean" },
  fix:         { label: "Fix",      cls: "bg-coral/15 text-coral" },
  security:    { label: "Security", cls: "bg-sand/60 text-[#8a6320]" },
};

export default function VersionBadge() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <>
      {/* Version pill — fixed bottom-left */}
      <div className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-40 print:hidden">
        <button
          onClick={() => setOpen(true)}
          title="View change log"
          className="bg-imperial text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md ring-1 ring-white/20 hover:bg-imperial/80 transition-colors tracking-widest"
        >
          v{CURRENT_VERSION}
        </button>
      </div>

      {/* Changelog modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="bg-imperial px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-white font-bold text-base tracking-wide">Change Log</h2>
                <p className="text-white/50 text-[11px] mt-0.5 tracking-widest uppercase">
                  Harbor · Mariners Church
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/50 hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="h-[3px] bg-cerulean shrink-0" />

            <div className="overflow-y-auto p-6 space-y-8">
              {[...CHANGELOG].reverse().map((entry) => (
                <div key={entry.version}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-imperial text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full tracking-widest">
                      v{entry.version}
                    </span>
                    <span className="text-ink/40 text-xs">{entry.date}</span>
                  </div>
                  <ul className="space-y-2.5">
                    {entry.changes.map((change, i) => {
                      const cfg = TYPE_CONFIG[change.type];
                      return (
                        <li key={i} className="flex items-start gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-px ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                          <span className="text-sm text-ink/80 leading-snug">{change.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
