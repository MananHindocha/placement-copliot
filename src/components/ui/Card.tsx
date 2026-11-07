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
          ? "bg-[#101326]/80 border-[rgba(100,110,255,0.16)] backdrop-blur-md"
          : "bg-[#0B0D18] border-[rgba(100,110,255,0.12)]",
        hover &&
          "hover:border-[rgba(100,110,255,0.28)] hover:bg-[#151A35]/50 hover:shadow-xl hover:shadow-[rgba(27,31,184,0.12)] cursor-pointer",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
