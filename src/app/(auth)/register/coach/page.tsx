import { Metadata } from "next";
import { IdRegistrationFlow } from "@/components/auth/id-registration-flow";

export const metadata: Metadata = {
  title: "Coach Registration & Activation | ATHLIX",
  description: "Activate your ATHLIX coach account using your Academy Code and assigned Coach ID.",
};

export default function CoachRegistrationPage() {
  return (
    <IdRegistrationFlow
      role="COACH"
      title="Coach Registration"
      subtitle="Activate your account using your Academy Code and official Coach ID."
      idLabel="Assigned Coach ID"
      idPlaceholder="e.g. COFO001"
      idHelperText="Enter the Coach ID (e.g. COFO001) assigned by your academy administrator."
      redirectPath="/coach"
    />
  );
}
