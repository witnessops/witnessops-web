"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { verificationLight } from "@/components/shared/verification-light-shell";
import type { VerifyTokenResponse } from "@/lib/token-contract";
import {
  formatInitialVerificationCode,
  formatVerificationCode,
} from "@/lib/verification-code-format";

type Props =
  | { context: string; issuanceId?: never; email?: never }
  | { context?: never; issuanceId: string; email: string };

export function verificationRequestBody(props: Props, token: string) {
  return "context" in props
    ? { context: props.context, token }
    : { issuanceId: props.issuanceId, email: props.email, token };
}

function buildRedirectUrl(payload: VerifyTokenResponse): string {
  return payload.postVerifyPath;
}

export function VerifyTokenForm(props: Props) {
  const router = useRouter();
  const [code, setCode] = useState(formatInitialVerificationCode(""));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/verify-token", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verificationRequestBody(props, code)),
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<VerifyTokenResponse> & { error?: string })
        | null;

      if (
        !response.ok ||
        !payload?.issuanceId ||
        !payload.email ||
        !payload.postVerifyPath
      ) {
        setError(payload?.error ?? "Verification failed.");
        return;
      }

      router.replace(buildRedirectUrl(payload as VerifyTokenResponse));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <div className={verificationLight.label}>Email</div>
        <div className={`mt-1 text-sm ${verificationLight.title}`}>
          The mailbox that received this verification message
        </div>
      </div>
      <div>
        <label
          htmlFor="verification-code"
          className={verificationLight.label}
        >
          Verification code
        </label>
        <input
          id="verification-code"
          name="verification-code"
          value={code}
          onChange={(event) => {
            setCode(formatVerificationCode(event.currentTarget.value));
            setError(null);
          }}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          required
          maxLength={80}
          placeholder="ABCD-EFGH-JKLM"
          className={`mt-2 ${verificationLight.input}`}
        />
        <p className={`mt-2 text-xs leading-5 ${verificationLight.muted}`}>
          Enter the code exactly as shown in the email. Do not share this code.
        </p>
      </div>
      {error ? (
        <div className={verificationLight.error}>{error}</div>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className={verificationLight.button}
      >
        {isSubmitting ? "Verifying..." : "Verify code"}
      </button>
    </form>
  );
}
