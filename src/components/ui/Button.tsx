import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "bg-[#F5F5F5] text-[#000000] hover:bg-[#E4E4E7] active:bg-[#D4D4D8] border border-[#F5F5F5]",
  secondary:
    "bg-[#121212] text-[#F5F5F5] border border-[#292929] hover:bg-[#1A1A1A] hover:border-[#3A3A3A]",
  ghost:
    "text-[#A1A1AA] border border-transparent hover:text-[#F5F5F5] hover:bg-[#121212]",
  danger:
    "bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25 hover:bg-[#F43F5E]/20 hover:border-[#F43F5E]/40",
  success:
    "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 hover:bg-[#10B981]/20",
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
