"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function anchorEmoji() {
  return "⚓";
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const domainError = params.get("error") === "domain";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  async function signInGoogle() {
    setBusy(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { hd: "marinerschurch.org", prompt: "select_account" },
      },
    });
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const domain = email.split("@")[1]?.toLowerCase();
    if (!["marinerschurch.org", "inov8-socal.tech"].includes(domain || "")) {
      setErr("Please use your @marinerschurch.org email.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-imperial relative overflow-hidden">
      {/* subtle wave bands */}
      <div className="absolute inset-x-0 bottom-0 h-64 opacity-20"
        style={{
          background:
            "radial-gradient(120% 60% at 50% 100%, #7BC7CF 0%, transparent 60%)",
        }}
      />
      <div className="card relative z-10 w-full max-w-md mx-4 p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">{anchorEmoji()}</div>
          <h1 className="text-3xl font-black text-imperial tracking-tight">
            Harbor
          </h1>
          <p className="text-sm text-ink/60 mt-2">
            Space requests &amp; event scheduling
            <br />
            for Mariners Church
          </p>
        </div>

        {domainError && (
          <div className="mb-4 rounded-lg bg-coral/10 border border-coral/30 px-4 py-3 text-sm text-coral">
            Please sign in with your @marinerschurch.org account.
          </div>
        )}

        {googleEnabled && (
          <>
            <button onClick={signInGoogle} disabled={busy}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-ink/20 bg-white px-4 py-3 font-medium hover:bg-ink/5 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign in with Google
            </button>
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-ink/10" />
              <span className="text-xs text-ink/40 uppercase tracking-wide">or</span>
              <div className="h-px flex-1 bg-ink/10" />
            </div>
          </>
        )}

        {sent ? (
          <div className="rounded-lg bg-sky/15 border border-sky/40 px-4 py-4 text-sm text-imperial text-center">
            Check your inbox — we sent a sign-in link to <b>{email}</b>.
          </div>
        ) : (
          <form onSubmit={signInEmail} className="space-y-3">
            <div>
              <label className="label">Work email</label>
              <input type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@marinerschurch.org" className="input" />
            </div>
            {err && <p className="text-sm text-coral">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}

        <p className="text-xs text-ink/40 text-center mt-6">
          Restricted to Mariners Church staff.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
