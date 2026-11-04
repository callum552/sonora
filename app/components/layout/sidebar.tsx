"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  Compass,
  Disc3,
  Library,
  UserRound,
  Settings,
  Headphones,
  Clock3,
} from "lucide-react";

const navigation = [
  { label: "Discover", href: "/", icon: Compass },
  { label: "Explore", href: "/explore", icon: Disc3 },
  { label: "History", href: "/history", icon: Clock3 },
  { label: "Your Library", href: "/library", icon: Library },
  { label: "Your Profile", href: "/profile", icon: UserRound },
];

function SidebarContent() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-64 flex-col border-r border-white/[0.07] bg-[#151515] px-6 py-8 md:flex">
      {/* Branding */}
      <Link href="/" className="mb-14 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6A45D]/10">
          <Headphones className="h-6 w-6 text-[#D6A45D]" />
        </div>

        <div>
          <span className="block text-lg font-semibold tracking-[0.22em] text-[#F5F2ED]">
            SONORA
          </span>
          <span className="text-[9px] uppercase tracking-[0.24em] text-neutral-500">
            Music discovery
          </span>
        </div>
      </Link>

      {/* Main navigation */}
      <div>
        <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
          Menu
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] transition-all duration-200 ${
                  isActive
                    ? "bg-[#D6A45D]/10 font-medium text-[#D6A45D]"
                    : "text-neutral-400 hover:bg-white/[0.04] hover:text-[#F5F2ED]"
                }`}
              >
                {isActive && (
                  <span className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full bg-[#D6A45D]" />
                )}

                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.7}
                  className={
                    isActive
                      ? "text-[#D6A45D]"
                      : "text-neutral-500 transition-colors group-hover:text-neutral-300"
                  }
                />

                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="mt-auto">
        <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
          Preferences
        </p>

        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] transition-all duration-200 ${
            pathname.startsWith("/settings")
              ? "bg-[#D6A45D]/10 font-medium text-[#D6A45D]"
              : "text-neutral-400 hover:bg-white/[0.04] hover:text-[#F5F2ED]"
          }`}
        >
          <Settings size={18} strokeWidth={1.7} />
          Settings
        </Link>

        <div className="mt-8 border-t border-white/[0.07] pt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            Your sound. Your discovery.
          </p>

          <p className="mt-3 text-[10px] tracking-wide text-neutral-700">
            SONORA © 2026
          </p>
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense
      fallback={
        <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-64 border-r border-white/[0.07] bg-[#151515] md:block" />
      }
    >
      <SidebarContent />
    </Suspense>
  );
}
