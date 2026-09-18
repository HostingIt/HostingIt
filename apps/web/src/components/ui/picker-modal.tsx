"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PickerOption = {
  value: string;
  label: string;
  hint?: string;
};

export function PickerModal({
  title,
  label,
  value,
  options,
  onChange,
  searchable = false,
  placeholder = "Choose…",
  size = "default",
  disabled = false,
}: {
  title: string;
  label?: string;
  value: string;
  options: PickerOption[];
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
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title={title}
      trigger={
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label ?? title}
          className={cn(
            "field-select text-left",
            size === "sm" && "field-select-sm",
            !selected && "text-muted"
          )}
        >
          {selected?.label ?? placeholder}
        </button>
      }
    >
      {searchable ? (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="mb-3"
          autoFocus
        />
      ) : null}
      <ul className="max-h-72 space-y-1 overflow-auto">
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted">
            No matches
          </li>
        ) : (
          filtered.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-accent/10 text-ink"
                      : "text-ink hover:bg-surface-2"
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.hint ? (
                    <span className="text-xs text-muted">{option.hint}</span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </Modal>
  );
}
