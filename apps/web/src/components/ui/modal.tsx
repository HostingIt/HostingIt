"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  contentClassName,
  overlayClassName,
  hideClose = false,
  variant = "center",
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  hideClose?: boolean;
  variant?: "center" | "sheet";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm",
            overlayClassName
          )}
        />
        <Dialog.Content
          className={cn(
            "z-50 border border-border bg-surface text-ink shadow-lg outline-none",
            contentClassName,
            variant === "center" &&
              "fixed left-1/2 top-1/2 w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl p-5",
            variant === "sheet" &&
              "fixed inset-y-0 left-0 flex h-svh w-64 flex-col overflow-hidden rounded-none p-0"
          )}
        >
          {variant === "sheet" ? (
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
          ) : (
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="font-display text-lg font-bold text-ink">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-muted">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              {hideClose ? null : (
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </Dialog.Close>
              )}
            </div>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
