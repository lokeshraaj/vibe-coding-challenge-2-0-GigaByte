import { Metadata } from "next";
import { IdRegistrationFlow } from "@/components/auth/id-registration-flow";

export const metadata: Metadata = {
  title: "Athlete Registration & Activation | ATHLIX",
  description: "Activate your ATHLIX athlete account using your Academy Code and assigned Player ID.",
};

export default function PlayerRegistrationPage() {
  return (
    <IdRegistrationFlow
      role="PLAYER"
      title="Athlete Registration"
      subtitle="Activate your profile using your Academy Code and official Player ID."
      idLabel="Assigned Player ID"
      idPlaceholder="e.g. PLFO001"
      idHelperText="Enter the Player ID (e.g. PLFO001) provided by your coach."
      redirectPath="/player"
    />
  );
}
