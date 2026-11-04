import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInYears, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined, formatString: string = "dd MMM yyyy"): string {
  if (!date) return "N/A";
  const parsed = typeof date === "string" ? parseISO(date) : date;
  if (isNaN(parsed.getTime())) return "Invalid date";
  return format(parsed, formatString);
}

export function calculateAge(dateOfBirth: string | Date): number {
  const parsed = typeof dateOfBirth === "string" ? parseISO(dateOfBirth) : dateOfBirth;
  if (isNaN(parsed.getTime())) return 0;
  return differenceInYears(new Date(), parsed);
}

export function formatPercentage(val: number): string {
  return `${Number(val.toFixed(1))}%`;
}

export function generatePlayerCode(sport: string = "ATH"): string {
  const year = new Date().getFullYear();
  const prefix = (sport.slice(0, 3).toUpperCase() || "ATH");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randomSuffix}`;
}

export function getSportScoreLabel(sport: string): string {
  const s = sport.trim().toLowerCase();
  switch (s) {
    case "football":
    case "soccer":
    case "hockey":
      return "Goals";
    case "cricket":
      return "Runs";
    case "basketball":
      return "Points";
    case "rugby":
      return "Tries";
    case "badminton":
    case "tennis":
    case "table tennis":
      return "Points / Sets";
    case "swimming":
    case "athletics":
    case "track":
      return "Seconds";
    default:
      return "Score";
  }
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}
