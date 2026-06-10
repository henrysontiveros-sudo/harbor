"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

export default function MobileNav({ isAdmin, name }: { isAdmin: boolean; name: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links: { href: string; label: string }[] = [
    { href: "/", label: "This Week" },
    { href: "/spaces", label: "Find a Space" },
    { href: "/events", label: "My Events" },
    { href: "/setup-sheet", label: "Setup Sheet" },
    ...(isAdmin
      ? [
          { href: "/approvals", label: "Approvals" },
          { href: "/admin", label: "Admin" },
        ]
      : []),
  ];

  return (
    <div className="flex flex-1 items-center justify-end gap-1.5 md:hidden">
      {/* Compact new-event button, always visible on mobile */}
      <Link
        href="/events/new"
        aria-label="New event"
        className="bg-sky text-imperial font-black text-xl w-10 h-10 flex items-center justify-center rounded-md hover:bg-white transition-colors"
      >
        +
      </Link>

      {/* Hamburger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {/* Slide-down menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full bg-imperial border-t border-white/10 shadow-xl md:hidden">
          <nav className="px-4 py-3 flex flex-col text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-3 rounded-md font-medium hover:bg-white/10 transition-colors ${pathname === l.href ? "bg-white/10" : ""}`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/events/new"
              onClick={() => setOpen(false)}
              className="mt-2 bg-sky text-imperial font-bold px-3 py-3 rounded-md text-center hover:bg-white transition-colors"
            >
              + New Event
            </Link>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs text-white/70">
              <span className="truncate">{name}</span>
              <SignOutButton />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
