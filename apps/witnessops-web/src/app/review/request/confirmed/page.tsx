import type { Metadata } from "next";
import Link from "next/link";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import {
  VerificationLightShell,
  verificationLight,
} from "@/components/shared/verification-light-shell";

export const metadata: Metadata = {
  title: "Request verified",
  description:
    "Mailbox verification is complete for a WitnessOps proof-run fit request.",
  alternates: {
    canonical: "/review/request/confirmed",
    languages: {
      en: "/review/request/confirmed",
      pl: "/pl/review/request/confirmed",
      "x-default": "/review/request/confirmed",
    },
  },
  robots: { index: false, follow: false },
};

const nextSteps = [
  "WitnessOps reviews whether the technical action is bounded enough for one scoped review package.",
  "We confirm the system boundary, action path, likely evidence sources, possible verifier path, and obvious gaps.",
  "We reply by email with fit, scope, fee, and next action.",
];

const waitLinks = [
  {
    href: "/docs/how-it-works/verification",
    label: "How verification works",
    body: "Read the verification model and how WitnessOps separates proof from claims.",
  },
  {
    href: "/library",
    label: "Library",
    body: "Browse public entry points, examples, and documentation.",
  },
  {
    href: "/review/sample-cases",
    label: "Example reviews",
    body: "Inspect labelled sample reviews before work starts.",
  },
  {
    href: "/review",
    label: "Package offer",
    body: "Review the bounded offer, outputs, fit, and claim boundaries.",
  },
  {
    href: "/support",
    label: "Support",
    body: "Use support for non-secret questions about the request path.",
  },
];

export default function ReviewRequestConfirmedPage() {
  return (
    <VerificationLightShell>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[960px] px-6 py-12 md:py-16"
      >
        <section className="mb-10 max-w-[720px]">
          <div
            className={`mb-4 ${verificationLight.label} ${verificationLight.trust}`}
          >
            Review request
          </div>
          <h1
            className={`mb-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-5xl ${verificationLight.title}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            Request verified
          </h1>
          <p className={`max-w-[620px] text-base leading-relaxed ${verificationLight.body}`}>
            Your mailbox is verified for this non-secret fit request. The request
            summary has been routed for operator review.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className={`p-6 md:p-8 ${verificationLight.card}`}>
            <div className={`space-y-5 text-sm leading-relaxed ${verificationLight.body}`}>
              <p className={`text-base ${verificationLight.title}`}>
                No work has started yet. No proof run has started yet.
              </p>
              <p>
                WitnessOps has the non-secret request summary and will reply by
                email after the first fit check.
              </p>
              <p>No customer evidence has been accepted.</p>
              <p>
                Source materials are handled only after scope, fee, and evidence
                handling are agreed.
              </p>
              <p>
                Do not submit secrets, credentials, private keys, MFA codes,
                source exports, full logs, screenshots, or customer evidence until
                the intake path is agreed.
              </p>
            </div>

            <div className="mt-8 border-t border-[#e4e0d8] pt-6">
              <div className={`mb-4 ${verificationLight.label}`}>
                What happens next
              </div>
              <ol className={`space-y-4 text-sm leading-relaxed ${verificationLight.body}`}>
                {nextSteps.map((item, index) => (
                  <li key={item} className="grid grid-cols-[32px_1fr] gap-3">
                    <span
                      className={verificationLight.accent}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <aside className="space-y-4">
            <section className={`p-5 ${verificationLight.card}`}>
              <div className={`mb-3 ${verificationLight.label}`}>Boundary</div>
              <div className={`space-y-2 text-sm leading-relaxed ${verificationLight.body}`}>
                <p>Not a legal audit opinion.</p>
                <p>Not a compliance certification.</p>
                <p>Not a verifier-of-record result.</p>
                <p>Not a proof-run start.</p>
              </div>
            </section>

            <section className={`p-5 ${verificationLight.card}`}>
              <div className={`mb-3 ${verificationLight.label}`}>While you wait</div>
              <div className="space-y-4">
                {waitLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block border border-[#e4e0d8] bg-[#faf9f7] p-3 transition hover:border-[#f27a3d]"
                  >
                    <span className={`block text-sm font-semibold ${verificationLight.title}`}>
                      {item.label}
                    </span>
                    <span className={`mt-1 block text-xs leading-relaxed ${verificationLight.muted}`}>
                      {item.body}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-10">
          <PublicContactRoute subject="fit-check" />
        </div>
      </main>
    </VerificationLightShell>
  );
}
