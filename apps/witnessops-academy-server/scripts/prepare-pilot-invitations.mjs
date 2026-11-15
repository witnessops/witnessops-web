#!/usr/bin/env node
// Captured synthetic email only. This command has no outbound mail capability.
import { mkdir, lstat, realpath, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createInvitationBatch, renderCapturedInvitationEmail, revokeInvitation, validateInvitationBatch,
} from '../src/pilot-invitations.mjs';

function parseArgs(args) {
  const parsed = { apply: false, synthetic: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') parsed.help = true;
    else if (arg === '--apply') parsed.apply = true;
    else if (arg === '--synthetic') parsed.synthetic = true;
    else if (['--batch', '--database-config', '--capture-dir'].includes(arg)) {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('invalid_arguments');
      const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (parsed[key]) throw new Error('duplicate_argument');
      parsed[key] = args[++index];
    } else throw new Error('invalid_arguments');
  }
  return parsed;
}

async function privateFile(file) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.uid !== process.getuid()
    || (info.mode & 0o077) !== 0) throw new Error('private_file_required');
  if (await realpath(file) !== path.resolve(file)) throw new Error('symlink_path_not_allowed');
  return readFile(file, 'utf8');
}

async function privateDirectory(directory) {
  const resolved = path.resolve(directory);
  await mkdir(resolved, { recursive: true, mode: 0o700 });
  const info = await lstat(resolved);
  if (!info.isDirectory() || info.isSymbolicLink() || info.uid !== process.getuid()
    || (info.mode & 0o077) !== 0 || await realpath(resolved) !== resolved) {
    throw new Error('private_capture_directory_required');
  }
  return resolved;
}

export async function preparePilotInvitationCapture(argv, {
  output = (value) => process.stdout.write(String(value) + '\n'),
  errorOutput = (value) => process.stderr.write(String(value) + '\n'),
} = {}) {
let operator;
let issued = [];
try {
  const args = parseArgs(argv);
  if (args.help) {
    output('Prepare captured synthetic Academy invitations; default is validation only.');
    output('node scripts/prepare-pilot-invitations.mjs --batch PRIVATE_BATCH_JSON');
    output('node scripts/prepare-pilot-invitations.mjs --batch PRIVATE_BATCH_JSON --database-config PRIVATE_DISPOSABLE_DB_JSON --capture-dir PRIVATE_DIRECTORY --synthetic --apply');
    output('Batch: recipients[{issuer,subject,deliveryEmail}], approvalReference, administratorReference, academyOrigin, optional expiresInSeconds.');
    output('Apply is restricted to an explicitly disposable loopback PostgreSQL profile and .invalid captured recipients. No real mail is sent.');
    return 0;
  }
  if (!args.batch) throw new Error('batch_file_required');
  const raw = JSON.parse(await privateFile(args.batch));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
    || Object.keys(raw).some((key) => !['recipients', 'approvalReference', 'administratorReference', 'academyOrigin', 'expiresInSeconds'].includes(key))
    || !Array.isArray(raw.recipients)) throw new Error('invalid_batch');
  const recipients = raw.recipients.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)
      || Object.keys(item).some((key) => !['issuer', 'subject', 'deliveryEmail'].includes(key))) {
      throw new Error('invalid_batch');
    }
    return { issuer: item.issuer, subject: item.subject };
  });
  const batch = validateInvitationBatch({
    recipients, approvalReference: raw.approvalReference,
    administratorReference: raw.administratorReference,
    ...(raw.expiresInSeconds === undefined ? {} : { expiresInSeconds: raw.expiresInSeconds }),
  });
  // Validate captured-recipient and origin restrictions before any database connection.
  const placeholder = Buffer.alloc(32).toString('base64url');
  for (const recipient of raw.recipients) {
    renderCapturedInvitationEmail({
      token: placeholder, academyOrigin: raw.academyOrigin, recipientEmail: recipient.deliveryEmail,
    });
  }
  if (!args.apply) {
    output(JSON.stringify({
      state: 'PREPARED_DRY_RUN', recipients: recipients.length, course: 'verify-results-pilot',
      grant: 'approved_free', role: 'learner', delivery: 'captured_synthetic_only',
      databaseConnected: false, filesCreated: false, invitationsIssued: false,
    }));
    return 0;
  }
  if (!args.synthetic || !args.databaseConfig || !args.captureDir) throw new Error('synthetic_apply_arguments_required');
  const config = JSON.parse(await privateFile(args.databaseConfig));
  if (config.disposable !== true || config.profile !== 'academy-invitations-disposable'
    || !['127.0.0.1', 'localhost', '::1'].includes(config.host)
    || !Number.isSafeInteger(config.port) || !config.database
    || !config.user || ['academy_app', 'academy_mcp'].includes(config.user)
    || !config.passwordFile || config.password !== undefined || config.connectionString !== undefined) {
    throw new Error('disposable_operator_profile_required');
  }
  const captureDir = await privateDirectory(args.captureDir);
  const pg = (await import('pg')).default;
  operator = new pg.Pool({
    host: config.host, port: config.port, database: config.database, user: config.user,
    password: (await privateFile(config.passwordFile)).trim(),
    connectionTimeoutMillis: 5000, max: 1,
  });
  const result = await createInvitationBatch(operator, batch);
  issued = result.invitations;
  const captures = [];
  for (let index = 0; index < issued.length; index += 1) {
    const invitation = issued[index];
    const email = renderCapturedInvitationEmail({
      token: invitation.token, academyOrigin: raw.academyOrigin,
      recipientEmail: raw.recipients[index].deliveryEmail,
    });
    const filename = invitation.invitationId + '.eml';
    const mail = [
      'To: ' + email.to, 'Subject: ' + email.subject,
      'X-WitnessOps-Delivery: captured-synthetic-not-sent',
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', '',
      email.text.replace(/\r?\n/g, '\r\n'),
    ].join('\r\n');
    await writeFile(path.join(captureDir, filename), mail, { flag: 'wx', mode: 0o600 });
    captures.push({
      invitationId: invitation.invitationId, expiresAt: invitation.expiresAt,
      courseId: invitation.courseId, accessKind: invitation.accessKind, role: invitation.role, filename,
    });
  }
  await writeFile(path.join(captureDir, 'receipt.json'), JSON.stringify({
    state: 'CAPTURED_SYNTHETIC', createdAt: new Date().toISOString(),
    approvalReference: batch.approvalReference, administratorReference: batch.administratorReference,
    delivery: 'not_sent', invitations: captures,
  }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  output(JSON.stringify({ state: 'CAPTURED_SYNTHETIC', count: captures.length, delivery: 'not_sent' }));
  return 0;
} catch (error) {
  // If capture fails after issuance, invalidate every undisclosed invitation; preserve files as evidence.
  let revocationFailures = 0;
  if (operator && issued.length) {
    for (const invitation of issued) {
      try {
        await revokeInvitation(operator, {
          invitationId: invitation.invitationId, administratorReference: 'synthetic-capture-failed-automatic-invalidation',
        });
      } catch { revocationFailures += 1; }
    }
  }
  const code = typeof error?.code === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(error.code)
    ? error.code : /^[A-Za-z0-9_]{1,64}$/.test(error?.message ?? '') ? error.message : 'operator_preparation_failed';
  errorOutput(JSON.stringify({ state: 'FAILED', error: code, delivery: 'not_sent', revocationFailures, invitationsMayRemainActive: revocationFailures > 0 }));
  return 1;
} finally {
  if (operator) await operator.end();
}

}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await preparePilotInvitationCapture(process.argv.slice(2));
}
