import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "./Button";

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({
  title = "Database Error",
  message,
  onRetry,
}: ErrorBannerProps) {
  return (
    <div className="rounded-xl border border-[#F43F5E]/25 bg-[#0D0D0D] p-4 text-[#F5F5F5]">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-[#F43F5E]">{title}</h4>
          <p className="text-xs text-[#A1A1AA] mt-1 break-words">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="shrink-0 text-xs gap-1 border-[#F43F5E]/25 hover:bg-[#F43F5E]/10 text-[#F43F5E]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </Button>
        )}
      </div>
    </div>
  );
}
