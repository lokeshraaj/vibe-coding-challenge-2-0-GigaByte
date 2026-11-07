"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Info,
  Lock,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  X,
  UserCheck,
  ArrowRight,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LockCategory =
  | "ROLE"
  | "SPORT"
  | "PREREQUISITE"
  | "ACCOUNT"
  | "STATUS"
  | "LOCKED"
  | "DATA"
  | "SYSTEM";

export interface FeatureLockInfoProps {
  title?: string;
  reason: string;
  category?: LockCategory;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
  iconClassName?: string;
  size?: "xs" | "sm" | "md";
  showBadge?: boolean;
  badgeLabel?: string;
  whoCanChange?: string;
  suggestedAction?: string;
}

const CATEGORY_CONFIG: Record<
  LockCategory,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  ROLE: {
    label: "Role Permission",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: ShieldAlert,
  },
  SPORT: {
    label: "Sport Locked",
    bg: "bg-[#C6F432]/30",
    text: "text-[#101820]",
    border: "border-[#101820]",
    icon: Lock,
  },
  PREREQUISITE: {
    label: "Prerequisite Required",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: AlertCircle,
  },
  ACCOUNT: {
    label: "Account Restriction",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: Lock,
  },
  STATUS: {
    label: "Eligibility Rule",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    icon: CheckCircle2,
  },
  LOCKED: {
    label: "Audit Locked",
    bg: "bg-zinc-100",
    text: "text-zinc-800",
    border: "border-zinc-300",
    icon: Lock,
  },
  DATA: {
    label: "Required Data",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Info,
  },
  SYSTEM: {
    label: "System Managed",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: Database,
  },
};

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

interface PositionCoords {
  top: number;
  left: number;
  actualPlacement: "top" | "bottom" | "left" | "right";
  arrowX?: number;
  arrowY?: number;
}

export function FeatureLockInfo({
  title,
  reason,
  category = "PREREQUISITE",
  placement = "top",
  className,
  iconClassName,
  size = "sm",
  showBadge = false,
  badgeLabel,
  whoCanChange,
  suggestedAction,
}: FeatureLockInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PositionCoords | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.PREREQUISITE;
  const CategoryIcon = config.icon;

  const defaultTitle =
    title ||
    (category === "SPORT"
      ? "Sport Restricted"
      : category === "ROLE"
      ? "Permission Required"
      : category === "LOCKED"
      ? "Action Locked"
      : category === "PREREQUISITE"
      ? "Requirement Not Met"
      : category === "SYSTEM"
      ? "System-Controlled Value"
      : "Feature Unavailable");

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const clearPendingTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    const popoverWidth = popoverRect.width || 320;
    const popoverHeight = popoverRect.height || 200;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Check if trigger is offscreen entirely
    if (
      triggerRect.bottom < 0 ||
      triggerRect.top > viewportHeight ||
      triggerRect.right < 0 ||
      triggerRect.left > viewportWidth
    ) {
      setIsOpen(false);
      return;
    }

    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    let actualPlacement: "top" | "bottom" | "left" | "right" = placement;

    // Smart auto-flip based on available viewport space
    if (placement === "top") {
      if (spaceAbove < popoverHeight + 12 && spaceBelow > spaceAbove) {
        actualPlacement = "bottom";
      }
    } else if (placement === "bottom") {
      if (spaceBelow < popoverHeight + 12 && spaceAbove > spaceBelow) {
        actualPlacement = "top";
      }
    } else if (placement === "left") {
      if (spaceLeft < popoverWidth + 12 && spaceRight > spaceLeft) {
        actualPlacement = "right";
      }
    } else if (placement === "right") {
      if (spaceRight < popoverWidth + 12 && spaceLeft > spaceRight) {
        actualPlacement = "left";
      }
    }

    let top = 0;
    let left = 0;

    if (actualPlacement === "bottom") {
      top = triggerRect.bottom + 8;
      left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
    } else if (actualPlacement === "top") {
      top = triggerRect.top - popoverHeight - 8;
      left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
    } else if (actualPlacement === "left") {
      top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
      left = triggerRect.left - popoverWidth - 8;
    } else if (actualPlacement === "right") {
      top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
      left = triggerRect.right + 8;
    }

    // Horizontal viewport clamping
    const minMargin = 12;
    if (left < minMargin) {
      left = minMargin;
    } else if (left + popoverWidth > viewportWidth - minMargin) {
      left = Math.max(minMargin, viewportWidth - popoverWidth - minMargin);
    }

    // Vertical viewport clamping
    if (top < minMargin) {
      top = minMargin;
    } else if (top + popoverHeight > viewportHeight - minMargin) {
      top = Math.max(minMargin, viewportHeight - popoverHeight - minMargin);
    }

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const arrowX = Math.max(16, Math.min(triggerCenterX - left, popoverWidth - 16));

    const triggerCenterY = triggerRect.top + triggerRect.height / 2;
    const arrowY = Math.max(16, Math.min(triggerCenterY - top, popoverHeight - 16));

    setCoords({ top, left, actualPlacement, arrowX, arrowY });
  }, [placement]);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    const handleUpdate = () => {
      calculatePosition();
    };

    window.addEventListener("resize", handleUpdate, { passive: true });
    window.addEventListener("scroll", handleUpdate, { capture: true, passive: true });

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, { capture: true });
    };
  }, [isOpen, calculatePosition]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearPendingTimeout();
    setIsOpen((prev) => !prev);
  };

  const handleMouseEnter = () => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      clearPendingTimeout();
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      clearPendingTimeout();
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 180);
    }
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  return (
    <div
      className={cn("relative inline-flex items-center align-middle", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-label={`${defaultTitle}: ${reason}`}
        aria-expanded={isOpen}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-1 text-[#8B969E] hover:text-[#101820] hover:bg-[#F4F3EE] transition-colors focus:outline-none focus:ring-1 focus:ring-[#101820]",
          isOpen && "text-[#101820] bg-[#F4F3EE]"
        )}
      >
        {showBadge ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F3EE] text-[#101820] border border-[#DCE1E3]">
            <Info className={cn(iconSizes[size], iconClassName)} />
            <span>{badgeLabel || "Info"}</span>
          </span>
        ) : (
          <Info className={cn(iconSizes[size], iconClassName)} />
        )}
      </button>

      {/* Popover Card rendered via portal to prevent container clipping */}
      {isOpen &&
        mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={clearPendingTimeout}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "fixed",
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              opacity: coords ? 1 : 0,
              zIndex: 99999,
            }}
            className="w-80 max-w-[calc(100vw-24px)] p-3.5 rounded-xl border border-[#DCE1E3] bg-white shadow-2xl text-left select-text animate-in fade-in-0 zoom-in-95 duration-150 transition-opacity"
          >
            {/* Arrow pointer */}
            {coords?.actualPlacement === "bottom" && (
              <div
                className="absolute -top-1.5 w-3 h-3 bg-white border-t border-l border-[#DCE1E3] rotate-45"
                style={{ left: (coords.arrowX ?? 24) - 6 }}
              />
            )}
            {coords?.actualPlacement === "top" && (
              <div
                className="absolute -bottom-1.5 w-3 h-3 bg-white border-b border-r border-[#DCE1E3] rotate-45"
                style={{ left: (coords.arrowX ?? 24) - 6 }}
              />
            )}
            {coords?.actualPlacement === "right" && (
              <div
                className="absolute -left-1.5 w-3 h-3 bg-white border-b border-l border-[#DCE1E3] rotate-45"
                style={{ top: (coords.arrowY ?? 24) - 6 }}
              />
            )}
            {coords?.actualPlacement === "left" && (
              <div
                className="absolute -right-1.5 w-3 h-3 bg-white border-t border-r border-[#DCE1E3] rotate-45"
                style={{ top: (coords.arrowY ?? 24) - 6 }}
              />
            )}

            {/* Header */}
            <div className="relative z-10 flex items-start justify-between gap-2 pb-2 mb-2 border-b border-[#DCE1E3]">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border",
                    config.bg,
                    config.text,
                    config.border
                  )}
                >
                  <CategoryIcon className="h-3 w-3" />
                  <span>{config.label}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-[#8B969E] hover:text-[#101820] p-0.5 rounded transition-colors"
                aria-label="Close explanation"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Title & Body */}
            <div className="relative z-10 space-y-1">
              <h4 className="text-xs font-bold text-[#101820] leading-snug">{defaultTitle}</h4>
              <p className="text-[11px] text-[#202A32] leading-relaxed">{reason}</p>
            </div>

            {/* Who can change & Next step */}
            {(whoCanChange || suggestedAction) && (
              <div className="relative z-10 pt-2 mt-2 border-t border-[#DCE1E3] space-y-1.5 text-[10.5px]">
                {whoCanChange && (
                  <div className="flex items-start gap-1.5 text-[#202A32]">
                    <UserCheck className="h-3 w-3 text-[#101820] shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <span className="font-bold text-[#101820]">Authorized: </span>
                      <span className="text-[#8B969E]">{whoCanChange}</span>
                    </p>
                  </div>
                )}
                {suggestedAction && (
                  <div className="flex items-start gap-1.5 text-[#202A32]">
                    <ArrowRight className="h-3 w-3 text-[#101820] shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <span className="font-bold text-[#101820]">Next step: </span>
                      <span className="text-[#8B969E]">{suggestedAction}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// Reusable aliases as specified in system design
export const RestrictionInfo = FeatureLockInfo;
export const PermissionInfo = FeatureLockInfo;
