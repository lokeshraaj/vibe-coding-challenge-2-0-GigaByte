"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { Building2, IdCard, Lock, Eye, EyeOff, UserPlus } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [academyCode, setAcademyCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already authenticated on mount
  useEffect(() => {
    async function checkExistingAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status >= 500
            ? "Server error (500). Please check server logs."
            : `Authentication error (${res.status}): ${text.slice(0, 100)}`
        );
      }
          if (data?.user) {
            const role = data.user.role;
            if (role === "PLATFORM_ADMIN" || role === "SUPER_ADMIN") router.push("/admin");
            else if (role === "ACADEMY_OWNER") router.push("/owner");
            else if (role === "COACH") router.push("/coach");
            else if (role === "SCOUT") router.push("/scout");
            else if (role === "PLAYER") router.push(data.user.academyId ? "/player" : "/register-academy");
            else router.push("/");
            return;
          }
        }
      } catch {
        // Not authenticated, stay on login page
      } finally {
        setCheckingSession(false);
      }
    }

    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "OAuthSignin" || errorParam === "OAuthCallback") {
        toast.error("Google authentication failed. Please verify OAuth credentials.");
      } else if (errorParam === "AccessDenied") {
        toast.error("Access denied. Only registered, activated accounts can use Google Sign-In. Pending accounts must register with their assigned ID first.");
      } else {
        toast.error(`Authentication error: ${errorParam}`);
      }
    }

    checkExistingAuth();
  }, [router, searchParams]);

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isLoading) return;
    setIsGoogleLoading(true);

    try {
      if (!auth || !googleProvider) {
        throw new Error("Firebase Authentication is not configured.");
      }

      const userCredential = await signInWithPopup(auth, googleProvider);
      const idToken = await userCredential.user.getIdToken(true);

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status === 500
            ? "Server error (500). Please check Firebase Admin configuration on the server."
            : `Authentication error (${res.status}): ${text.slice(0, 100)}`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Google authentication failed");
      }

      toast.success(`Welcome back, ${data.data.user.name}!`);

      // Role-based dashboard redirect
      const role = data.data.user.role;
      if (role === "PLATFORM_ADMIN" || role === "SUPER_ADMIN") router.push("/admin");
      else if (role === "ACADEMY_OWNER") router.push("/owner");
      else if (role === "COACH") router.push("/coach");
      else if (role === "SCOUT") router.push("/scout");
      else if (role === "PLAYER") router.push("/player");
      else router.push("/");

      router.refresh();
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }
      toast.error(err instanceof Error ? err.message : "Google Sign-In failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    const cleanCode = academyCode.trim().toUpperCase();

    if (!cleanId || !password) {
      toast.error("Please enter your Individual ID and password");
      return;
    }

    // Academy Code required for all Coach, Player and Scout individual ID logins
    if (!cleanId.includes("@") && !cleanCode) {
      toast.error("Academy Code is required for Coach, Player and Scout ID sign-in");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academyCode: cleanCode || undefined,
          email: cleanId,
          password,
        }),
      });

      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status >= 500
            ? "Server error (500). Please check server logs."
            : `Authentication error (${res.status}): ${text.slice(0, 100)}`
        );
      }
      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      toast.success(`Welcome back, ${data.data.user.name}!`);

      // Role-based dashboard redirect
      const role = data.data.user.role;
      if (role === "PLATFORM_ADMIN" || role === "SUPER_ADMIN") router.push("/admin");
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

  if (checkingSession) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F4F3EE]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#DCE1E3] border-t-[#101820]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F3EE] px-4 py-12">
      {/* Official Brand Header */}
      <Link href="/" className="mb-6 flex flex-col items-center group">
        <img
          src="/images/logo-stacked.png"
          alt="ATHLIX"
          className="h-16 w-auto object-contain group-hover:scale-102 transition-transform"
        />
      </Link>

      <Card className="w-full max-w-md border-[#DCE1E3] bg-white shadow-sm">
        <CardHeader className="space-y-1.5 border-b border-[#DCE1E3] pb-5">
          <CardTitle className="text-2xl font-extrabold text-[#101820] tracking-tight">
            Sign In to ATHLIX
          </CardTitle>
          <CardDescription className="text-sm text-[#8B969E]">
            Enter your Academy Code, Individual ID, and password to access your dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-5">
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-xs font-semibold border-[#DCE1E3] bg-white text-[#101820] hover:bg-[#101820] transition-colors gap-3"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#101820] border-t-transparent" />
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
              Or sign in with ID
            </span>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: Academy Code */}
            <div className="space-y-1">
              <label
                htmlFor="academyCode"
                className="text-xs font-bold uppercase tracking-wider text-[#101820] flex items-center gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Academy Code</span>
              </label>
              <Input
                id="academyCode"
                type="text"
                placeholder="e.g. JH0001 or BI0001"
                value={academyCode}
                onChange={(e) => setAcademyCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
              <p className="text-[11px] text-[#8B969E]">
                  Academy code received on Email. Check Spam Email
              </p>
            </div>

            {/* Field 2: Individual ID or Email */}
            <div className="space-y-1">
              <label
                htmlFor="identifier"
                className="text-xs font-bold uppercase tracking-wider text-[#101820] flex items-center gap-1.5"
              >
                <IdCard className="h-3.5 w-3.5" />
                <span>Coach ID / Player ID / Scout ID</span>
              </label>
              <Input
                id="identifier"
                type="text"
                placeholder="e.g. COFO001, PLFO001, SCFO001, or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            {/* Field 3: Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-[#101820] flex items-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Password</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#8B969E] hover:text-[#101820] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B969E] hover:text-[#101820] focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

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

          {/* Unified Registration Entry Point */}
          <div className="pt-4 border-t border-[#DCE1E3] space-y-3">
            <div className="text-center">
              <span className="text-[11px] font-semibold text-[#8B969E] block mb-2">
                Need to activate your profile or join an academy?
              </span>
              <Link href="/register" className="w-full block">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-full text-xs font-bold gap-2 border-[#DCE1E3] bg-[#FAF9F5] text-[#101820] hover:bg-[#101820] hover:border-[#101820]"
                >
                  <UserPlus className="h-4 w-4 text-[#101820]" />
                  <span>Activate ID (Coach, Player or Scout)</span>
                </Button>
              </Link>
            </div>

            <div className="text-center text-xs text-[#8B969E] pt-1">
              Want to register a new sports academy?{" "}
              <Link
                href="/register-academy"
                className="font-bold text-[#101820] hover:underline uppercase tracking-wider"
              >
                Register Academy
              </Link>
            </div>
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#DCE1E3] border-t-[#101820]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
