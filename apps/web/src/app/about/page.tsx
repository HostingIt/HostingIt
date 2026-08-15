import Link from "next/link";
import { getSession } from "@/lib/session";

const WORK = [
  {
    title: "Connect GitHub",
    desc: "Sign in and pick the repository you already push to.",
  },
  {
    title: "We build the image",
    desc: "Your Dockerfile becomes a running container. No YAML maze.",
  },
  {
    title: "Share a live URL",
    desc: "SSL is included. Attach your own domain when you upgrade.",
  },
] as const;

export default async function AboutPage() {
  const session = await getSession();
  const loggedIn = !!session?.user;

  return (
    <div className="about">
      <section className="site-wrap about-hero">
        <p className="about-kicker">About</p>
        <h1 className="about-title">
          We run containers so you do not have to run a cloud.
        </h1>
        <p className="about-lede">
          HostingIt is managed Docker hosting for indie developers. Connect a
          GitHub repo, we build the image, provision SSL, and give you a URL.
          Best-effort hobby hosting — not a mission-critical SLA.
        </p>
        <div className="about-actions">
          <Link
            href={loggedIn ? "/dashboard" : "/signup"}
            className="home-dash"
          >
            {loggedIn ? "Open dashboard" : "Start free"}
          </Link>
          <Link href="/docs" className="home-text-link">
            Read the docs
          </Link>
        </div>
      </section>

      <section className="site-wrap about-section">
        <h2 className="about-heading">Why we exist</h2>
        <p className="about-copy">
          Shipping a side project should not mean opening five cloud consoles
          or guessing next month&apos;s usage bill. We built a small, honest
          path: GitHub in, container live, flat limits you can see.
        </p>
      </section>

      <section className="site-wrap about-section">
        <h2 className="about-heading">How we work</h2>
        <ol className="about-steps">
          {WORK.map((item, index) => (
            <li key={item.title} className="about-step">
              <span className="home-step-num">{index + 1}</span>
              <h3 className="about-step-title">{item.title}</h3>
              <p className="about-step-desc">{item.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="site-wrap about-section about-section-last">
        <h2 className="about-heading">What we will not do</h2>
        <ul className="about-list">
          <li>Pretend this is mission-critical production infrastructure.</li>
          <li>Invent VPS-style SKUs we do not sell.</li>
          <li>Hide plan limits. Free is one app; Pro is coming later.</li>
        </ul>
      </section>
    </div>
  );
}
