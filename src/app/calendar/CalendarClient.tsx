"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FeedDef {
  scope: "mine" | "ministries" | "congregations";
  label: string;
  blurb: string;
}

const FEEDS: FeedDef[] = [
  { scope: "mine", label: "My bookings", blurb: "Events you created or can edit." },
  { scope: "ministries", label: "My ministries", blurb: "Events for the groups you're assigned to." },
  { scope: "congregations", label: "My congregations", blurb: "Events across the congregations you oversee." },
];

export default function CalendarClient({
  token,
  appUrl,
  isAdmin,
}: {
  token: string;
  appUrl: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [tok, setTok] = useState(token);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Show all three to admins; regular staff get the two that apply to them
  // (congregations still works for everyone, so keep it).
  const feeds = FEEDS;

  function httpsUrl(scope: string) {
    return `${appUrl}/api/calendar/${tok}?scope=${scope}`;
  }
  function webcalUrl(scope: string) {
    // webcal:// makes Apple/Google/Outlook offer a one-click subscribe.
    const noProto = appUrl.replace(/^https?:\/\//, "");
    return `webcal://${noProto}/api/calendar/${tok}?scope=${scope}`;
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      setErr("Couldn't copy — long-press or select the link to copy manually.");
    }
  }

  async function regenerate() {
    if (!confirm("Regenerate your calendar link? Any calendars you've already subscribed with the old link will stop updating and need to be re-added.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/calendar/regenerate", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed to regenerate");
      setTok(d.token);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to regenerate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {err && <p className="text-sm text-coral">{err}</p>}

      {feeds.map((f) => {
        const https = httpsUrl(f.scope);
        const webcal = webcalUrl(f.scope);
        return (
          <section key={f.scope} className="card p-4">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h2 className="font-bold text-imperial">{f.label}</h2>
              {f.scope === "congregations" && !isAdmin && (
                <span className="text-[11px] text-ink/40">all congregations</span>
              )}
            </div>
            <p className="text-xs text-ink/50 mb-3">{f.blurb}</p>

            <div className="flex flex-col sm:flex-row gap-2">
              <a href={webcal} className="btn-primary px-3 py-2 text-sm text-center">
                Subscribe
              </a>
              <button
                onClick={() => copy(https, f.scope + "-https")}
                className="btn-secondary px-3 py-2 text-sm"
              >
                {copied === f.scope + "-https" ? "Copied!" : "Copy link"}
              </button>
            </div>

            <p className="mt-2 text-[11px] text-ink/40 break-all font-mono">{https}</p>
          </section>
        );
      })}

      <section className="card p-4 bg-ink/[0.02]">
        <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">How to subscribe</p>
        <ul className="text-sm text-ink/70 space-y-1.5 list-disc pl-5">
          <li><strong>Apple Calendar / iPhone:</strong> tap <em>Subscribe</em> — it opens the Calendar app and adds it.</li>
          <li><strong>Google Calendar:</strong> use <em>Copy link</em>, then Google Calendar → Other calendars → <em>From URL</em> → paste.</li>
          <li><strong>Outlook:</strong> Add calendar → <em>Subscribe from web</em> → paste the copied link.</li>
        </ul>
        <p className="text-xs text-ink/40 mt-3">
          These links are private to you — anyone with a link can see that view&apos;s events, so don&apos;t share them.
        </p>
      </section>

      <section>
        <button onClick={regenerate} disabled={busy} className="text-xs text-coral hover:underline disabled:opacity-50">
          {busy ? "Regenerating…" : "Reset my calendar links (revoke old subscriptions)"}
        </button>
      </section>
    </div>
  );
}
