import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  getCountries,
} from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  e164?: string;
  country?: CountryCode;
  nationalNumber?: string;
  callingCode?: string;
}

export interface CountryOption {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
}

// Curated list of popular sports nations + international countries
export const POPULAR_COUNTRIES: CountryOption[] = [
  { code: "IN", name: "India", callingCode: "+91", flag: "🇮🇳" },
  { code: "US", name: "United States", callingCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", callingCode: "+44", flag: "🇬🇧" },
  { code: "AE", name: "United Arab Emirates", callingCode: "+971", flag: "🇦🇪" },
  { code: "AU", name: "Australia", callingCode: "+61", flag: "🇦🇺" },
  { code: "CA", name: "Canada", callingCode: "+1", flag: "🇨🇦" },
  { code: "SG", name: "Singapore", callingCode: "+65", flag: "🇸🇬" },
  { code: "DE", name: "Germany", callingCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", callingCode: "+33", flag: "🇫🇷" },
  { code: "ES", name: "Spain", callingCode: "+34", flag: "🇪🇸" },
  { code: "BR", name: "Brazil", callingCode: "+55", flag: "🇧🇷" },
  { code: "ZA", name: "South Africa", callingCode: "+27", flag: "🇿🇦" },
  { code: "JP", name: "Japan", callingCode: "+81", flag: "🇯🇵" },
  { code: "NZ", name: "New Zealand", callingCode: "+64", flag: "🇳🇿" },
  { code: "NL", name: "Netherlands", callingCode: "+31", flag: "🇳🇱" },
  { code: "IT", name: "Italy", callingCode: "+39", flag: "🇮🇹" },
  { code: "QA", name: "Qatar", callingCode: "+974", flag: "🇶🇦" },
  { code: "SA", name: "Saudi Arabia", callingCode: "+966", flag: "🇸🇦" },
  { code: "BD", name: "Bangladesh", callingCode: "+880", flag: "🇧🇩" },
  { code: "NP", name: "Nepal", callingCode: "+977", flag: "🇳🇵" },
  { code: "LK", name: "Sri Lanka", callingCode: "+94", flag: "🇱🇰" },
];

/**
 * Validates and normalizes phone numbers to standard E.164 international format.
 *
 * Rules:
 * 1. Strictly rejects alphabetic characters and arbitrary text.
 * 2. If country is provided (e.g. IN), validates against country rules (India: exactly 10 digits).
 * 3. Handles international strings starting with + (e.g. +919876543210, +12025550123).
 * 4. Normalizes valid numbers to E.164 (e.g. +919876543210).
 */
export function validateAndNormalizePhone(
  rawInput: string,
  country: CountryCode = "IN"
): PhoneValidationResult {
  const trimmed = (rawInput || "").trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: "Phone number is required.",
    };
  }

  // Reject alphabetic characters explicitly
  if (/[a-zA-Z]/.test(trimmed)) {
    return {
      isValid: false,
      error: "Phone number cannot contain alphabetic letters.",
    };
  }

  // Reject unsupported special characters (allowed: +, -, spaces, parentheses, digits)
  if (/[^0-9+\s\-()]/.test(trimmed)) {
    return {
      isValid: false,
      error: "Phone number contains invalid special characters.",
    };
  }

  // Check if string contains digits
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) {
    return {
      isValid: false,
      error: "Phone number must contain numeric digits.",
    };
  }

  try {
    let parsed = parsePhoneNumberFromString(trimmed, country);

    // If parsing without plus failed, try formatting with country calling code
    if (!parsed) {
      if (!trimmed.startsWith("+")) {
        const callingCode = getCountryCallingCode(country);
        parsed = parsePhoneNumberFromString(`+${callingCode}${trimmed}`, country);
      }
    }

    if (!parsed) {
      return {
        isValid: false,
        error: `Invalid phone number format for selected country (${country}).`,
      };
    }

    // Specific check for India (+91)
    if (parsed.country === "IN" || (country === "IN" && (!parsed.country || parsed.countryCallingCode === "91"))) {
      const national = parsed.nationalNumber;
      if (national.length !== 10) {
        return {
          isValid: false,
          error: `Indian phone numbers must be exactly 10 digits (currently ${national.length}).`,
        };
      }
    }

    if (!parsed.isValid()) {
      // Provide actionable feedback based on digit length
      const national = parsed.nationalNumber;
      if (national.length < 7) {
        return {
          isValid: false,
          error: "Phone number has insufficient digits.",
        };
      }
      if (national.length > 15) {
        return {
          isValid: false,
          error: "Phone number has excessive digits.",
        };
      }
      return {
        isValid: false,
        error: `Please enter a valid phone number for ${parsed.country || country}.`,
      };
    }

    const e164 = parsed.number; // e.g. +919876543210
    const detectedCountry = parsed.country || country;
    const callingCode = `+${parsed.countryCallingCode}`;

    return {
      isValid: true,
      e164,
      country: detectedCountry,
      nationalNumber: parsed.nationalNumber,
      callingCode,
    };
  } catch (err) {
    return {
      isValid: false,
      error: "Could not validate phone number. Please verify the digits and country code.",
    };
  }
}

/**
 * Validates an optional phone number.
 * Returns valid if empty or undefined. If a value is provided, it must be valid.
 */
export function validateOptionalPhone(
  rawInput?: string | null,
  country: CountryCode = "IN"
): PhoneValidationResult {
  const trimmed = (rawInput || "").trim();
  if (!trimmed) {
    return {
      isValid: true,
      e164: "",
    };
  }
  return validateAndNormalizePhone(trimmed, country);
}
