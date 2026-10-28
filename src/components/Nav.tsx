"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today", icon: "M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0" },
  { href: "/compare", label: "Compare", icon: "M5 20V10M12 20V4M19 20v-7" },
  { href: "/plan", label: "Day plan", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/profile", label: "Goals", icon: "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8M5 20a7 7 0 0 1 14 0" },
];

/** Bottom tab bar on phones, top bar on wider screens. */
export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 backdrop-blur sm:top-0 sm:bottom-auto sm:border-t-0 sm:border-b">
      <div className="mx-auto flex max-w-xl items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] sm:justify-between sm:px-4">
        <span className="hidden text-sm font-medium text-gold sm:block">Boiler Plate</span>
        <div className="flex w-full justify-around sm:w-auto sm:gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] sm:flex-row sm:gap-1.5 sm:rounded-lg sm:text-sm ${
                  active ? "text-gold" : "text-muted hover:text-cream"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={link.icon} />
                </svg>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
