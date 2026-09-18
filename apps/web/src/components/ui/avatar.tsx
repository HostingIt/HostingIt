import * as React from "react";
import { cn } from "@/lib/utils";

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null;
  email?: string | null;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, email, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-accent text-xs font-semibold text-white",
        className
      )}
      {...props}
    >
      {initialsFrom(name, email)}
    </div>
  )
);
Avatar.displayName = "Avatar";

export { Avatar };
