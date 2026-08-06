"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type EnvVarRow = { key: string; value: string; secret?: boolean };

export function emptyEnvRow(): EnvVarRow {
  return { key: "", value: "", secret: false };
}

interface EnvVarEditorProps {
  rows: EnvVarRow[];
  onChange: (rows: EnvVarRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  /** text = visible values, password = always masked, toggle = per-row Secret checkbox */
  valueInputMode?: "text" | "password" | "toggle";
}

export function EnvVarEditor({
  rows,
  onChange,
  keyPlaceholder = "KEY",
  valuePlaceholder = "value",
  valueInputMode = "toggle",
}: EnvVarEditorProps) {
  function updateRow(index: number, patch: Partial<EnvVarRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <Input
            value={row.key}
            onChange={(e) => updateRow(index, { key: e.target.value })}
            placeholder={keyPlaceholder}
            className="min-w-[8rem] flex-1 font-mono"
          />
          <Input
            type={
              valueInputMode === "password"
                ? "password"
                : valueInputMode === "text"
                  ? "text"
                  : row.secret
                    ? "password"
                    : "text"
            }
            value={row.value}
            onChange={(e) => updateRow(index, { value: e.target.value })}
            placeholder={valuePlaceholder}
            className="min-w-[8rem] flex-1 font-mono"
            autoComplete="off"
          />
          {valueInputMode === "toggle" && (
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={row.secret ?? false}
                onChange={(e) => updateRow(index, { secret: e.target.checked })}
                className="rounded border-border"
              />
              Secret
            </label>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            disabled={rows.length === 1}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...rows, emptyEnvRow()])}
      >
        Add row
      </Button>
    </div>
  );
}
