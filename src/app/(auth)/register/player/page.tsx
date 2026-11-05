import { Metadata } from "next";
import { IdRegistrationFlow } from "@/components/auth/id-registration-flow";

export const metadata: Metadata = {
  title: "Athlete Registration & Activation | ATHLIX",
  description: "Activate your ATHLIX athlete account using your assigned Player ID.",
};

export default function PlayerRegistrationPage() {
  return (
    <IdRegistrationFlow
      role="PLAYER"
      title="Athlete Registration"
      subtitle="Activate your profile using your official Player ID."
      idLabel="Assigned Player ID"
      idPlaceholder="e.g. DPLFO001"
      idHelperText="Enter the 8-character Player ID provided by your coach."
      redirectPath="/player"
    />
  );
}
