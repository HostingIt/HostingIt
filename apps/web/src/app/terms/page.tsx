import { LegalPage } from "@/components/legal/legal-page";

export default function TermsPage() {
  return (
    <LegalPage label="Legal" title="Terms of Service" updated="August 2026">
      <h2>Service description</h2>
      <p>
        HostingIt provides managed hosting for Docker applications. The service
        is offered on a best-effort basis for hobby projects and small
        applications.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may not use HostingIt for illegal activities, spam, cryptocurrency
        mining, or any activity that violates applicable cloud provider terms.
      </p>

      <h2>Uptime and availability</h2>
      <p>
        We do not guarantee any specific uptime SLA. The service runs on
        best-effort infrastructure and may experience downtime, throttling, or
        resource limits.
      </p>

      <h2>Data and backups</h2>
      <p>
        You are responsible for backing up your data. HostingIt is not liable
        for data loss.
      </p>

      <h2>Account termination</h2>
      <p>
        We may suspend or terminate accounts that violate these terms or abuse
        the platform.
      </p>

      <h2>Contact</h2>
      <p>For questions, contact support@hostingit.online.</p>
    </LegalPage>
  );
}
