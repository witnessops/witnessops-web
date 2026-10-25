export const APP_FORM_ACTION: "form-action 'self' https://api.workos.com";
export const APP_REFERRER_POLICY: "no-referrer";
export const SHARED_FORM_ACTION: "form-action 'self'";

export function createCspNonce(): string;
export function extendFormAction(policy: string): string;
export function appReportOnlyContentSecurityPolicy(nonce: string): string;
export function appSecurityHeaders(
  source?: ReadonlyArray<{ key: string; value: string }>,
): { key: string; value: string }[];
