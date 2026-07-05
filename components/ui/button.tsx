"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gold" | "glass" | "electric" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "glass", size = "md", loading, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-cairo font-600 transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      gold: "bg-gradient-to-br from-gold-500 to-gold-600 text-navy-900 font-700 shadow-gold-glow hover:shadow-gold-glow-lg hover:-translate-y-0.5 rounded-xl",
      glass: "glass-md hover:glass-lg text-slate-100 rounded-xl border-none",
      electric: "bg-gradient-to-br from-electric-500 to-electric-600 text-white shadow-electric-glow hover:-translate-y-0.5 rounded-xl",
      ghost: "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white rounded-xl",
      danger: "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-5 py-2.5 text-sm",
      lg: "px-7 py-3 text-base",
      icon: "w-9 h-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
