import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeVariant = "indigo" | "emerald" | "amber" | "rose" | "violet" | "slate" | "sky";
type BadgeSize = "sm" | "md";

const variantMap: Record<BadgeVariant, string> = {
  indigo: "bg-[rgba(27,31,184,0.22)] text-[#A5A9FF] border-[rgba(100,110,255,0.30)]",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  slate: "bg-[#101326] text-[#A2A7C0] border-[rgba(100,110,255,0.15)]",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/25",
};

const sizeMap: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
};

export default function Badge({
  children,
  variant = "indigo",
  size = "sm",
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        variantMap[variant],
        sizeMap[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            "w-1.5 h-1.5 rounded-full",
            variant === "indigo" && "bg-[#454BFF]",
            variant === "emerald" && "bg-emerald-400",
            variant === "amber" && "bg-amber-400",
            variant === "rose" && "bg-rose-400",
            variant === "violet" && "bg-violet-400",
            variant === "slate" && "bg-[#737A99]",
            variant === "sky" && "bg-sky-400"
          )}
        />
      )}
      {children}
    </span>
  );
}
