import { Suspense } from "react";
import DashboardSubLoading from "../apps/new/loading";
import SettingsPageContent from "./settings-content";

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<DashboardSubLoading />}>
      <SettingsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
