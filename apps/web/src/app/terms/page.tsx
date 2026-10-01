import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import {
  LEGAL_CONTACT_EMAIL,
  TERMS_UPDATED,
  TERMS_VERSION,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement between you and HostingIt for managed Docker hosting.",
};

export default function TermsPage() {
  return (
    <LegalPage
      label="Legal"
      title="Terms of Service"
      updated={TERMS_UPDATED}
      version={TERMS_VERSION}
    >
      <p>
        These terms are the agreement between you and HostingIt. They cover the
        control panel, the deploy platform behind it, and every app we run for
        you. Creating an account means you accept them.
      </p>

      <h2>Who we are</h2>
      <p>
        HostingIt is an independent hosting service operated from India. Write
        to{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> for
        anything related to these terms, your account, or your apps.
      </p>

      <h2>The service</h2>
      <p>
        HostingIt builds and runs Docker apps from a GitHub repository you
        choose. You connect a repository, we build an image from a Dockerfile or
        a supported preset (Nixpacks, static site, Heroku buildpacks, Paketo,
        Railpack), and we serve the result on an HTTPS address. A push to the
        tracked branch triggers a new deploy through our GitHub App.
      </p>
      <p>
        The service is early-stage. Features, plan limits, and supported build
        types change as we work on it. Material changes appear on this page and
        in the plan cards on the site.
      </p>
      <p>
        HostingIt is best-effort hosting for hobby projects and small apps. Do
        not run anything on it that needs a contractual uptime guarantee,
        handles regulated data, or fails badly when a container restarts.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>
          Sign-in happens through GitHub or Google. We do not issue passwords.
        </li>
        <li>
          One account per person. You must be at least 13 years old, and if you
          are under the age of majority where you live, you need permission
          from a parent or guardian.
        </li>
        <li>
          Two-factor authentication is mandatory. You enroll a TOTP
          authenticator app on your first login, and every new session asks for
          a code.
        </li>
        <li>
          Anyone who can sign in to your GitHub or Google account can reach your
          HostingIt account. Keep those accounts secure.
        </li>
        <li>
          You are responsible for everything done through your account,
          including the apps you deploy and the environment variables and build
          secrets you store in them.
        </li>
        <li>
          If you lose your authenticator, email{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
          We recover accounts after we verify that you control the linked
          provider account.
        </li>
      </ul>

      <h2>Plans and resource limits</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>Apps</th>
            <th>Per app</th>
            <th>Domains</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>$0</td>
            <td>1</td>
            <td>512 MB RAM, 1 vCPU</td>
            <td>Subdomain on hostingit.online</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td colSpan={4}>
              Upcoming. We will publish price and limits here before it opens.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Limits are enforced per container. An app that reaches its memory
        ceiling can be killed and restarted by the container runtime. We do not
        bill for overages, and limits apply per account rather than per app.
      </p>
      <p>
        We can change plan limits and quotas. When we do, the plan cards and
        this page carry the new numbers before they take effect.
      </p>

      <h2>Acceptable use</h2>
      <p>You may not use HostingIt to:</p>
      <ul>
        <li>break any law, or host content that breaks one;</li>
        <li>
          run malware, phishing pages, credential harvesting, or fraud of any
          kind;
        </li>
        <li>send spam or unsolicited bulk email;</li>
        <li>mine cryptocurrency;</li>
        <li>
          run proxies, VPN exit nodes, torrent trackers, or open relays;
        </li>
        <li>
          attack, scan, or overload systems you do not own, including denial of
          service attacks;
        </li>
        <li>
          scrape or resell data in a way that breaks the terms of the service
          you took it from;
        </li>
        <li>infringe copyright, trademarks, or other rights;</li>
        <li>
          resell, sublet, or white-label the service without our written
          agreement;
        </li>
        <li>deploy code you do not have the rights to run;</li>
        <li>
          escape the container sandbox, reach the host, or touch another
          customer&apos;s workload or data;
        </li>
        <li>
          degrade the platform for other customers, including through automated
          load that you did not design for a hosted app.
        </li>
      </ul>
      <p>
        We can ask you to fix a violation, and we can suspend an app or an
        account while we investigate a serious one.
      </p>

      <h2>Your code and content</h2>
      <p>
        You keep ownership of your code, your content, and your data. You give
        us the licence we need to clone the repository you connect, build the
        image, run the container, and serve requests to your app. That licence
        ends when you delete the app or your account, apart from copies that sit
        in short-lived infrastructure logs.
      </p>
      <p>
        You confirm that you have the rights to deploy the code you connect, and
        that your app complies with the licences of the libraries it uses. We do
        not inspect your code for licence problems.
      </p>
      <p>
        We do not use your code for anything beyond running your apps, and we do
        not show it to other customers.
      </p>

      <h2>Third-party services</h2>
      <p>HostingIt depends on services we do not control:</p>
      <ul>
        <li>
          <strong>GitHub</strong> for sign-in and repository access. Our GitHub
          App requests read access to contents and metadata only, and we store
          the installation id rather than an access token.
        </li>
        <li>
          <strong>Google</strong> for sign-in, requesting your name, email, and
          account identifier.
        </li>
        <li>
          <strong>Dokploy</strong>, the deployment engine we self-host, which
          builds and runs your containers.
        </li>
        <li>
          <strong>Cloudflare</strong> for DNS on hostingit.online domains.
        </li>
      </ul>
      <p>
        Each provider has its own terms, and an outage or policy change on their
        side can affect your apps. If GitHub or Google revokes our access, parts
        of the service stop working until you reconnect.
      </p>

      <h2>Domains and SSL</h2>
      <p>
        Free apps get a subdomain on hostingit.online. Slugs are unique and we
        do not reuse one after deletion. Custom domains arrive with the upcoming
        Pro plan: you point a CNAME record at us, and we issue the certificate.
      </p>
      <p>
        DNS changes take time to propagate, and we cannot control that timing.
        We do not guarantee that a subdomain or domain stays available, and
        disputes over domain names follow ICANN and registry rules rather than
        these terms.
      </p>

      <h2>Payments and refunds</h2>
      <p>
        Paid plans are not open yet, and the free plan needs no payment details.
        When paid plans open, payment runs through UPI, PayPal, or bank
        transfer, and an operator verifies each payment by hand before the plan
        activates. Billing is monthly, we never auto-charge, and we store no
        card or bank credentials.
      </p>
      <p>
        Cancel by emailing us. Your plan runs to the end of the period you paid
        for and then drops to Free with its limits. We refund the current month
        if we cannot activate the plan you paid for, and we honour refunds that
        consumer law requires where you live. We do not refund part-used months
        that you cancel yourself.
      </p>
      <p>
        You are responsible for any tax that applies to your purchase, other
        than taxes on our own income.
      </p>

      <h2>Availability and support</h2>
      <p>
        We publish no uptime SLA. The control panel, builds, and running apps can
        be unavailable during deploys, maintenance, or incidents at our
        providers. Current status sits on the{" "}
        <Link href="/status">status page</Link>.
      </p>
      <p>
        Free accounts get community support. Paid plans will state their own
        support terms when they open. We do not promise a response time, and we
        handle security reports before feature requests.
      </p>

      <h2>Backups and data loss</h2>
      <p>
        Automatic backups are not running yet. Keep your own copy of the code,
        data, and configuration that matter to you. Deleting an app removes its
        container, configuration, and domain from our platform, and we cannot
        restore anything we do not hold.
      </p>
      <p>
        Until backups ship, treat HostingIt as a place to run apps you can
        redeploy from source at any time.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        We can suspend or close an account that breaks these terms, abuses the
        platform, creates legal risk, or leaves a paid plan unpaid. Suspension
        stops your apps and blocks new deploys. Where it is reasonable, we tell
        you what happened and give you a chance to fix it before we act.
      </p>
      <p>
        You can delete your account yourself from dashboard settings. Deletion
        asks for your typed email address and a current authenticator code.
        Deleting your account removes your apps, their containers, and your
        records from our systems. Payment records kept for tax and short-lived
        operational logs survive for the periods described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <p>
        These sections survive termination: payments owed, disclaimers,
        liability limits, indemnity, and governing law.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The service is provided as is and as available, without warranties of
        any kind. We do not promise that a build succeeds, that an app runs
        without errors, that an app stays online, or that your data survives a
        hardware failure or a mistake.
      </p>
      <p>
        Nothing in these terms excludes a warranty or right that your local law
        does not allow us to exclude.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, our total liability for all claims related
        to the service is capped at the greater of the fees you paid us in the
        12 months before the claim or USD 10. We are not liable for lost
        profits, lost revenue, lost data, or indirect and consequential losses.
      </p>
      <p>
        Nothing here limits our liability for death or personal injury caused by
        negligence, for fraud, or for anything else the law does not allow us to
        limit.
      </p>

      <h2>Indemnity</h2>
      <p>
        If a third party brings a claim against us over your code, your content,
        or your breach of these terms, you cover the resulting losses and
        reasonable costs. We will tell you about the claim and let you take part
        in the defence.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We update these terms when the service or the law changes, and the
        version date sits at the top of this page. For material changes, a popup
        asks you to accept the new version before you continue using the
        dashboard. We store the version you accepted and the time you accepted
        it.
      </p>
      <p>
        If you do not agree with a new version, stop using HostingIt and delete
        your account.
      </p>

      <h2>Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of India, and the courts of India
        have jurisdiction. That choice does not remove mandatory consumer
        protections in the country where you live, and it does not stop you from
        bringing a claim in your local courts where the law gives you that
        right.
      </p>
      <p>
        If you live in the EU, the EEA, the UK, Brazil, or the US, nothing in
        these terms takes away rights you hold under your local consumer and
        privacy law. Before starting a formal dispute, write to{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> and
        give us 30 days to resolve it.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms go to{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
      <p>
        Related documents: <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/cookies">Cookie Policy</Link>.
      </p>
    </LegalPage>
  );
}
