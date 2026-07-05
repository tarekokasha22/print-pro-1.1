"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes (mobile navigation).
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen relative">

      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <Sidebar open={open} onClose={() => setOpen(false)} />
      <TopBar onMenuClick={() => setOpen((v) => !v)} />

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="relative z-10 lg:mr-64 pt-16 min-h-screen" style={{ direction: "rtl" }}>
        <div className="p-3 sm:p-5 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
