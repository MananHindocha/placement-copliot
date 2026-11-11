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
          ? "bg-[#171820]/95 border-[#2B2C3A]"
          : "bg-[#111218] border-[#22232D]",
        hover &&
          "hover:border-[#343646] hover:bg-[#15161E] cursor-pointer",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
