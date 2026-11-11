import { clsx } from "clsx";

type ProgressBarProps = {
  value: number; // 0–100
  color?: "indigo" | "emerald" | "amber" | "rose" | "violet";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
};

const colorMap: Record<string, string> = {
  indigo: "bg-[#B293E2]",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  violet: "bg-[#735BA0]",
};

const sizeMap: Record<string, string> = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
};

export default function ProgressBar({
  value,
  color = "indigo",
  size = "md",
  showLabel = false,
  label,
  animated = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={clsx("w-full", className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#969085]">{label ?? "Progress"}</span>
          <span className="text-xs font-semibold text-[#F8F8F9] tabular-nums">{clamped}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className={clsx(
          "w-full rounded-full bg-[#171820] border border-[#22232D] overflow-hidden",
          sizeMap[size]
        )}
      >
        <div
          className={clsx(
            "rounded-full transition-all duration-700 ease-out",
            colorMap[color],
            sizeMap[size],
            animated && "animate-pulse"
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
