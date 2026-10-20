import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeVariant = "indigo" | "emerald" | "amber" | "rose" | "violet" | "slate" | "sky";
type BadgeSize = "sm" | "md";

const variantMap: Record<BadgeVariant, string> = {
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  slate: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/20",
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
            variant === "indigo" && "bg-indigo-400",
            variant === "emerald" && "bg-emerald-400",
            variant === "amber" && "bg-amber-400",
            variant === "rose" && "bg-rose-400",
            variant === "violet" && "bg-violet-400",
            variant === "slate" && "bg-slate-400",
            variant === "sky" && "bg-sky-400"
          )}
        />
      )}
      {children}
    </span>
  );
}
