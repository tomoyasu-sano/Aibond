"use client";

import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  open: boolean;
  message: string;
  subMessage?: string;
  className?: string;
}

export function LoadingOverlay({
  open,
  message,
  subMessage,
  className,
}: LoadingOverlayProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-8 shadow-lg border">
        {/* Spinner */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="text-base font-medium">{message}</p>
          {subMessage && (
            <p className="mt-1 text-sm text-muted-foreground">{subMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
