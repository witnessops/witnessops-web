import type { Metadata } from "next";

import { VerifyTokenForm } from "./verify-token-form";

export const metadata: Metadata = {
  title: "Verify Mailbox",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    issuanceId?: string;
    email?: string;
    token?: string;
  }>;
}

export default async function VerifyTokenPage({ searchParams }: Props) {
  const params = await searchParams;
  const issuanceId = params.issuanceId?.trim() ?? "";
  const email = params.email?.trim() ?? "";
  const token = params.token?.trim() ?? "";
  const hasVerificationContext = Boolean(issuanceId && email);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-zinc-500">
          WitnessOps Mailbox Verification
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          Enter verification code
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Type the code from the WitnessOps email. Continue only if you
          requested this verification message.
        </p>

        <div className="mt-8 rounded border border-zinc-800 bg-zinc-950 p-4">
          {hasVerificationContext ? (
            <VerifyTokenForm
              issuanceId={issuanceId}
              email={email}
              initialCode={token}
            />
          ) : (
            <div className="text-sm text-red-300">
              This verification page is missing the request context. Open the
              verification page from the email and type the code shown there.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
