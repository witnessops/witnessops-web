import type { Metadata } from "next";
import Link from "next/link";
import {
  VerificationLightShell,
  verificationLight,
} from "@/components/shared/verification-light-shell";

export const metadata: Metadata = {
  title: "Payment next steps",
  description:
    "WitnessOps confirms payment and engagement next steps by email after Stripe Dashboard reconciliation.",
  alternates: { canonical: "/payment/success" },
  robots: { index: false, follow: false },
};

const nextSteps = [
  "WitnessOps reconciles the Stripe payment record with the accepted engagement.",
  "We confirm payment and the agreed next step by email.",
  "Work begins only after payment, accepted SOW, written authority, scope freeze, required inputs, and the collection window are confirmed.",
];

export default function PaymentSuccessPage() {
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
            Payment checkout
          </div>
          <h1
            className={`mb-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-5xl ${verificationLight.title}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            Thank you
          </h1>
          <p className={`max-w-[620px] text-base leading-relaxed ${verificationLight.body}`}>
            Stripe has returned you to WitnessOps. We confirm payment and next
            steps by email after reconciling the Stripe record with your accepted
            engagement.
          </p>
        </section>

        <section className={`max-w-[720px] p-6 md:p-8 ${verificationLight.card}`}>
          <p className={`text-base ${verificationLight.title}`}>
            This page does not confirm payment, accepted scope, authority, or the
            start of work.
          </p>

          <div className="mt-8 border-t border-[#e4e0d8] pt-6">
            <div className={`mb-4 ${verificationLight.label}`}>What happens next</div>
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

          <p className={`mt-8 text-sm leading-relaxed ${verificationLight.body}`}>
            Do not send passwords, private keys, API keys, recovery codes, session
            tokens, or customer evidence until WitnessOps confirms the agreed
            handling route.
          </p>
        </section>

        <nav className="mt-8 flex flex-wrap gap-4" aria-label="Payment next steps">
          <Link
            href="/catalog/offsec-external-exposure"
            className="text-sm font-semibold text-text-primary underline underline-offset-4 hover:text-brand-accent"
          >
            Review the offer
          </Link>
          <Link
            href="/support"
            className="text-sm font-semibold text-text-primary underline underline-offset-4 hover:text-brand-accent"
          >
            Support
          </Link>
        </nav>
      </main>
    </VerificationLightShell>
  );
}
