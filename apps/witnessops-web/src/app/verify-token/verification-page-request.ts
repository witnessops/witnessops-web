import { verifyTokenLegacyPageSchema } from "@/lib/token-contract";

export type VerificationPageRequest =
  | { context: string }
  | { issuanceId: string; email: string };

export function resolveVerificationPageRequest(params: {
  context?: string;
  issuanceId?: string;
  email?: string;
}): VerificationPageRequest | null {
  const context = params.context?.trim() ?? "";
  if (/^[A-Za-z0-9_-]{32,128}$/.test(context)) {
    return { context };
  }

  const legacy = verifyTokenLegacyPageSchema.safeParse({
    issuanceId: params.issuanceId,
    email: params.email,
  });
  return legacy.success ? legacy.data : null;
}
