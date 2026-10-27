import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { RESPONSE_UNCLEAR, boundedJsonRequest } from '../commands.mjs';
import { serverOrigin } from '../storage.mjs';

// Thin public intake. tools/witnessops-security-validators is a separate
// structure-only lane and is not called from this command.
// Public new-sales identity. Kept aligned with PUBLIC_AGENT_ACTION_OFFER.id.
export const AGENT_ACTION_REVIEW_INTENT = 'agent-action-security-review';
export const DEFAULT_REVIEW_ORIGIN = 'https://witnessops.com';
// Same sentence as the Agent Action Security Review preparation prompt.
export const SCOPE_PROMPT = 'Name the consequential agent or automation action, the systems it can affect and the decision deadline. Do not send credentials, secrets or production data in this form.';
const SHORT_TEXT_MAX = 240;
const SCOPE_MAX = 8_000;
const FREEMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  'mail.com',
  'yandex.com',
  'live.com',
]);
const SAFE_ERRORS = new Set([
  'Email address is invalid.',
  'Name is invalid.',
  'Organisation is invalid.',
  'Locale is invalid.',
  'Review request details is invalid.',
  'Selected request is not available for a new review.',
  'Please use your business email.',
  'Request details are invalid.',
  'Request body is too large.',
  'Rate limit exceeded',
]);

export const reviewHelp = `Usage:
  wops review request [--server URL]

Sends one non-secret fit check for Agent Action Security Review.
Intent is fixed to agent-action-security-review. Use HTTPS, or HTTP on
127.0.0.1. The default server is https://witnessops.com.

Prompts for name, business email, optional organisation, locale (en or pl),
and one scope note: the consequential action, the systems it can affect, and
the decision deadline.

A submitted request is not a booking, a payment, or permission to start work.
It does not report findings, an authority map, fixes, receipt checks, or proof.
It does not read or upload local observation records, MCP configuration,
credentials, or production evidence. Mailbox verification continues after a
successful request.`;

const control = /[\x00-\x1f\x7f-\x9f]/;

function requiredLine(value, label, max) {
  const text = String(value ?? '').trim();
  if (!text || text.length > max || control.test(text)) throw new Error(`${label} is invalid.`);
  return text;
}

function optionalLine(value, label, max) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.length > max || control.test(text)) throw new Error(`${label} is invalid.`);
  return text;
}

function businessEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  const domain = email.split('@')[1] ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > SHORT_TEXT_MAX || domain !== email.slice(email.indexOf('@') + 1)) {
    throw new Error('Email address is invalid.');
  }
  if (FREEMAIL_DOMAINS.has(domain)) throw new Error('Please use your business email.');
  return email;
}

function localeCode(value) {
  const locale = String(value ?? '').trim().toLowerCase();
  if (locale === 'en' || locale === 'pl') return locale;
  throw new Error('Use locale en or pl.');
}

export function buildReviewRequestBody({ name, email, org, locale, scope }) {
  const body = {
    email: businessEmail(email),
    name: requiredLine(name, 'Name', SHORT_TEXT_MAX),
    intent: AGENT_ACTION_REVIEW_INTENT,
    locale: localeCode(locale),
    scope: requiredLine(scope, 'Scope', SCOPE_MAX),
  };
  const organisation = optionalLine(org, 'Organisation', SHORT_TEXT_MAX);
  if (organisation) body.org = organisation;
  return {
    email: body.email,
    name: body.name,
    ...(body.org ? { org: body.org } : {}),
    intent: body.intent,
    locale: body.locale,
    scope: body.scope,
  };
}

function knownError(data) {
  const error = data && typeof data.error === 'string' ? data.error : '';
  if (error === 'Rate limit exceeded') return 'Rate limit exceeded. Try again later.';
  return SAFE_ERRORS.has(error) ? error : 'Review request was not accepted. Try again.';
}

function issuance(data, email) {
  return Boolean(data
    && data.channel === 'engage'
    && data.status === 'issued'
    && data.admissionState === 'verification_sent'
    && data.email === email
    && typeof data.issuanceId === 'string'
    && data.issuanceId.length > 0
    && data.issuanceId.length <= SHORT_TEXT_MAX
    && Number.isFinite(Date.parse(data.expiresAt)));
}

async function promptFields(ask) {
  if (ask) {
    return {
      name: await ask('Name: '),
      email: await ask('Business email: '),
      org: await ask('Organisation (optional): '),
      locale: await ask('Locale (en or pl): '),
      scope: await ask(`${SCOPE_PROMPT}\nScope: `),
    };
  }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return {
      name: await rl.question('Name: '),
      email: await rl.question('Business email: '),
      org: await rl.question('Organisation (optional): '),
      locale: await rl.question('Locale (en or pl): '),
      scope: await rl.question(`${SCOPE_PROMPT}\nScope: `),
    };
  } finally {
    rl.close();
  }
}

function reviewServer(args) {
  if (args.length === 2) return serverOrigin(DEFAULT_REVIEW_ORIGIN);
  if (args.length === 4 && args[2] === '--server') return serverOrigin(args[3]);
  throw new Error('Use wops review request --help.');
}

export async function reviewCommand(args, options = {}) {
  const output = options.output ?? console.log;
  if ((args.length === 2 && ['help', '--help', '-h'].includes(args[1]))
    || (args.length === 3 && args[1] === 'request' && ['help', '--help', '-h'].includes(args[2]))) {
    output(reviewHelp);
    return 0;
  }
  if (args[0] !== 'review' || args[1] !== 'request') throw new Error('Use wops review request --help.');
  const server = reviewServer(args);
  const body = buildReviewRequestBody(await promptFields(options.ask));
  let result;
  try {
    result = await boundedJsonRequest(options.fetch ?? fetch, `${server}/api/review/request`, {
      method: 'POST',
      headers: { Origin: server, 'Content-Type': 'application/json' },
      body,
    });
  } catch (error) {
    if (error?.code === RESPONSE_UNCLEAR) {
      throw new Error('The server responded but the result is unclear. The review request may have been received. Check your mailbox and do not retry immediately.');
    }
    throw new Error('Server unreachable. The review request was not sent. Try again.');
  }
  if (!result.ok) {
    output(knownError(result.data));
    return 1;
  }
  if (!issuance(result.data, body.email)) {
    throw new Error('Verification was issued, but the response was incomplete. Check your email before trying again.');
  }
  output([
    'Verification email sent.',
    `Email: ${body.email}`,
    'Status: issued',
    'Admission: verification_sent',
    `Expires: ${result.data.expiresAt}`,
    'Mailbox verification does not start a review. This request is not a booking, a payment, or permission to start work.',
  ].join('\n'));
  return 0;
}
