"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/firebase";
import { LogoIcon } from "@/components/Logo";
import {
  ScanLine,
  RefreshCw,
  FileEdit,
  Palette,
  Sparkles,
  LayoutDashboard,
  FolderOpen,
  LogOut,
  ChevronLeft,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/scanner", label: "الماسح الضوئي", icon: ScanLine },
  { href: "/dashboard/converter", label: "محول الملفات", icon: RefreshCw },
  { href: "/dashboard/editor", label: "محرر PDF", icon: FileEdit },
  { href: "/dashboard/designer", label: "مصمم الأغلفة", icon: Palette },
  { href: "/dashboard/ai-studio", label: "الذكاء الاصطناعي", icon: Sparkles },
  { href: "/dashboard/files", label: "ملفاتي", icon: FolderOpen },
];

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <aside className={cn(
        "fixed right-0 top-0 h-full w-64 z-40 flex flex-col transition-transform duration-300 lg:translate-x-0",
        open ? "translate-x-0" : "translate-x-full"
      )}
      style={{
        background: "rgba(6,10,20,0.95)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/8">
        <LogoIcon size={42} className="flex-shrink-0 drop-shadow-[0_0_12px_rgba(109,92,240,0.35)]" />
        <div>
          <h1 className="font-900 text-lg leading-none logo-gradient">Print Pro</h1>
          <p className="text-xs text-slate-500 mt-0.5">منصة الطباعة الذكية</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-600 transition-all duration-200 group",
                active
                  ? "nav-active"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  active ? "text-gold-500" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span>{label}</span>
              {active && (
                <ChevronLeft className="w-4 h-4 mr-auto text-gold-500/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
