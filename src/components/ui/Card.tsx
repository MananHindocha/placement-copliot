import { clsx } from "clsx";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  glass?: boolean;
  hover?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
};

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function Card({
  children,
  className,
  glass = false,
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all duration-200",
        glass
          ? "bg-white/4 border-white/8 backdrop-blur-sm"
          : "bg-[#111827] border-white/6",
        hover && "hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
