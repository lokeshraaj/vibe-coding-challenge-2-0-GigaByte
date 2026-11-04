import * as React from "react";
import { cn } from "@/lib/utils";

interface FootballLoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function FootballLoading({
  className,
  size = "md",
  text = "LOADING ATHLIX...",
}: FootballLoadingProps) {
  const dimensions = {
    sm: { width: 140, height: 75, textClass: "text-[10px]" },
    md: { width: 220, height: 110, textClass: "text-xs" },
    lg: { width: 300, height: 150, textClass: "text-sm" },
  };

  const { width, height, textClass } = dimensions[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 bg-[#F4F3EE] select-none",
        className
      )}
      role="status"
      aria-label="Loading"
    >
      {/* 2D Vector Animation Stage */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 240 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Pitch ground line - minimal light grey */}
        <line
          x1="20"
          y1="102"
          x2="220"
          y2="102"
          stroke="#DCE1E3"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Small turf dash marks */}
        <line x1="60" y1="102" x2="68" y2="102" stroke="#C6F432" strokeWidth="2" strokeLinecap="round" />
        <line x1="130" y1="102" x2="140" y2="102" stroke="#C6F432" strokeWidth="2" strokeLinecap="round" />
        <line x1="190" y1="102" x2="198" y2="102" stroke="#C6F432" strokeWidth="2" strokeLinecap="round" />

        {/* PLAYER 1: Dribbler (Attacker on the left, midnight navy) */}
        <g className="anim-player1">
          {/* Head */}
          <circle cx="65" cy="38" r="9" fill="#101820" />

          {/* Torso */}
          <path
            d="M60 48 L73 50 L68 76 L57 74 Z"
            fill="#101820"
            stroke="#101820"
            strokeLinejoin="round"
          />

          {/* Left Arm (forward balance) */}
          <path
            d="M61 52 L50 63 L44 60"
            stroke="#101820"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right Arm (bent back) */}
          <path
            d="M71 53 L80 64 L77 71"
            stroke="#101820"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Left Support Leg (planted) */}
          <path
            d="M61 74 L55 88 L52 101"
            stroke="#101820"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right Kicking / Dribbling Leg (animates) */}
          <g className="anim-leg1">
            <path
              d="M67 75 L76 89 L86 98"
              stroke="#101820"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* PLAYER 2: Defender (approaching/tackling from the right, graphite/navy) */}
        <g className="anim-player2">
          {/* Head */}
          <circle cx="170" cy="40" r="9" fill="#202A32" />

          {/* Torso (lunging forward to tackle) */}
          <path
            d="M174 50 L161 52 L166 77 L177 75 Z"
            fill="#202A32"
            stroke="#202A32"
            strokeLinejoin="round"
          />

          {/* Left Arm (defensive guard) */}
          <path
            d="M163 53 L152 64 L154 72"
            stroke="#202A32"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right Arm (reaching back) */}
          <path
            d="M173 53 L184 62 L189 61"
            stroke="#202A32"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Back Trailing Leg */}
          <path
            d="M175 75 L186 87 L192 101"
            stroke="#202A32"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Front Intercepting Leg (animates lunging forward) */}
          <g className="anim-leg2">
            <path
              d="M167 76 L154 88 L138 99"
              stroke="#202A32"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* THE FOOTBALL: Electric Lime (#C6F432) with minimal navy seam pattern */}
        <g transform="translate(90, 96)">
          <g className="anim-ball">
            {/* Outer Lime Ball */}
            <circle cx="0" cy="0" r="7.5" fill="#C6F432" stroke="#101820" strokeWidth="1.5" />
            {/* Minimal Football Seams */}
            <path
              d="M-2 -3 L2 -3 L4 0 L0 3 L-4 0 Z"
              fill="#101820"
              opacity="0.85"
            />
            <line x1="0" y1="-7" x2="0" y2="-3" stroke="#101820" strokeWidth="1" />
            <line x1="6" y1="2" x2="3.5" y2="0" stroke="#101820" strokeWidth="1" />
            <line x1="-6" y1="2" x2="-3.5" y2="0" stroke="#101820" strokeWidth="1" />
          </g>
        </g>
      </svg>

      {/* ATHLIX Wordmark Underneath */}
      <div className="mt-3 flex flex-col items-center">
        <span className="text-sm font-black italic tracking-widest text-[#101820] uppercase">
          ATHLIX
        </span>
        {text && (
          <span
            className={cn(
              "font-bold uppercase tracking-wider text-[#8B969E] mt-0.5",
              textClass
            )}
          >
            {text}
          </span>
        )}
      </div>
    </div>
  );
}
