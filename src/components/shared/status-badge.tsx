import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock, Award } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  type?: "eligibility" | "attendance" | "session" | "match" | "general";
}

export function StatusBadge({ status, type = "general" }: StatusBadgeProps) {
  const s = status.toUpperCase();

  if (type === "eligibility" || s === "READY" || s === "NOT_READY") {
    if (s === "READY") {
      return (
        <Badge variant="neon" className="flex items-center gap-1.5 py-1 px-3">
          <Award className="h-3.5 w-3.5 text-[#101820]" />
          <span>TRIAL READY</span>
        </Badge>
      );
    }
    return (
      <Badge variant="warning" className="flex items-center gap-1.5 py-1 px-3">
        <Clock className="h-3.5 w-3.5" />
        <span>DEVELOPING</span>
      </Badge>
    );
  }

  if (type === "attendance" || s === "PRESENT" || s === "ABSENT") {
    if (s === "PRESENT") {
      return (
        <Badge variant="success" className="flex items-center gap-1 py-0.5 px-2.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>PRESENT</span>
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1 py-0.5 px-2.5">
        <XCircle className="h-3 w-3 text-rose-600" />
        <span>ABSENT</span>
      </Badge>
    );
  }

  if (type === "session" || s === "OPEN" || s === "CLOSED") {
    if (s === "OPEN") {
      return (
        <Badge variant="neon" className="py-0.5 px-2.5">
          OPEN
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="py-0.5 px-2.5">
        CLOSED & LOCKED
      </Badge>
    );
  }

  if (type === "match" || s === "WON" || s === "LOST" || s === "DRAW") {
    if (s === "WON") {
      return (
        <Badge variant="success" className="py-0.5 px-2.5">
          VICTORY
        </Badge>
      );
    }
    if (s === "LOST") {
      return (
        <Badge variant="destructive" className="py-0.5 px-2.5">
          DEFEAT
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="py-0.5 px-2.5">
        DRAW
      </Badge>
    );
  }

  return <Badge variant="outline">{status}</Badge>;
}
