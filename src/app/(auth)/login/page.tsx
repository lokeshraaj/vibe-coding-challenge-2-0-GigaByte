"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      toast.success(`Welcome back, ${data.data.user.name}!`);

      // Role-based routing
      const role = data.data.user.role;
      if (role === "PLATFORM_ADMIN") router.push("/dashboard/admin");
      else if (role === "ACADEMY_OWNER") router.push("/dashboard/owner");
      else if (role === "COACH") router.push("/dashboard/coach");
      else if (role === "SCOUT") router.push("/dashboard/scout");
      else if (role === "PLAYER") router.push("/dashboard/player");
      else router.push("/");

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for convenience during demos & review
  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.info(`Filled credentials for ${demoEmail}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-athletic-black px-4 py-12 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-athletic-lime/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <Link href="/" className="mb-8 flex items-center gap-3 group">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-athletic-lime text-athletic-black font-black italic shadow-[0_0_20px_rgba(163,255,0,0.4)]">
          <Zap className="h-7 w-7 stroke-[3]" />
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-black italic tracking-tight text-white uppercase group-hover:text-athletic-lime transition-colors">
            ATHLIX
          </span>
          <span className="text-[10px] font-bold tracking-widest text-athletic-textMuted uppercase -mt-1">
            SPORTS OPERATING SYSTEM
          </span>
        </div>
      </Link>

      <Card className="w-full max-w-md border-athletic-border bg-athletic-charcoal relative z-10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-black italic text-white uppercase">
            SIGN IN TO ATHLIX
          </CardTitle>
          <CardDescription className="text-athletic-textMuted">
            Enter your credentials to access your tenant workspace.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="coach@academy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="athletic"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Access Workspace
            </Button>
          </form>

          {/* Quick Fill Demo Roles */}
          <div className="mt-6 pt-6 border-t border-athletic-border/60 space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-athletic-textMuted block">
              Quick-Fill Demo Credentials (Seed Data)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill("owner@apex.com", "ApexOwner2026!")}
                className="p-2 rounded bg-athletic-black border border-athletic-border text-left hover:border-athletic-lime transition-colors"
              >
                <div className="font-bold text-white uppercase">Academy Owner</div>
                <div className="text-[10px] text-athletic-textMuted truncate">owner@apex.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("coach.marcus@apex.com", "CoachMarcus2026!")}
                className="p-2 rounded bg-athletic-black border border-athletic-border text-left hover:border-athletic-lime transition-colors"
              >
                <div className="font-bold text-white uppercase">Head Coach</div>
                <div className="text-[10px] text-athletic-textMuted truncate">coach.marcus@apex.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("scout.elena@apex.com", "ScoutElena2026!")}
                className="p-2 rounded bg-athletic-black border border-athletic-border text-left hover:border-athletic-lime transition-colors"
              >
                <div className="font-bold text-white uppercase">Assigned Scout</div>
                <div className="text-[10px] text-athletic-textMuted truncate">scout.elena@apex.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("player.leo@apex.com", "PlayerLeo2026!")}
                className="p-2 rounded bg-athletic-black border border-athletic-border text-left hover:border-athletic-lime transition-colors"
              >
                <div className="font-bold text-white uppercase">Player Account</div>
                <div className="text-[10px] text-athletic-textMuted truncate">player.leo@apex.com</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-athletic-textMuted">
            New sports academy?{" "}
            <Link
              href="/register-academy"
              className="font-bold text-athletic-lime hover:underline uppercase tracking-wider"
            >
              Register Academy
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
