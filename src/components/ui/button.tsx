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
      "inline-flex items-center justify-center font-bold tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F432] disabled:pointer-events-none disabled:opacity-50 select-none rounded-md";

    const variantStyles = {
      primary:
        "bg-[#C6F432] text-[#101820] hover:bg-[#B4E61F] active:scale-[0.99] border border-transparent font-bold",
      athletic:
        "bg-[#C6F432] text-[#101820] hover:bg-[#B4E61F] active:scale-[0.99] border border-transparent font-extrabold uppercase tracking-wider",
      secondary:
        "bg-white text-[#101820] hover:bg-[#F4F3EE] border border-[#DCE1E3] shadow-sm active:scale-[0.99]",
      outline:
        "bg-transparent text-[#101820] border border-[#101820] hover:bg-[#101820] hover:text-white active:scale-[0.99]",
      ghost:
        "bg-transparent text-[#8B969E] hover:text-[#101820] hover:bg-[#F4F3EE]",
      destructive:
        "bg-[#E53E3E] text-white hover:bg-red-700 active:scale-[0.99]",
    };

    const sizeStyles = {
      sm: "h-9 px-3.5 text-xs",
      md: "h-11 px-5 text-sm",
      lg: "h-12 px-7 text-sm",
      icon: "h-10 w-10",
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
