/** Only this same-origin path may be sealed into the hosted auth return state. */
export function invitationReturn(value: string | null): string {
  return value && /^\/invitations\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value) ? value : '/';
}
