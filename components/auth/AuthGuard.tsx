"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Printer } from "lucide-react";

/** Wraps protected pages — redirects to /login when there is no Firebase user. */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setReady(true);
      } else {
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
        >
          <Printer className="w-7 h-7 text-navy-900" />
        </div>
        <p className="text-sm text-slate-500">جاري التحقق…</p>
      </div>
    );
  }

  return <>{children}</>;
}
