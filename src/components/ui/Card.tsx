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
        "rounded-xl border transition-colors duration-150",
        glass
          ? "bg-[#0A0A0A] border-[#292929]"
          : "bg-[#0D0D0D] border-[#1D1D1D]",
        hover &&
          "hover:border-[#292929] hover:bg-[#121212] cursor-pointer",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
