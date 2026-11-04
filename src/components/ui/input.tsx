import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-[#202A32]">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          className={cn(
            "flex h-11 w-full rounded-md border border-[#DCE1E3] bg-white px-3.5 py-2 text-sm text-[#101820] placeholder:text-[#8B969E] focus-visible:outline-none focus-visible:border-[#101820] focus-visible:ring-1 focus-visible:ring-[#101820] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[#E53E3E] focus-visible:border-[#E53E3E] focus-visible:ring-[#E53E3E]",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs font-medium text-[#E53E3E]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
