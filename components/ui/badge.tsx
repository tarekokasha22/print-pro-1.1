import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "gold" | "electric" | "green" | "red" | "gray";
}

function Badge({ className, variant = "gold", ...props }: BadgeProps) {
  const variants = {
    gold: "badge-gold",
    electric: "badge-electric",
    green: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5 text-xs font-600",
    red: "bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2.5 py-0.5 text-xs font-600",
    gray: "bg-white/8 text-slate-400 border border-white/10 rounded-full px-2.5 py-0.5 text-xs font-600",
  };

  return (
    <span
      className={cn("inline-flex items-center font-cairo", variants[variant], className)}
      {...props}
    />
  );
}

export { Badge };
