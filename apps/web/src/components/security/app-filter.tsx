"use client";

import { useRouter } from "next/navigation";
import { SelectDropdown } from "@/components/ui/select-dropdown";

/** App picker for the activity log; navigates so the server re-queries. */
export function AppFilter({
  apps,
  value,
  hrefFor,
}: {
  apps: Array<{ id: string; name: string }>;
  value: string;
  /** Map of option value ("" = all apps) to URL. */
  hrefFor: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <div className="w-full sm:w-56">
      <SelectDropdown
        size="sm"
        fullWidth
        value={value}
        searchable={apps.length > 6}
        options={[
          { value: "", label: "All apps" },
          ...apps.map((app) => ({ value: app.id, label: app.name })),
        ]}
        onChange={(next) => {
          const href = hrefFor[next];
          if (href) router.push(href, { scroll: false });
        }}
      />
    </div>
  );
}
