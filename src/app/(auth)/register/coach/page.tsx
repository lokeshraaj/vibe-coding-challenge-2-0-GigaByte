import { Metadata } from "next";
import { IdRegistrationFlow } from "@/components/auth/id-registration-flow";

export const metadata: Metadata = {
  title: "Coach Registration & Activation | ATHLIX",
  description: "Activate your ATHLIX coach account using your assigned Coach ID.",
};

export default function CoachRegistrationPage() {
  return (
    <IdRegistrationFlow
      role="COACH"
      title="Coach Registration"
      subtitle="Activate your account using your official Coach ID."
      idLabel="Assigned Coach ID"
      idPlaceholder="e.g. DCOFO001"
      idHelperText="Enter the 8-character Coach ID assigned by your academy administrator."
      redirectPath="/coach"
    />
  );
}
