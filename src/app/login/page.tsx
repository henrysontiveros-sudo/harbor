"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const domainError = params.get("error") === "domain";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-imperial relative overflow-hidden px-4 py-8">
      {/* subtle wave bands */}
      <div className="absolute inset-x-0 bottom-0 h-64 opacity-20"
        style={{
          background:
            "radial-gradient(120% 60% at 50% 100%, #7BC7CF 0%, transparent 60%)",
        }}
      />
      <div className="card relative z-10 w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-8">
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

        {googleEnabled ? (
          <button onClick={signInGoogle} disabled={busy}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-ink/20 bg-white px-4 py-3 font-medium hover:bg-ink/5 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {busy ? "Signing in…" : "Sign in with Google"}
          </button>
        ) : (
          <div className="rounded-lg bg-coral/10 border border-coral/30 px-4 py-3 text-sm text-coral text-center">
            Google sign-in is temporarily unavailable. Please contact an admin.
          </div>
        )}

        <p className="text-xs text-ink/40 text-center mt-6">
          Restricted to Mariners Church staff.
        </p>
        <p className="text-xs text-ink/40 text-center mt-2">
          <a href="/privacy" className="underline hover:text-ink/60">Privacy Policy</a>
          <span className="mx-1.5">·</span>
          <a href="/terms" className="underline hover:text-ink/60">Terms of Service</a>
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
