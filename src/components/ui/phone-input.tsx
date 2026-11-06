"use client";

import React, { useState, useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import {
  POPULAR_COUNTRIES,
  validateAndNormalizePhone,
  CountryOption,
} from "@/lib/validation/phone";
import type { CountryCode } from "libphonenumber-js";

export interface PhoneInputProps {
  label?: string;
  name?: string;
  value?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  onValidationChange?: (isValid: boolean, e164: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  defaultCountry?: CountryCode;
  id?: string;
}

export function PhoneInput({
  label,
  name = "contactPhone",
  value = "",
  onChange,
  onValidationChange,
  error: externalError,
  placeholder = "e.g. 9876543210",
  required = false,
  disabled = false,
  className,
  defaultCountry = "IN",
  id: customId,
}: PhoneInputProps) {
  const generatedId = useId();
  const inputId = customId || generatedId;

  // Selected country calling code
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(
    () => POPULAR_COUNTRIES.find((c) => c.code === defaultCountry) || POPULAR_COUNTRIES[0]
  );

  // Local phone number input (digits only)
  const [localNumber, setLocalNumber] = useState("");
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isTouched, setIsTouched] = useState(false);

  // Synchronize when value changes externally (e.g. form reset or parent loading data)
  useEffect(() => {
    if (value === "") {
      setLocalNumber("");
      setInternalError(null);
      setIsTouched(false);
    } else if (value && typeof value === "string") {
      if (value.startsWith("+")) {
        const matchedCountry = POPULAR_COUNTRIES.find((c) => value.startsWith(c.callingCode));
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
          setLocalNumber(value.slice(matchedCountry.callingCode.length).trim());
        } else {
          setLocalNumber(value.replace(/^\+/, ""));
        }
      } else if (value !== localNumber) {
        setLocalNumber(value);
      }
    }
  }, [value]);

  // Validate whenever number or country changes
  const runValidation = (num: string, country: CountryOption) => {
    const rawDigits = num.trim();

    if (!rawDigits) {
      if (required) {
        setInternalError("Phone number is required.");
        onValidationChange?.(false, "");
      } else {
        setInternalError(null);
        onValidationChange?.(true, "");
      }
      return;
    }

    // Call shared validator with selected country
    const fullInput = `${country.callingCode}${rawDigits}`;
    const result = validateAndNormalizePhone(fullInput, country.code);

    if (result.isValid && result.e164) {
      setInternalError(null);
      onValidationChange?.(true, result.e164);
    } else {
      setInternalError(result.error || "Invalid phone number.");
      onValidationChange?.(false, "");
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value as CountryCode;
    const country = POPULAR_COUNTRIES.find((c) => c.code === code) || POPULAR_COUNTRIES[0];
    setSelectedCountry(country);

    runValidation(localNumber, country);

    if (onChange) {
      const e164Val = localNumber.trim() ? `${country.callingCode}${localNumber.trim()}` : "";
      onChange({ target: { name, value: e164Val } });
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // Reject letters and unsupported characters: allow only digits and common formatting spaces/dashes
    const sanitizedDigits = rawVal.replace(/[^\d\s\-]/g, "");

    // If user attempted to type letters, provide immediate warning
    if (/[a-zA-Z]/.test(rawVal)) {
      setInternalError("Phone number accepts digits only. Letters are not allowed.");
    }

    setLocalNumber(sanitizedDigits);
    setIsTouched(true);

    const cleanNumber = sanitizedDigits.replace(/\D/g, "");
    runValidation(cleanNumber, selectedCountry);

    if (onChange) {
      const e164Val = cleanNumber ? `${selectedCountry.callingCode}${cleanNumber}` : "";
      onChange({ target: { name, value: e164Val } });
    }
  };

  const handleBlur = () => {
    setIsTouched(true);
    runValidation(localNumber.replace(/\D/g, ""), selectedCountry);
  };

  const displayError = externalError || (isTouched ? internalError : null);

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-[#202A32]"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex h-11 w-full rounded-md border border-[#DCE1E3] bg-white text-sm transition-colors focus-within:border-[#101820] focus-within:ring-1 focus-within:ring-[#101820]",
          displayError && "border-[#E53E3E] focus-within:border-[#E53E3E] focus-within:ring-[#E53E3E]",
          disabled && "bg-[#F4F3EE] opacity-60 cursor-not-allowed"
        )}
      >
        {/* Country Code Picker */}
        <div className="relative flex items-center border-r border-[#DCE1E3] bg-[#F4F3EE]/60 px-2.5 rounded-l-md hover:bg-[#F4F3EE] transition-colors">
          <span className="text-base mr-1.5 pointer-events-none select-none">
            {selectedCountry.flag}
          </span>
          <span className="text-xs font-bold text-[#101820] mr-1 pointer-events-none select-none">
            {selectedCountry.callingCode}
          </span>
          <select
            value={selectedCountry.code}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Country calling code"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {POPULAR_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.callingCode})
              </option>
            ))}
          </select>
        </div>

        {/* National Number Input */}
        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={localNumber}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          placeholder={selectedCountry.code === "IN" ? "10-digit number (e.g. 9876543210)" : placeholder}
          disabled={disabled}
          required={required}
          className="flex-1 h-full px-3.5 py-2 text-sm text-[#101820] placeholder:text-[#8B969E] bg-transparent outline-none disabled:cursor-not-allowed"
        />
      </div>

      {/* Validation Message */}
      {displayError ? (
        <p className="text-xs font-medium text-[#E53E3E] flex items-center gap-1">
          <span>{displayError}</span>
        </p>
      ) : selectedCountry.code === "IN" && !localNumber ? (
        <p className="text-[11px] text-[#8B969E]">
          Enter 10-digit mobile number for India (+91)
        </p>
      ) : null}
    </div>
  );
}
