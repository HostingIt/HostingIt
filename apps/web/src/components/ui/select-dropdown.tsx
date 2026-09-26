"use client";

import { useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export function SelectDropdown({
  label,
  value,
  options,
  onChange,
  searchable = false,
  placeholder = "Choose…",
  size = "default",
  disabled = false,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  placeholder?: string;
  size?: "default" | "sm";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.hint && o.hint.toLowerCase().includes(q))
    );
  }, [options, query]);

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          className={cn(
            "field-select items-center text-left",
            size === "sm" && "field-select-sm",
            !selected && "text-muted"
          )}
        >
          {selected?.label ?? placeholder}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {searchable ? (
            <div className="p-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search…"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-ink outline-none focus-visible:border-accent"
                autoFocus
              />
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              No matches
            </p>
          ) : (
            filtered.map((option) => (
              <DropdownMenu.Item
                key={option.value}
                className={cn(
                  "flex cursor-pointer flex-col rounded-lg px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface-2",
                  option.value === value && "bg-accent/10"
                )}
                onSelect={() => onChange(option.value)}
              >
                <span className="font-medium">{option.label}</span>
                {option.hint ? (
                  <span className="text-xs text-muted">{option.hint}</span>
                ) : null}
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
