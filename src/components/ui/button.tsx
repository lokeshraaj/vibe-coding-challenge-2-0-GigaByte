import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "athletic";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-wide uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-athletic-lime disabled:pointer-events-none disabled:opacity-50 select-none";

    const variantStyles = {
      primary:
        "bg-athletic-lime text-athletic-black hover:bg-athletic-limeHover hover:shadow-[0_0_20px_rgba(163,255,0,0.4)] active:scale-[0.98]",
      secondary:
        "bg-athletic-charcoal text-white hover:bg-athletic-elevated border border-athletic-border active:scale-[0.98]",
      outline:
        "bg-transparent text-white border-2 border-athletic-lime hover:bg-athletic-lime hover:text-athletic-black active:scale-[0.98]",
      ghost:
        "bg-transparent text-athletic-textMuted hover:text-white hover:bg-athletic-elevated",
      destructive:
        "bg-athletic-danger text-white hover:bg-red-600 hover:shadow-[0_0_15px_rgba(255,51,75,0.4)] active:scale-[0.98]",
      athletic:
        "bg-athletic-lime text-athletic-black font-black italic tracking-wider skew-x-[-8deg] hover:bg-athletic-limeHover hover:shadow-[0_0_25px_rgba(163,255,0,0.5)] active:scale-[0.98]",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-sm",
      md: "h-11 px-6 text-sm rounded-md",
      lg: "h-14 px-8 text-base rounded-md",
      icon: "h-10 w-10 rounded-md",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Processing...</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
