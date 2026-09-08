import { domainToASCII } from 'node:url';
import { isIP } from 'node:net';

export class UnsafeTargetError extends Error {
  readonly code = 'unsafe_target';
  constructor(message = 'The hostname must resolve only to public internet addresses.') {
    super(message);
    this.name = 'UnsafeTargetError';
  }
}

const RESERVED_SUFFIXES = ['localhost', 'local', 'internal', 'intranet', 'home', 'lan', 'invalid', 'test', 'example', 'onion', 'alt', 'arpa'];

/** Accept a hostname only. URL credentials, paths, ports, IPs and local names are not targets. */
export function normalizeExternalHostname(input: unknown): string {
  if (typeof input !== 'string' || input.length > 512) throw new UnsafeTargetError('Enter a public hostname.');
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || /[\s/@:#?\\\[\]%]/u.test(trimmed)) throw new UnsafeTargetError('Enter a hostname without a scheme, path, port or credentials.');
  const withoutDot = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
  const hostname = domainToASCII(withoutDot);
  if (!hostname || hostname.length > 253 || isIP(hostname)) throw new UnsafeTargetError('Enter a public hostname, not an IP address.');
  const labels = hostname.split('.');
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))) {
    throw new UnsafeTargetError('Enter a valid public hostname.');
  }
  if (/^\d+$/u.test(labels.at(-1)!)) throw new UnsafeTargetError('Enter a public hostname, not an IP address.');
  if (RESERVED_SUFFIXES.some(suffix => hostname === suffix || hostname.endsWith(`.${suffix}`))) {
    throw new UnsafeTargetError('Local and reserved hostnames cannot be checked.');
  }
  return hostname;
}
