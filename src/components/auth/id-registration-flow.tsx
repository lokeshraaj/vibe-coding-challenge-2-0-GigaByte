"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  IdCard,
} from "lucide-react";

interface IdRegistrationFlowProps {
  role: "COACH" | "PLAYER";
  title: string;
  subtitle: string;
  idLabel: string;
  idPlaceholder: string;
  idHelperText: string;
  redirectPath: string;
}

type RegistrationStep = "ENTER_ID" | "VERIFY_OTP" | "SET_PASSWORD" | "SUCCESS";

export function IdRegistrationFlow({
  role,
  title,
  subtitle,
  idLabel,
  idPlaceholder,
  idHelperText,
  redirectPath,
}: IdRegistrationFlowProps) {
  const router = useRouter();

  // Multi-step state
  const [step, setStep] = useState<RegistrationStep>("ENTER_ID");
  const [athlixId, setAthlixId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [activationToken, setActivationToken] = useState("");

  // Password fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Loading & Cooldown timers
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 60-second resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Submit ATHLIX ID
  const handleVerifyId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = athlixId.trim().toUpperCase();
    if (!cleanId) {
      toast.error(`Please enter your ${idLabel}`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register/verify-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlixId: cleanId, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify ID");
      }

      setMaskedEmail(data.maskedEmail);
      setAthlixId(cleanId);
      setStep("VERIFY_OTP");
      setResendCooldown(60);
      toast.success(`Verification code dispatched to ${data.maskedEmail}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ID verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code received on your email");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlixId, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      setActivationToken(data.activationToken);
      setStep("SET_PASSWORD");
      toast.success("Email verified! Please configure your secure password.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlixId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      setResendCooldown(60);
      toast.success(`New verification code sent to ${maskedEmail}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set Password & Activate
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activationToken,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Activation failed");
      }

      setStep("SUCCESS");
      toast.success("Account activated successfully! Redirecting...");
      setTimeout(() => {
        router.push(data.redirectUrl || redirectPath);
        router.refresh();
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F3EE] px-4 py-12">
      {/* Brand Header */}
      <Link href="/" className="mb-6 flex flex-col items-center group">
        <img
          src="/images/logo-stacked.png"
          alt="ATHLIX"
          className="h-16 w-auto object-contain group-hover:scale-102 transition-transform"
        />
      </Link>

      <Card className="w-full max-w-md border-[#DCE1E3] bg-white shadow-sm">
        {/* Card Header with Step Progress */}
        <CardHeader className="space-y-1.5 border-b border-[#DCE1E3] pb-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B969E]">
              {step === "ENTER_ID" && "Step 1 of 3: Identity Lookup"}
              {step === "VERIFY_OTP" && "Step 2 of 3: Security Code"}
              {step === "SET_PASSWORD" && "Step 3 of 3: Create Password"}
              {step === "SUCCESS" && "Activation Complete"}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  step === "ENTER_ID" ? "bg-[#101820]" : "bg-[#C6F432]"
                }`}
              />
              <span
                className={`h-2 w-2 rounded-full ${
                  step === "VERIFY_OTP"
                    ? "bg-[#101820]"
                    : step === "SET_PASSWORD" || step === "SUCCESS"
                    ? "bg-[#C6F432]"
                    : "bg-[#DCE1E3]"
                }`}
              />
              <span
                className={`h-2 w-2 rounded-full ${
                  step === "SET_PASSWORD"
                    ? "bg-[#101820]"
                    : step === "SUCCESS"
                    ? "bg-[#C6F432]"
                    : "bg-[#DCE1E3]"
                }`}
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold text-[#101820] tracking-tight">
            {step === "SUCCESS" ? "Account Activated!" : title}
          </CardTitle>
          <CardDescription className="text-sm text-[#8B969E]">
            {step === "SUCCESS" ? "Your profile is fully operational." : subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* STEP 1: ENTER ID */}
          {step === "ENTER_ID" && (
            <form onSubmit={handleVerifyId} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="athlixId"
                  className="text-xs font-bold uppercase tracking-wider text-[#101820] flex items-center gap-1.5"
                >
                  <IdCard className="h-4 w-4" />
                  <span>{idLabel} *</span>
                </label>
                <Input
                  id="athlixId"
                  type="text"
                  placeholder={idPlaceholder}
                  value={athlixId}
                  onChange={(e) => setAthlixId(e.target.value.toUpperCase())}
                  className="font-mono text-base font-bold uppercase tracking-wider"
                  required
                  autoFocus
                />
                <p className="text-[12px] text-[#8B969E]">{idHelperText}</p>
              </div>

              <Button
                type="submit"
                variant="athletic"
                size="lg"
                className="w-full font-bold gap-2 shadow-sm"
                isLoading={isLoading}
              >
                <span>Lookup & Send Verification Code</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="pt-4 border-t border-[#DCE1E3] text-center text-xs text-[#8B969E]">
                Already activated your account?{" "}
                <Link href="/login" className="font-bold text-[#101820] hover:underline uppercase">
                  Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === "VERIFY_OTP" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] p-3.5 text-xs text-[#202A32] space-y-1">
                <div className="font-bold text-[#101820] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#101820]" />
                  <span>ATHLIX Security Challenge</span>
                </div>
                <div>
                  A 6-digit one-time passcode was sent to:{" "}
                  <strong className="text-[#101820] font-mono">{maskedEmail}</strong>
                </div>
                <div className="text-[11px] text-[#8B969E] flex items-center gap-1 pt-1">
                  <Clock className="h-3 w-3" />
                  <span>Valid for 5 minutes</span>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="otp"
                  className="text-xs font-bold uppercase tracking-wider text-[#101820]"
                >
                  Enter 6-Digit Passcode *
                </label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-2xl font-black text-center tracking-[0.5em]"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                variant="athletic"
                size="lg"
                className="w-full font-bold shadow-sm"
                isLoading={isLoading}
                disabled={otp.length !== 6}
              >
                Verify Code & Continue
              </Button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setStep("ENTER_ID")}
                  className="text-[#8B969E] hover:text-[#101820] font-semibold"
                >
                  Change ID
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className={`flex items-center gap-1 font-bold ${
                    resendCooldown > 0
                      ? "text-[#8B969E] cursor-not-allowed"
                      : "text-[#101820] hover:underline"
                  }`}
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SET PASSWORD */}
          {step === "SET_PASSWORD" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] p-3 text-xs text-[#202A32] flex items-center gap-2">
                <KeyRound className="h-4 w-4 shrink-0 text-[#101820]" />
                <span>
                  Configure a password for your account associated with <strong>{athlixId}</strong>.
                </span>
              </div>

              <div className="space-y-1.5 relative">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-[#101820]"
                >
                  Create Password *
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B969E] hover:text-[#101820]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-bold uppercase tracking-wider text-[#101820]"
                >
                  Confirm Password *
                </label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {/* Password checklist */}
              <div className="p-3 rounded-lg border border-[#DCE1E3] bg-[#FAF9F5] text-[11px] space-y-1">
                <div className="font-bold text-[#101820]">Password requirements:</div>
                <div className={password.length >= 8 ? "text-emerald-600 font-semibold" : "text-[#8B969E]"}>
                  • Minimum 8 characters
                </div>
                <div className={/[A-Z]/.test(password) ? "text-emerald-600 font-semibold" : "text-[#8B969E]"}>
                  • At least one uppercase letter (A-Z)
                </div>
                <div className={/[a-z]/.test(password) ? "text-emerald-600 font-semibold" : "text-[#8B969E]"}>
                  • At least one lowercase letter (a-z)
                </div>
                <div className={/[0-9]/.test(password) ? "text-emerald-600 font-semibold" : "text-[#8B969E]"}>
                  • At least one number (0-9)
                </div>
              </div>

              <Button
                type="submit"
                variant="athletic"
                size="lg"
                className="w-full font-bold shadow-sm"
                isLoading={isLoading}
              >
                Activate Account & Sign In
              </Button>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "SUCCESS" && (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F432] text-[#101820]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold uppercase text-[#101820]">
                  Welcome to ATHLIX
                </h3>
                <p className="text-xs text-[#8B969E]">
                  Your credentials have been authenticated. Redirecting to your dashboard...
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#DCE1E3] border-t-[#101820]" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
