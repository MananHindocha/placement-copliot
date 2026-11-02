import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "bg-[#1B1FB8] text-[#F5F6FF] hover:bg-[#292EDB] active:bg-[#14178F] shadow-lg shadow-[rgba(27,31,184,0.30)] border border-[rgba(100,110,255,0.3)]",
  secondary:
    "bg-[#080A14] text-[#F5F6FF] border border-[rgba(100,110,255,0.18)] hover:bg-[#151A35] hover:border-[rgba(100,110,255,0.38)]",
  ghost:
    "text-[#A2A7C0] hover:text-[#F5F6FF] hover:bg-[#151A35]/60 hover:border-[rgba(100,110,255,0.15)]",
  danger:
    "bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 hover:border-rose-500/40",
  success:
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20",
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
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
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
