"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2,
  IdCard,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  KeyRound,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";

type Step = "IDENTIFIER" | "OTP" | "RESET" | "SUCCESS";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("IDENTIFIER");
  const [academyCode, setAcademyCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Submit Identifier
  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your ATHLIX ID or registered email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academyCode: academyCode.trim().toUpperCase() || undefined,
          identifier: identifier.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate password reset.");
      }

      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedEmail || "your registered email");
      setResendCooldown(60);
      setStep("OTP");
      toast.success(data.message || "Verification code sent to your email.");
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academyCode: academyCode.trim().toUpperCase() || undefined,
          identifier: identifier.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code.");

      setChallengeId(data.challengeId);
      setResendCooldown(60);
      toast.success("A fresh verification code has been dispatched.");
    } catch (err: any) {
      toast.error(err.message || "Could not resend verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          otp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed. Invalid or expired code.");
      }

      setResetToken(data.resetToken);
      setStep("RESET");
      toast.success("Verification successful! Set your new password.");
    } catch (err: any) {
      toast.error(err.message || "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Reset
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error("Password must contain uppercase, lowercase, and numeric characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          password: newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setStep("SUCCESS");
      toast.success("Password reset successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black tracking-widest text-foreground">
              ATHL<span className="text-primary">I</span>X
            </span>
          </Link>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Account Security & Recovery
          </p>
        </div>

        <Card className="border-border shadow-xl">
          {/* STEP 1: IDENTIFIER */}
          {step === "IDENTIFIER" && (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-bold">Reset Password</CardTitle>
                <CardDescription>
                  Enter your Academy Code and ATHLIX ID or registered email to receive a recovery code.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleInitiate}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Academy Code
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="e.g. BI0001 "
                        value={academyCode}
                        onChange={(e) => setAcademyCode(e.target.value.toUpperCase())}
                        className="pl-9 font-mono uppercase tracking-wider"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Required for Coaches, Players & Scouts. 
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      ATHLIX ID or Registered Email <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="COCR001, PLCR001 or email@domain.com"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Checking Account..." : "Send Verification Code"}
                  </Button>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to Sign In
                  </Link>
                </CardFooter>
              </form>
            </>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === "OTP" && (
            <>
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Enter Verification Code</CardTitle>
                    <CardDescription>
                      We sent a 6-digit code to <strong className="text-foreground">{maskedEmail}</strong>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <form onSubmit={handleVerifyOtp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      6-Digit Recovery Passcode
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="pl-9 font-mono text-center tracking-[0.4em] text-lg font-bold"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Code expires in 5 minutes
                      </span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || isLoading}
                        className="text-primary hover:underline font-medium disabled:text-muted-foreground disabled:no-underline"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                      </button>
                    </div>

                    {/* Spam/Junk Folder Reminder */}
                    <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="leading-snug">
                        Didn&apos;t receive the verification code? Please check your Spam/Junk folder before requesting a new code.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep("IDENTIFIER")}
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" /> Change ID or Email
                  </button>
                </CardFooter>
              </form>
            </>
          )}

          {/* STEP 3: RESET PASSWORD */}
          {step === "RESET" && (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-bold">Set New Password</CardTitle>
                <CardDescription>
                  Create a strong new password for your ATHLIX account.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCompleteReset}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 text-muted-foreground border border-border">
                    <p className="font-semibold text-foreground">Password Requirements:</p>
                    <p className={newPassword.length >= 8 ? "text-primary" : ""}>• At least 8 characters</p>
                    <p className={/[A-Z]/.test(newPassword) ? "text-primary" : ""}>• At least 1 uppercase letter</p>
                    <p className={/[a-z]/.test(newPassword) ? "text-primary" : ""}>• At least 1 lowercase letter</p>
                    <p className={/[0-9]/.test(newPassword) ? "text-primary" : ""}>• At least 1 number</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Updating Password..." : "Update Password & Continue"}
                  </Button>
                </CardFooter>
              </form>
            </>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "SUCCESS" && (
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Password Reset Complete</h3>
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully updated. You can now log in using your Academy Code, Individual ID, and new password.
                </p>
              </div>
              <Button
                onClick={() => router.push("/login")}
                className="w-full mt-4"
              >
                Sign In Now
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
