import { domainToASCII } from 'node:url';
import { ApiError } from './errors';
/** Exact local part, lower-case IDNA domain; no alias guessing. */
export function invitationEmail(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'Enter a recipient email.');
  const parts = value.trim().split('@');
  const domain = parts.length === 2 ? domainToASCII(parts[1]).toLowerCase() : '';
  if (!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}$/.test(parts[0]) || parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..') || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) || domain.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !domain.includes('.') || `${parts[0]}@${domain}`.length > 254) throw new ApiError(400, 'Enter a valid recipient email.');
  return `${parts[0]}@${domain}`;
}
