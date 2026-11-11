import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeVariant = "indigo" | "emerald" | "amber" | "rose" | "violet" | "slate" | "sky";
type BadgeSize = "sm" | "md";

const variantMap: Record<BadgeVariant, string> = {
  indigo: "bg-[#121212] text-[#F5F5F5] border-[#292929]",
  emerald: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
  amber: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25",
  rose: "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/25",
  violet: "bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/25",
  slate: "bg-[#0A0A0A] text-[#A1A1AA] border-[#1D1D1D]",
  sky: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/25",
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
            variant === "indigo" && "bg-[#F5F5F5]",
            variant === "emerald" && "bg-[#10B981]",
            variant === "amber" && "bg-[#F59E0B]",
            variant === "rose" && "bg-[#F43F5E]",
            variant === "violet" && "bg-[#A78BFA]",
            variant === "slate" && "bg-[#71717A]",
            variant === "sky" && "bg-[#38BDF8]"
          )}
        />
      )}
      {children}
    </span>
  );
}
