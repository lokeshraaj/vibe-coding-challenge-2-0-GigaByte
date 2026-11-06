"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function RegisterAcademyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    academyName: "",
    description: "",
    city: "",
    state: "",
    country: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register-academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Academy registration failed");
      }

      const assignedCode = data.data?.academy?.academyCode;
      const codeMsg = assignedCode
        ? ` Your permanent Academy Code is ${assignedCode}.`
        : "";

      toast.success(`Academy registered successfully!${codeMsg} Welcome to Athlix.`, {
        duration: 7000,
      });

      router.push("/owner");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
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
          <form onSubmit={handleSubmit} className="space-y-6">
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

                <Input
                  label="Contact Phone *"
                  name="contactPhone"
                  placeholder="+1 555-0199"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="City *"
                  name="city"
                  placeholder="e.g. Patna / Ranchi"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />

                <div className="space-y-1">
                  <Input
                    label="State / Province *"
                    name="state"
                    placeholder="e.g. Bihar / Jharkhand"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-[10px] text-[#8B969E]">
                    Determines your 2-letter state prefix for your Academy Code (e.g. BI0001, JH0001).
                  </p>
                </div>

                <Input
                  label="Country *"
                  name="country"
                  placeholder="e.g. India"
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
            >
              <span>Provision Academy Tenant</span>
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
      </Card>
    </div>
  );
}
