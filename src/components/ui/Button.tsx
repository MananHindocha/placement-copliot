import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "bg-[#B293E2] text-[#0A0B0F] hover:bg-[#C3A9EB] active:bg-[#9D7DD3] border border-[#B293E2]",
  secondary:
    "bg-[#171820] text-[#F8F8F9] border border-[#282936] hover:bg-[#1D1D26] hover:border-[#383948]",
  ghost:
    "text-[#969085] border border-transparent hover:text-[#F8F8F9] hover:bg-[#171820]",
  danger:
    "bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/18 hover:border-rose-500/40",
  success:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/18",
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-sm px-5 py-2.5 gap-2.5",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
};

export default function Button({
  type = "button",
  variant = "primary",
  size = "md",
  children,
  icon,
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variantMap[variant],
        sizeMap[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
