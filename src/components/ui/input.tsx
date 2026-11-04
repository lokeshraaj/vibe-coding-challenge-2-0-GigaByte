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
          <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-athletic-textMuted">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          className={cn(
            "flex h-11 w-full rounded-md border border-athletic-border bg-athletic-black px-3.5 py-2 text-sm text-white placeholder:text-neutral-600 focus-visible:outline-none focus-visible:border-athletic-lime focus-visible:ring-1 focus-visible:ring-athletic-lime transition-all disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-athletic-danger focus-visible:border-athletic-danger focus-visible:ring-athletic-danger",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs font-medium text-athletic-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
