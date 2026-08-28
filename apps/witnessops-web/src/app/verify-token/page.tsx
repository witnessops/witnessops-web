import type { Metadata } from "next";

import {
  VerificationLightShell,
  verificationLight,
} from "@/components/shared/verification-light-shell";
import { VerifyTokenForm } from "./verify-token-form";
import { resolveVerificationPageRequest } from "./verification-page-request";

export const metadata: Metadata = {
  title: "Verify Mailbox",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  searchParams: Promise<{
    context?: string;
    issuanceId?: string;
    email?: string;
  }>;
}

export default async function VerifyTokenPage({ searchParams }: Props) {
  const params = await searchParams;
  const verificationRequest = resolveVerificationPageRequest(params);

  return (
    <VerificationLightShell>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12"
      >
        <div className={`mb-2 ${verificationLight.label} ${verificationLight.trust}`}>
          WitnessOps mailbox verification
        </div>
        <h1 className={`text-2xl font-semibold ${verificationLight.title}`}>
          Enter verification code
        </h1>
        <p className={`mt-3 text-sm leading-6 ${verificationLight.body}`}>
          Type the code from the WitnessOps email. Continue only if you
          requested this verification message.
        </p>
        <p className={`mt-3 text-sm leading-6 ${verificationLight.muted}`}>
          This confirms mailbox access only. It does not start a proof run,
          accept customer evidence, confirm scope, or approve evidence handling.
        </p>

        <div className={`mt-8 rounded p-4 ${verificationLight.card}`}>
          {verificationRequest ? (
            <VerifyTokenForm {...verificationRequest} />
          ) : (
            <div className={verificationLight.error}>
              This verification page is missing the request context. Open the
              verification page from the email and type the code shown there.
            </div>
          )}
        </div>
      </main>
    </VerificationLightShell>
  );
}
