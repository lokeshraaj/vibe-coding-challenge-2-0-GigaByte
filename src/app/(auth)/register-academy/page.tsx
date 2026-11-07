"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight, ShieldCheck, RefreshCw, KeyRound, CheckCircle2, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { validateAndNormalizePhone } from "@/lib/validation/phone";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Step = "FORM" | "OTP" | "SUCCESS";

export default function RegisterAcademyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("FORM");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    academyName: "",
    description: "",
    city: "",
    state: "",
    country: "India",
    address: "",
    contactEmail: "",
    contactPhone: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
  });
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  // OTP Verification state
  const [challengeId, setChallengeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Success state
  const [createdAcademy, setCreatedAcademy] = useState<{
    name: string;
    academyCode: string;
    state: string;
  } | null>(null);

  // 60-second cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Submit Form to initiate OTP verification
  const handleInitiateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mandatory client-side validation for phone number
    const phoneValidation = validateAndNormalizePhone(formData.contactPhone);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Please provide a valid contact phone number.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register-academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contactPhone: phoneValidation.e164 || formData.contactPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Academy registration failed");
      }

      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedEmail || formData.ownerEmail);
      setResendCooldown(60);
      setStep("OTP");
      toast.success(data.message || "Verification passcode sent to your email!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and finalize academy creation
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register-academy/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      const assignedCode = data.data?.academy?.academyCode || "PENDING";
      setCreatedAcademy({
        name: data.data?.academy?.name || formData.academyName,
        academyCode: assignedCode,
        state: formData.state,
      });

      setStep("SUCCESS");
      toast.success("Academy registered successfully! Your Academy Code has been generated.", {
        duration: 7000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register-academy/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      setResendCooldown(60);
      toast.success("A fresh verification passcode has been dispatched to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (!createdAcademy?.academyCode) return;
    navigator.clipboard.writeText(createdAcademy.academyCode);
    toast.success("Academy Code copied to clipboard!");
  };

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

      <Card className="w-full max-w-2xl border-[#DCE1E3] bg-white shadow-sm">
        {/* Step 1: Form View */}
        {step === "FORM" && (
          <>
            <CardHeader className="space-y-1.5 border-b border-[#DCE1E3] pb-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#101820]">
                <Building2 className="h-4 w-4" />
                <span>NEW TENANT REGISTRATION</span>
              </div>
              <CardTitle className="text-2xl font-extrabold text-[#101820] tracking-tight">
                Register Your Sports Academy
              </CardTitle>
              <CardDescription className="text-sm text-[#8B969E]">
                Create an independent multi-tenant academy environment with isolated coach rosters and scouting.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleInitiateSubmit} className="space-y-6">
                {/* Section 1: Academy Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#101820] flex items-center gap-2">
                    <span>1. Academy Details</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Academy Name *"
                      name="academyName"
                      placeholder="e.g. Apex Football Academy"
                      value={formData.academyName}
                      onChange={handleChange}
                      required
                    />

                    <PhoneInput
                      label="Contact Phone *"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                      }
                      onValidationChange={(isValid, e164) => {
                        setIsPhoneValid(isValid);
                        if (e164) {
                          setFormData((prev) => ({ ...prev, contactPhone: e164 }));
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="City *"
                      name="city"
                      placeholder="e.g. Ranchi"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />

                    <div className="space-y-1">
                      <Input
                        label="State / Province *"
                        name="state"
                        placeholder="e.g. Jharkhand / Bihar"
                        value={formData.state}
                        onChange={handleChange}
                        required
                      />
                      <p className="text-[10px] text-[#8B969E]">
                        Generates your state prefix for your Academy Code (e.g. JH0001, BI0001).
                      </p>
                    </div>

                    <Input
                      label="Country *"
                      name="country"
                      placeholder="India"
                      value={formData.country}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <Input
                    label="Official Contact Email *"
                    type="email"
                    name="contactEmail"
                    placeholder="contact@academy.com"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Section 2: Owner Account */}
                <div className="space-y-4 pt-4 border-t border-[#DCE1E3]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#101820] flex items-center gap-2">
                    <span>2. Academy Owner Account</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Owner Full Name *"
                      name="ownerName"
                      placeholder="e.g. David Sterling"
                      value={formData.ownerName}
                      onChange={handleChange}
                      required
                    />

                    <Input
                      label="Owner Login Email *"
                      type="email"
                      name="ownerEmail"
                      placeholder="owner@academy.com"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <Input
                    label="Secure Password (Min 8 chars, 1 uppercase, 1 lowercase, 1 number) *"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="athletic"
                  size="lg"
                  className="w-full text-sm font-bold gap-2 shadow-sm"
                  isLoading={isLoading}
                  disabled={isLoading || !isPhoneValid}
                >
                  <span>Continue to Email Verification</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 text-center text-xs text-[#8B969E]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-[#101820] hover:underline uppercase tracking-wider"
                >
                  Sign In
                </Link>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {step === "OTP" && (
          <>
            <CardHeader className="space-y-1.5 border-b border-[#DCE1E3] pb-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#101820]">
                <ShieldCheck className="h-4 w-4" />
                <span>MANDATORY EMAIL VERIFICATION</span>
              </div>
              <CardTitle className="text-2xl font-extrabold text-[#101820] tracking-tight">
                Enter Verification Passcode
              </CardTitle>
              <CardDescription className="text-sm text-[#8B969E]">
                We sent a 6-digit confirmation code to <strong className="text-[#101820]">{maskedEmail}</strong>.
                Verify your email to finalize academy registration and receive your official Academy Code.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="otp" className="text-xs font-bold uppercase tracking-wider text-[#101820]">
                    6-Digit Verification Code *
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="font-mono text-center text-2xl tracking-[8px] font-bold"
                    required
                    autoFocus
                  />
                  <div className="flex items-center justify-between text-xs text-[#8B969E] pt-1">
                    <span>Code expires in 5 minutes</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isLoading}
                      className="font-bold text-[#101820] hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}</span>
                    </button>
                  </div>

                  {/* Spam/Junk Folder Reminder */}
                  <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-start gap-2 mt-2">
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      Didn&apos;t receive the verification code? Please check your Spam/Junk folder before requesting a new code.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("FORM")}
                    className="w-1/3 text-xs border-[#DCE1E3]"
                  >
                    Back to Details
                  </Button>
                  <Button
                    type="submit"
                    variant="athletic"
                    size="lg"
                    className="w-2/3 text-sm font-bold gap-2 shadow-sm"
                    isLoading={isLoading}
                  >
                    <span>Verify & Provision</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* Step 3: Success Screen */}
        {step === "SUCCESS" && createdAcademy && (
          <>
            <CardHeader className="space-y-1.5 border-b border-[#DCE1E3] pb-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C6F432] text-[#101820] mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-[#101820] tracking-tight">
                Academy Registration Complete!
              </CardTitle>
              <CardDescription className="text-sm text-[#8B969E]">
                Your sports academy tenant has been verified and permanently registered on ATHLIX.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Highlighted Academy Code Box */}
              <div className="rounded-xl border-2 border-dashed border-[#101820] bg-[#FAF9F5] p-6 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8B969E] mb-1">
                  Your Official Permanent Academy Code
                </div>
                <div className="text-4xl font-extrabold tracking-widest text-[#101820] font-mono my-2">
                  {createdAcademy.academyCode}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyCodeToClipboard}
                  className="mt-2 text-xs gap-1.5 border-[#DCE1E3] bg-white hover:bg-[#F4F3EE]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Academy Code</span>
                </Button>
              </div>

              {/* Instructions Summary */}
              <div className="rounded-xl border border-[#DCE1E3] bg-white p-4 space-y-2 text-xs text-[#101820]">
                <div className="font-bold uppercase tracking-wider text-[#101820]">
                  Important Onboarding Next Steps:
                </div>
                <ul className="list-disc pl-5 space-y-1.5 text-[#8B969E]">
                  <li>
                    Share this Academy Code (<strong>{createdAcademy.academyCode}</strong>) with your coaches and players.
                  </li>
                  <li>
                    When inviting coaches or scouts from your dashboard, they will use this Academy Code alongside their individual ID to sign in.
                  </li>
                  <li>
                    A confirmation welcome email has been sent to your administrator email address.
                  </li>
                </ul>
              </div>

              <Button
                type="button"
                variant="athletic"
                size="lg"
                onClick={() => {
                  router.push("/owner");
                  router.refresh();
                }}
                className="w-full text-sm font-bold gap-2 shadow-sm"
              >
                <span>Enter Academy Owner Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
