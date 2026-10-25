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
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-rose-300">{title}</h4>
          <p className="text-xs text-rose-200/90 mt-1 break-words">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="shrink-0 text-xs gap-1 border-rose-500/30 hover:bg-rose-500/20 text-rose-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </Button>
        )}
      </div>
    </div>
  );
}
