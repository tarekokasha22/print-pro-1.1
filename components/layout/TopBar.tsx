"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string; icon: string }> = {
  "/dashboard": { title: "لوحة التحكم", subtitle: "مرحباً بك في Print Pro", icon: "🏠" },
  "/dashboard/scanner": { title: "الماسح الضوئي", subtitle: "حوّل صورك إلى PDF بجودة عالية", icon: "📷" },
  "/dashboard/converter": { title: "محول الملفات", subtitle: "تحويل بين جميع صيغ الملفات", icon: "🔄" },
  "/dashboard/editor": { title: "محرر PDF", subtitle: "تعديل وتحرير ملفات PDF بالكامل", icon: "✏️" },
  "/dashboard/designer": { title: "مصمم الأغلفة", subtitle: "صمّم أغلفة احترافية بسهولة", icon: "🎨" },
  "/dashboard/ai-studio": { title: "استوديو الذكاء الاصطناعي", subtitle: "أنشئ وحرّر بقوة Gemini", icon: "✨" },
  "/dashboard/files": { title: "ملفاتي", subtitle: "جميع ملفاتك في مكان واحد", icon: "📁" },
};

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const page = pageTitles[pathname] || { title: "Print Pro", subtitle: "", icon: "🖨️" };

  return (
    <header
      className="fixed top-0 left-0 right-0 lg:right-64 z-20 h-16 flex items-center justify-between px-4 sm:px-8"
      style={{
        background: "rgba(6,10,20,0.85)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="القائمة"
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-2xl">{page.icon}</span>
        <div>
          <h2 className="text-sm sm:text-base font-700 text-slate-100 leading-tight">{page.title}</h2>
          <p className="text-xs text-slate-500 leading-tight hidden sm:block">{page.subtitle}</p>
        </div>
      </div>

      {/* Right side intentionally empty — user info removed */}
    </header>
  );
}
