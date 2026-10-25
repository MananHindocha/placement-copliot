import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20",
  secondary:
    "bg-white/8 text-slate-200 border border-white/10 hover:bg-white/12 hover:border-white/20",
  ghost: "text-slate-400 hover:text-white hover:bg-white/5",
  danger:
    "bg-rose-500/15 text-rose-300 border border-rose-500/20 hover:bg-rose-500/25",
  success:
    "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25",
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
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none",
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
