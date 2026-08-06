"use client";

import { cn } from "@/lib/utils";

interface OtpInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function OtpInput({
  id = "code",
  value,
  onChange,
  disabled,
  autoFocus,
  className,
}: OtpInputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder="000000"
      spellCheck={false}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className={cn(
        "flex h-14 w-full rounded-md border border-border bg-background px-3 text-center font-mono text-2xl tracking-[0.4em] text-ink placeholder:tracking-[0.4em] placeholder:text-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}
