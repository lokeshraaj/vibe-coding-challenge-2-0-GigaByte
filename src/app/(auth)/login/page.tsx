"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FootballLoading } from "@/components/shared/football-loading";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already authenticated on mount
  useEffect(() => {
    async function checkExistingAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            const role = data.user.role;
            if (role === "PLATFORM_ADMIN") router.push("/admin");
            else if (role === "ACADEMY_OWNER") router.push("/owner");
            else if (role === "COACH") router.push("/coach");
            else if (role === "SCOUT") router.push("/scout");
            else if (role === "PLAYER") router.push(data.user.academyId ? "/player" : "/register-academy");
            else router.push("/");
            return;
          }
        }
      } catch (err) {
        // Not authenticated, stay on page
      } finally {
        setCheckingSession(false);
      }
    }

    // Check for auth errors in search params (e.g. from OAuth callbacks)
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "OAuthSignin" || errorParam === "OAuthCallback") {
        toast.error("Google authentication failed. Please verify OAuth credentials.");
      } else if (errorParam === "AccessDenied") {
        toast.error("Access denied. Your account may be deactivated.");
      } else {
        toast.error(`Authentication error: ${errorParam}`);
      }
    }

    checkExistingAuth();
  }, [router, searchParams]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Trigger NextAuth Google OAuth
      await signIn("google", { callbackUrl: "/login" });
    } catch (err) {
      toast.error("Google Sign-In could not be initiated.");
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
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
      if (role === "PLATFORM_ADMIN") router.push("/admin");
      else if (role === "ACADEMY_OWNER") router.push("/owner");
      else if (role === "COACH") router.push("/coach");
      else if (role === "SCOUT") router.push("/scout");
      else if (role === "PLAYER") router.push("/player");
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

  if (checkingSession) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F4F3EE]">
        <FootballLoading size="md" text="CHECKING SESSION..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F3EE] px-4 py-12">
      {/* Brand Header */}
      <Link href="/" className="mb-8 flex items-center gap-3 group">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C6F432] text-[#101820] shadow-sm">
          <Zap className="h-6 w-6 fill-[#101820]" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black italic tracking-tight text-[#101820] uppercase">
            ATHLIX
          </span>
          <span className="text-[10px] font-bold tracking-widest text-[#8B969E] uppercase -mt-1">
            SPORTS OPERATING SYSTEM
          </span>
        </div>
      </Link>

      <Card className="w-full max-w-md border-[#DCE1E3] bg-white shadow-sm">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="text-2xl font-extrabold text-[#101820] tracking-tight">
            Welcome to ATHLIX
          </CardTitle>
          <CardDescription className="text-sm text-[#8B969E]">
            Sign in to manage your athletic journey.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Continue with Google Button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center py-2.5 border-[#DCE1E3] bg-white text-[#101820] font-semibold hover:bg-[#F4F3EE] shadow-sm transition-all"
          >
            {isGoogleLoading ? (
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B969E]">
                Connecting to Google...
              </span>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-[#DCE1E3]" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-[#8B969E]">
              Or continue with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              className="w-full mt-2 font-bold shadow-sm"
              isLoading={isLoading}
            >
              Sign In to Athlix
            </Button>
          </form>

          {/* Quick Fill Demo Roles */}
          <div className="pt-4 border-t border-[#DCE1E3] space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B969E] block">
              Quick-Fill Demo Credentials (Seed Data)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill("owner@apex.com", "ApexOwner2026!")}
                className="p-2.5 rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-left hover:border-[#101820] transition-colors"
              >
                <div className="font-bold text-[#101820]">Academy Owner</div>
                <div className="text-[10px] text-[#8B969E] truncate">owner@apex.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("coach.marcus@apex.com", "CoachMarcus2026!")}
                className="p-2.5 rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-left hover:border-[#101820] transition-colors"
              >
                <div className="font-bold text-[#101820]">Head Coach</div>
                <div className="text-[10px] text-[#8B969E] truncate">coach.marcus@apex.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("scout.elena@apex.com", "ScoutElena2026!")}
                className="p-2.5 rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-left hover:border-[#101820] transition-colors"
              >
                <div className="font-bold text-[#101820]">Assigned Scout</div>
                <div className="text-[10px] text-[#8B969E] truncate">scout.elena@apex.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill("player.leo@apex.com", "PlayerLeo2026!")}
                className="p-2.5 rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-left hover:border-[#101820] transition-colors"
              >
                <div className="font-bold text-[#101820]">Player Account</div>
                <div className="text-[10px] text-[#8B969E] truncate">player.leo@apex.com</div>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-[#8B969E] pt-2">
            New sports academy?{" "}
            <Link
              href="/register-academy"
              className="font-bold text-[#101820] hover:underline uppercase tracking-wider"
            >
              Register Academy
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F4F3EE]">
          <FootballLoading size="md" text="INITIALIZING ATHLIX..." />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
