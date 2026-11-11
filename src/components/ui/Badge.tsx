import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeVariant = "indigo" | "emerald" | "amber" | "rose" | "violet" | "slate" | "sky";
type BadgeSize = "sm" | "md";

const variantMap: Record<BadgeVariant, string> = {
  indigo: "bg-[#B293E2]/12 text-[#B293E2] border-[#B293E2]/25",
  emerald: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
  amber: "bg-amber-500/12 text-amber-300 border-amber-500/25",
  rose: "bg-rose-500/12 text-rose-400 border-rose-500/25",
  violet: "bg-[#735BA0]/20 text-[#C8B2EB] border-[#735BA0]/35",
  slate: "bg-[#171820] text-[#969085] border-[#262733]",
  sky: "bg-[#735BA0]/15 text-[#B293E2] border-[#735BA0]/30",
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
            variant === "indigo" && "bg-[#B293E2]",
            variant === "emerald" && "bg-emerald-400",
            variant === "amber" && "bg-amber-400",
            variant === "rose" && "bg-rose-400",
            variant === "violet" && "bg-[#987AC9]",
            variant === "slate" && "bg-[#969085]",
            variant === "sky" && "bg-[#B293E2]"
          )}
        />
      )}
      {children}
    </span>
  );
}
