import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_UPDATED,
  PRIVACY_VERSION,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What HostingIt collects, why we collect it, and how to get it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      label="Legal"
      title="Privacy Policy"
      updated={LEGAL_UPDATED}
      version={PRIVACY_VERSION}
    >
      <p>
        This policy explains what HostingIt collects, why we collect it, who
        sees it, and how you get rid of it. It covers the control panel, the
        deploy platform, and the apps we run for you.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>
          We collect the account details your sign-in provider shares, the
          repositories you connect, and metadata about your apps.
        </li>
        <li>
          We run no analytics, no advertising trackers, and no third-party error
          trackers.
        </li>
        <li>We do not sell your personal information, and we never have.</li>
        <li>
          You can delete your account from dashboard settings. Account data goes
          within 30 days.
        </li>
      </ul>

      <h2>Who controls your data</h2>
      <p>
        HostingIt is the data controller for the information described here.
        HostingIt is operated from India, and you can reach the person
        responsible for privacy at{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>

      <h2>What we collect</h2>
      <h3>Account information</h3>
      <ul>
        <li>Email address and display name from your provider.</li>
        <li>
          Provider identifiers: your GitHub user id or your Google account id.
        </li>
        <li>
          Whether the email is verified, your plan, your account status, and
          your role.
        </li>
        <li>
          Your two-factor secret, encrypted with AES-256-GCM before it is
          written to the database.
        </li>
      </ul>

      <h3>Repository and app information</h3>
      <ul>
        <li>
          The GitHub App installation id, which is how we list the repositories
          you grant us.
        </li>
        <li>
          Repository owner, name, and branch for each app, plus the build
          settings you choose, such as Dockerfile path, build context, build
          arguments, and build secrets.
        </li>
        <li>
          Environment variable names and values you add to an app, which are
          passed to the deployment platform so your container can read them.
        </li>
        <li>
          App names, slugs, subdomains, custom domains, status, and deploy
          history with timestamps.
        </li>
      </ul>

      <h3>Billing information</h3>
      <ul>
        <li>
          When paid plans open, a payment request holds the plan, amount,
          payment method (UPI, PayPal, or bank), and the reference note you
          type into the form.
        </li>
        <li>
          We never receive or store card numbers or bank credentials. A PayPal
          payment happens on PayPal, and a bank transfer happens at your bank.
        </li>
      </ul>

      <h3>Technical information</h3>
      <ul>
        <li>
          Session and security cookies described in the{" "}
          <Link href="/cookies">Cookie Policy</Link>.
        </li>
        <li>
          The IP address your requests come from, which we use to rate limit
          sensitive actions such as account deletion.
        </li>
        <li>
          Build and deploy logs, which we stream from the deployment platform to
          your browser. Log text is not stored in our database, and the deploy
          records we keep hold status and timestamps only.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <ul>
        <li>No analytics, advertising, or session-recording scripts.</li>
        <li>No third-party error tracking or crash reporting services.</li>
        <li>
          No GitHub access token. We discard the token from sign-in and keep the
          GitHub App installation id instead.
        </li>
        <li>
          No Gmail, Drive, Calendar, Contacts, or other Google content.
        </li>
        <li>No card numbers and no bank credentials.</li>
      </ul>

      <h2>Google user data</h2>
      <p>
        Signing in with Google shares your name, email address, and Google
        account identifier with HostingIt, under the{" "}
        <code>openid</code>, <code>email</code>, and <code>profile</code>{" "}
        scopes. We use that data only to create your HostingIt account and sign
        you in.
      </p>
      <p>
        HostingIt does not access Gmail, Drive, Calendar, Contacts, or any other
        Google content. We do not sell Google user data, we do not use it for
        advertising, and we do not share it with third parties except as needed
        to run the sign-in you asked for. Our use of Google user data follows
        the Google API Services User Data Policy, including its Limited Use
        requirements.
      </p>
      <p>
        Your Google account identifier stays in our database while your account
        is active and is removed when you delete your account.
      </p>

      <h2>Why we process it</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Legal basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Create your account, sign you in, and check your second factor</td>
            <td>Performance of our contract with you</td>
          </tr>
          <tr>
            <td>Build, deploy, and serve your apps, including their domains</td>
            <td>Performance of our contract with you</td>
          </tr>
          <tr>
            <td>Keep the platform secure, rate limit abuse, and debug failures</td>
            <td>Our legitimate interest in running a safe service</td>
          </tr>
          <tr>
            <td>Answer your support requests</td>
            <td>Our legitimate interest in helping you</td>
          </tr>
          <tr>
            <td>Keep payment records for tax and accounting</td>
            <td>Legal obligation</td>
          </tr>
          <tr>
            <td>Email you about material changes to the service or these terms</td>
            <td>Our legitimate interest, or your consent where the law requires it</td>
          </tr>
        </tbody>
      </table>

      <h2>Cookies and similar technologies</h2>
      <p>
        We set a small number of cookies that keep sign-in and two-factor
        verification working. The{" "}
        <Link href="/cookies">Cookie Policy</Link> lists each one, its purpose,
        and how long it lasts. The only stored preference outside cookies is
        your light or dark theme choice, which stays in your browser and never
        reaches us.
      </p>

      <h2>How we store and protect it</h2>
      <ul>
        <li>
          Data lives in a PostgreSQL database on servers we manage, with access
          limited to the operator.
        </li>
        <li>
          Browser traffic runs over HTTPS, and session cookies are HttpOnly and
          SameSite.
        </li>
        <li>
          TOTP secrets are encrypted with AES-256-GCM using a key derived from
          our server secret, so a database dump alone does not expose them.
        </li>
        <li>
          We run no third-party error trackers, so your data does not flow to
          observability vendors.
        </li>
      </ul>
      <p>
        No system is perfectly secure. If a breach affects your personal data,
        we will tell you and the relevant regulator where the law requires it.
      </p>

      <h2>Who we share it with</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>What it sees</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GitHub</td>
            <td>
              Your GitHub identity, the repositories you grant through our App,
              and their file contents during a build
            </td>
            <td>Sign-in, listing your repos, and building images</td>
          </tr>
          <tr>
            <td>Google</td>
            <td>Your Google identity (name, email, account id)</td>
            <td>Sign-in</td>
          </tr>
          <tr>
            <td>Dokploy, our self-hosted deploy platform</td>
            <td>
              App configuration, environment variables, images, and runtime
              state
            </td>
            <td>Building and running your containers</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>DNS records and request metadata for domains that use it</td>
            <td>Serving hostingit.online domains</td>
          </tr>
          <tr>
            <td>Infrastructure providers who host our servers</td>
            <td>Everything stored on disk and every packet in and out</td>
            <td>Running the machines the service sits on</td>
          </tr>
        </tbody>
      </table>
      <p>
        That is the whole list. We do not sell personal information, we do not
        share it for advertising, and we hand it to authorities only when the
        law compels us. Where we can, we tell you first.
      </p>

      <h2>International transfers</h2>
      <p>
        Our servers and providers can sit outside the country you live in, which
        means your data can be processed abroad. When data leaves the EEA or the
        UK, we rely on an adequacy decision or on standard contractual clauses
        with the provider. Ask us for details and we will point you at the
        relevant terms.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          Account, app, and deployment data: kept while your account is active,
          then deleted within 30 days of account deletion.
        </li>
        <li>
          Consent records: we keep the version of the Terms and Privacy Policy
          you accepted, and when you accepted it, for as long as the account
          exists, because it is our proof that you agreed.
        </li>
        <li>
          Payment records: kept as long as tax and accounting rules require.
        </li>
        <li>
          Security and rate-limit data: kept in memory for the request or the
          rate-limit window, then discarded.
        </li>
        <li>
          We do not run automated backups, so there is no backup copy of your
          account data waiting to expire.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Wherever you live, you can ask us to:
      </p>
      <ul>
        <li>show you the personal data we hold about you;</li>
        <li>give you a copy in a portable format;</li>
        <li>correct data that is wrong;</li>
        <li>delete your data;</li>
        <li>restrict or object to a processing activity;</li>
        <li>withdraw a consent you gave earlier.</li>
      </ul>
      <p>
        Delete your account in dashboard settings, or email{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> for
        anything else. We answer within 30 days. We may ask you to prove you
        control the linked provider account before we act, because the account
        is the only thing tying the data to you.
      </p>
      <p>
        These rights have limits. We can refuse a request when the law lets us,
        and we explain the reason when we do.
      </p>

      <h2>Regional privacy rights</h2>

      <h3>India (DPDP Act 2023)</h3>
      <p>
        You can access, correct, and erase your personal data, and you can name
        someone to exercise those rights for you if you die or become unable to
        act. We process your data on the basis of the consent you give when you
        accept this policy, plus the legitimate uses the Act allows. Send
        grievances to{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> and
        we will respond within 30 days. If we do not resolve it, you can
        complain to the Data Protection Board of India.
      </p>

      <h3>EU and EEA, UK (GDPR and UK GDPR)</h3>
      <p>
        The legal bases table above sets out why we process each category of
        data. You can ask for a copy of your data, have it corrected or deleted,
        restrict what we do with it, object to processing based on legitimate
        interests, and receive it in a portable format. You can complain to your
        national supervisory authority, and in the UK to the Information
        Commissioner&apos;s Office. We do not carry out automated decision making or
        profiling that produces legal effects.
      </p>

      <h3>Brazil (LGPD)</h3>
      <p>
        You can confirm what we process, access it, correct it, anonymise or
        delete it, move it to another provider, ask which third parties receive
        it, and withdraw consent. Email us to exercise any of these. You can
        also petition the Autoridade Nacional de Proteção de Dados.
      </p>

      <h3>United States</h3>
      <p>
        We do not sell your personal information, and we do not share it for
        cross-context behavioural advertising, so there is nothing to opt out
        of. If you live in California, you have the right to know what we
        collect, to delete it, to correct it, and to be treated the same after
        you exercise those rights. Other states with similar privacy laws get
        the same treatment. Email us to make a request.
      </p>

      <h2>Children</h2>
      <p>
        HostingIt is not for children under 13, and we do not knowingly collect
        their data. If we learn that a child under 13 created an account, we
        delete it. If you are under the age of majority where you live, use
        HostingIt only with permission from a parent or guardian.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We update this policy when our data practices or the law change, and the
        version date sits at the top of the page. For material changes, a popup
        asks you to accept the new version before you continue using the
        dashboard. Older versions are available if you ask for one.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions, data requests, and complaints go to{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. If
        you are not happy with our answer, you can complain to your local data
        protection authority.
      </p>
      <p>
        Related documents: <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/cookies">Cookie Policy</Link>.
      </p>
    </LegalPage>
  );
}
