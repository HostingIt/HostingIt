import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import {
  COOKIE_POLICY_VERSION,
  LEGAL_CONTACT_EMAIL,
  LEGAL_UPDATED,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Every cookie HostingIt sets, what it does, and how long it lasts.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      label="Legal"
      title="Cookie Policy"
      updated={LEGAL_UPDATED}
      version={COOKIE_POLICY_VERSION}
    >
      <p>
        This policy lists every cookie HostingIt sets, what each one does, and
        how long it lasts. It also covers the one piece of browser storage
        outside cookies and the controls your browser gives you.
      </p>

      <h2>What cookies are</h2>
      <p>
        A cookie is a small text file a site asks your browser to keep and send
        back with later requests. Cookies are how a site remembers that you
        signed in, and how it keeps a form safe from cross-site request forgery.
      </p>

      <h2>Our approach</h2>
      <p>
        Every cookie we set is strictly necessary to run HostingIt. We run no
        advertising cookies, no analytics cookies, and no third-party tracking
        of any kind. HostingIt sets no cookie on a domain we do not control.
      </p>

      <h2>Cookies we set</h2>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Purpose</th>
            <th>Type</th>
            <th>Lifetime</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>authjs.session-token</code>
            </td>
            <td>
              Keeps you signed in. Sent as{" "}
              <code>__Secure-authjs.session-token</code> over HTTPS.
            </td>
            <td>Essential</td>
            <td>Up to 30 days</td>
          </tr>
          <tr>
            <td>
              <code>authjs.csrf-token</code>
            </td>
            <td>
              Protects sign-in and sign-out requests against cross-site request
              forgery.
            </td>
            <td>Essential</td>
            <td>Set again when you start a sign-in</td>
          </tr>
          <tr>
            <td>
              <code>hostingit_mfa</code>
            </td>
            <td>
              Records that you passed two-factor verification, so we do not ask
              for a code on every page.
            </td>
            <td>Essential</td>
            <td>12 hours</td>
          </tr>
          <tr>
            <td>
              <code>pending_totp_secret</code>
            </td>
            <td>
              Holds the encrypted secret while you set up your authenticator
              app.
            </td>
            <td>Essential</td>
            <td>10 minutes</td>
          </tr>
          <tr>
            <td>
              <code>hostingit_legal_consent</code>
            </td>
            <td>
              Carries your Terms and Privacy acceptance through the sign-in
              redirect, then expires.
            </td>
            <td>Essential</td>
            <td>30 minutes</td>
          </tr>
          <tr>
            <td>
              <code>hostingit_cookie_consent</code>
            </td>
            <td>
              Remembers the choice you made on the cookie banner, so we stop
              showing it.
            </td>
            <td>Preference</td>
            <td>180 days</td>
          </tr>
        </tbody>
      </table>
      <p>
        Session and security cookies are HttpOnly, which means scripts on the
        page cannot read them. All of our cookies are SameSite=Lax and marked
        Secure when you browse over HTTPS.
      </p>

      <h2>Beyond cookies</h2>
      <p>
        The theme switch stores your light or dark choice in your browser&apos;s
        localStorage under the key <code>theme</code>. It stays on your device,
        we never receive it, and clearing your browser storage removes it.
      </p>

      <h2>Third-party cookies</h2>
      <p>
        None of our pages load third-party scripts, so nothing else sets a
        cookie in our name. When you sign in with GitHub or Google, those
        services set their own cookies on their own domains while you complete
        the sign-in, and their policies cover that.
      </p>

      <h2>How to control cookies</h2>
      <p>
        Every browser lets you view, block, and delete cookies, usually under
        privacy or site-data settings. Blocking our cookies signs you out and
        stops two-factor verification from working, so keep them if you want to
        use the dashboard. Deleting the{" "}
        <code>hostingit_cookie_consent</code> cookie brings the banner back on
        your next visit.
      </p>

      <h2>The consent banner</h2>
      <p>
        The banner offers two choices. <strong>Accept all</strong> allows
        essential cookies plus any non-essential cookie we add later.{" "}
        <strong>Essential only</strong> allows the cookies listed above and
        nothing else. Both choices last 180 days, and we ask again when this
        policy changes. Today both choices store the same set of cookies,
        because we set no non-essential ones.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We update this policy when the cookies we set change, and the version
        date sits at the top of the page. Questions go to{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
      <p>
        Related documents: <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
