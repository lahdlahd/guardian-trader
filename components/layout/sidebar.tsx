"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Activity,
  Shield,
  Fingerprint,
  Trophy,
  Share2,
  FileText,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trade-feed", label: "Trade Feed", icon: Activity },
  { href: "/guardian", label: "Guardian", icon: Shield },
  { href: "/identity", label: "Identity", icon: Fingerprint },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/social", label: "Build in Public", icon: Share2 },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
          <Shield className="h-4.5 w-4.5 text-emerald-400" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-white">Guardian</span>
          <span className="text-sm font-light tracking-tight text-zinc-500 ml-1">Trader</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                active
                  ? "bg-white/[0.08] text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-zinc-600">Demo Mode Active</span>
        </div>
        <p className="mt-1 text-[10px] text-zinc-700 font-mono">lablab.ai Hackathon 2025</p>
      </div>
    </aside>
  );
}
