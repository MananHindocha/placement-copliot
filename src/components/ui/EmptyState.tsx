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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[rgba(27,31,184,0.18)] border border-[rgba(100,110,255,0.25)] flex items-center justify-center mb-5 shadow-lg shadow-[rgba(27,31,184,0.12)]">
        <Icon className="w-8 h-8 text-[#777CFF]" />
      </div>
      <h3 className="text-base font-semibold text-[#F5F6FF] mb-2">{title}</h3>
      <p className="text-sm text-[#A2A7C0] max-w-xs leading-relaxed mb-6">{description}</p>
      {action}
    </div>
  );
}
