"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="px-2 py-1 rounded hover:bg-white/10 transition-colors"
      title="Sign out"
    >
      Sign out
    </button>
  );
}
