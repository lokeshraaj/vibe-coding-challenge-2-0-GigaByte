import { Metadata } from "next";
import { IdRegistrationFlow } from "@/components/auth/id-registration-flow";

export const metadata: Metadata = {
  title: "Scout Registration & Activation | ATHLIX",
  description: "Activate your ATHLIX talent scout account using your Academy Code and assigned Scout ID.",
};

export default function ScoutRegistrationPage() {
  return (
    <IdRegistrationFlow
      role="SCOUT"
      title="Talent Scout Registration"
      subtitle="Activate your account using your Academy Code and official Scout ID."
      idLabel="Assigned Scout ID"
      idPlaceholder="e.g. SCFO001"
      idHelperText="Enter the Scout ID (e.g. SCFO001) assigned by your academy administrator."
      redirectPath="/scout"
    />
  );
}
