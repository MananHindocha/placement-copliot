import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-[#A1A1AA]" />
      </div>
      <h3 className="text-sm font-semibold text-[#F5F5F5] mb-1.5">{title}</h3>
      <p className="text-xs text-[#71717A] max-w-xs leading-relaxed mb-6">{description}</p>
      {action}
    </div>
  );
}
