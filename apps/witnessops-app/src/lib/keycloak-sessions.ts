import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { KeycloakSessionCodec, KeycloakTokenBinding, KeycloakTokenBundle } from "./keycloak-session-codec";

const COOKIE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const SESSION_ID = /^session_([a-f0-9]{64})$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000;
export const KEYCLOAK_SESSION_MAX_AGE_SECONDS = MAX_SESSION_AGE_MS / 1000;

export type KeycloakSessionSnapshot = KeycloakTokenBinding & {
  sessionId: string;
  expiresAt: Date;
  revision: number;
};
export type KeycloakSessionRecord = KeycloakSessionSnapshot & {
  tokensCiphertext: string;
};
export type KeycloakSessionProfile = { email: string | null; displayName: string | null };
export type KeycloakSessionLoad =
  | { status: "authenticated"; session: KeycloakSessionSnapshot; profile: KeycloakSessionProfile }
  | { status: "unauthenticated" }
  | { status: "unavailable" };
export type KeycloakSessionProvider = {
  /** Adapter must validate this response against the configured client and
   * provide email only when the current token says email_verified=true. */
  introspect(accessToken: string): Promise<
    | { status: "active"; issuer: string; subject: string; email?: string | null; displayName?: string | null }
    | { status: "inactive" }
    | { status: "unavailable" }
  >;
  /** Adapter must introspect the refreshed access token and validate client,
   * issuer, subject and verified profile before reporting success. */
  refresh(refreshToken: string): Promise<
    | { status: "ok"; issuer: string; subject: string; tokens: KeycloakTokenBundle;
        email?: string | null; displayName?: string | null }
    | { status: "invalid_grant" }
    | { status: "unavailable" }
  >;
};

type NewSession = KeycloakSessionRecord & { createdAt: Date };
export interface KeycloakSessionRepository {
  insert(session: NewSession): Promise<boolean>;
  findActive(tokenHash: string, at: Date): Promise<KeycloakSessionRecord | null>;
  updateCAS(session: KeycloakSessionSnapshot, ciphertext: string, at: Date): Promise<boolean>;
  /** Atomically writes the shared app tombstone and clears encrypted tokens. */
  revoke(tokenHash: string, expectedRevision?: number): Promise<KeycloakSessionRecord | null>;
}

function hashCookie(value: unknown): string | null {
  if (typeof value !== "string" || !COOKIE_TOKEN.test(value)) return null;
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length !== 32 || bytes.toString("base64url") !== value) return null;
  return createHash("sha256").update(bytes).digest("hex");
}
function sessionId(tokenHash: string): string { return `session_${tokenHash}`; }
function validSubject(subject: unknown): subject is string {
  return typeof subject === "string" && subject.length > 0 && subject.length <= 255
    && !/\s|[\x00-\x1f\x7f]/u.test(subject);
}
function profile(value: { email?: string | null; displayName?: string | null }): KeycloakSessionProfile {
  // The provider adapter supplies email only after checking email_verified.
  // Absent or malformed profile claims never fall back to a stored snapshot.
  const email = typeof value.email === "string" && value.email.length <= 320
    && value.email === value.email.trim() && value.email.includes("@")
    && !/[\x00-\x1f\x7f]/.test(value.email) ? value.email : null;
  const displayName = typeof value.displayName === "string" && value.displayName.length <= 200
    && !/[\x00-\x1f\x7f]/.test(value.displayName) ? value.displayName : null;
  return { email, displayName };
}
function snapshot(row: KeycloakSessionRecord): KeycloakSessionSnapshot {
  return { tokenHash: row.tokenHash, sessionId: row.sessionId, issuer: row.issuer,
    subject: row.subject, userId: row.userId, expiresAt: row.expiresAt, revision: row.revision };
}
function validRecord(row: KeycloakSessionRecord, tokenHash: string, issuer: string, at: Date): boolean {
  return row.tokenHash === tokenHash && row.sessionId === sessionId(tokenHash) && row.issuer === issuer
    && validSubject(row.subject) && UUID.test(row.userId) && Number.isInteger(row.revision)
    && row.revision > 0 && row.expiresAt instanceof Date && Number.isFinite(row.expiresAt.getTime())
    && row.expiresAt > at && typeof row.tokensCiphertext === "string";
}

/** SQL implementation. The additive migration must be applied explicitly before use. */
export class PostgresKeycloakSessionRepository implements KeycloakSessionRepository {
  private readonly connection: Pool | PoolClient;
  private readonly transactionClient: PoolClient | null;
  constructor(pool: Pool);
  constructor(client: PoolClient, options: { callerTransaction: true });
  constructor(connection: Pool | PoolClient, options?: { callerTransaction: true }) {
    this.connection = connection;
    this.transactionClient = options?.callerTransaction ? connection as PoolClient : null;
  }

  async insert(session: NewSession): Promise<boolean> {
    // Only an existing, active internal user with this exact explicit mapping
    // can acquire a new product session. Email is never consulted.
    const result = await this.connection.query(`INSERT INTO keycloak_sessions
      (token_hash,issuer,subject,user_id,tokens_ciphertext,revision,created_at,expires_at)
      SELECT $1,$2,$3,$4,$5,1,$6,$7 FROM users u
      JOIN identity_mappings m ON m.user_id=u.id AND m.provider='keycloak'
        AND m.issuer=$2 AND m.subject=$3
      WHERE u.id=$4 AND u.status='active'
      RETURNING token_hash`, [session.tokenHash, session.issuer, session.subject,
      session.userId, session.tokensCiphertext, session.createdAt, session.expiresAt]);
    return result.rowCount === 1;
  }

  async findActive(tokenHash: string, at: Date): Promise<KeycloakSessionRecord | null> {
    const result = await this.connection.query(`SELECT s.token_hash,s.session_id,s.issuer,s.subject,
        s.user_id,s.tokens_ciphertext,s.revision,s.expires_at
      FROM keycloak_sessions s
      JOIN users u ON u.id=s.user_id AND u.status='active'
      JOIN identity_mappings m ON m.user_id=s.user_id AND m.provider='keycloak'
        AND m.issuer=s.issuer AND m.subject=s.subject
      WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>$2
        AND NOT EXISTS (SELECT 1 FROM revoked_sessions r
          WHERE r.issuer=s.issuer AND r.session_id=s.session_id)`, [tokenHash, at]);
    return result.rows[0] ? fromDbRow(result.rows[0]) : null;
  }

  async updateCAS(session: KeycloakSessionSnapshot, ciphertext: string, at: Date): Promise<boolean> {
    const result = await this.connection.query(`UPDATE keycloak_sessions s
      SET tokens_ciphertext=$1,revision=revision+1
      WHERE s.token_hash=$2 AND s.issuer=$3 AND s.subject=$4 AND s.user_id=$5
        AND s.revision=$6 AND s.revoked_at IS NULL AND s.expires_at>$7
        AND s.revision<2147483646
        AND NOT EXISTS (SELECT 1 FROM revoked_sessions r
          WHERE r.issuer=s.issuer AND r.session_id=s.session_id)
        AND EXISTS (SELECT 1 FROM users u JOIN identity_mappings m
          ON m.user_id=u.id AND m.provider='keycloak' AND m.issuer=s.issuer
          AND m.subject=s.subject WHERE u.id=s.user_id AND u.status='active')
      RETURNING s.revision`, [ciphertext, session.tokenHash, session.issuer,
      session.subject, session.userId, session.revision, at]);
    return result.rowCount === 1;
  }

  async revoke(tokenHash: string, expectedRevision?: number): Promise<KeycloakSessionRecord | null> {
    // A caller-owned transaction must use its own client for every query.
    // Opening a second pool connection here can deadlock under CLI load.
    if (this.transactionClient) return this.revokeWithinTransaction(this.transactionClient, tokenHash, expectedRevision);
    const client = await (this.connection as Pool).connect();
    try {
      await client.query("BEGIN");
      const row = await this.revokeWithinTransaction(client, tokenHash, expectedRevision);
      await client.query("COMMIT");
      return row;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  private async revokeWithinTransaction(client: PoolClient, tokenHash: string,
    expectedRevision?: number): Promise<KeycloakSessionRecord | null> {
    const key = await client.query("SELECT issuer,session_id FROM keycloak_sessions WHERE token_hash=$1", [tokenHash]);
    if (!key.rows[0]) return null;
    // This is the same lock key/namespace as db/sessions.ts. Protected
    // transitions and logout therefore have one database ordering.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,39116))",
      [JSON.stringify([key.rows[0].issuer, key.rows[0].session_id])]);
    const selected = await client.query(`SELECT token_hash,session_id,issuer,subject,user_id,
        tokens_ciphertext,revision,expires_at FROM keycloak_sessions
        WHERE token_hash=$1 AND revoked_at IS NULL
          AND ($2::integer IS NULL OR revision=$2) FOR UPDATE`, [tokenHash, expectedRevision ?? null]);
    if (!selected.rows[0]) return null;
    const row = fromDbRow(selected.rows[0]);
    // The Keycloak subject constraint on this shared table is widened by the
    // immediately following migration. Failure aborts the caller transaction.
    await client.query(`INSERT INTO revoked_sessions(issuer,session_id,subject)
      VALUES($1,$2,$3) ON CONFLICT (issuer,session_id) DO NOTHING`,
    [row.issuer, row.sessionId, row.subject]);
    await client.query(`UPDATE keycloak_sessions SET revoked_at=now(),
      tokens_ciphertext=NULL,revision=LEAST(revision+1,2147483646)
      WHERE token_hash=$1`, [tokenHash]);
    return row;
  }
}

function fromDbRow(row: Record<string, unknown>): KeycloakSessionRecord {
  return { tokenHash: row.token_hash as string, sessionId: row.session_id as string,
    issuer: row.issuer as string, subject: row.subject as string, userId: row.user_id as string,
    tokensCiphertext: row.tokens_ciphertext as string, revision: row.revision as number,
    expiresAt: row.expires_at as Date };
}

/** Bounded server-side session lifecycle. The browser receives only cookieToken. */
export class KeycloakSessionStore {
  constructor(private readonly repository: KeycloakSessionRepository,
    private readonly codec: KeycloakSessionCodec,
    private readonly now: () => Date = () => new Date()) {}

  async create(input: { issuer: string; subject: string; userId: string;
    tokens: KeycloakTokenBundle; expiresAt: Date }): Promise<{
      cookieToken: string; session: KeycloakSessionSnapshot;
    }> {
    const createdAt = this.now();
    if (input.issuer !== this.codec.issuer || !validSubject(input.subject) || !UUID.test(input.userId)
      || !(input.expiresAt instanceof Date) || !Number.isFinite(input.expiresAt.getTime())
      || input.expiresAt.getTime() <= createdAt.getTime()
      || input.expiresAt.getTime() > createdAt.getTime() + MAX_SESSION_AGE_MS) {
      throw new Error("Keycloak session binding is invalid");
    }
    const cookieToken = randomBytes(32).toString("base64url");
    const tokenHash = hashCookie(cookieToken)!;
    const row: NewSession = { tokenHash, sessionId: sessionId(tokenHash), issuer: input.issuer,
      subject: input.subject, userId: input.userId, expiresAt: input.expiresAt,
      revision: 1, createdAt,
      tokensCiphertext: this.codec.seal(input.tokens, { tokenHash, issuer: input.issuer,
        subject: input.subject, userId: input.userId }) };
    if (!await this.repository.insert(row)) throw new Error("Keycloak identity is not linked to an active user");
    return { cookieToken, session: snapshot(row) };
  }

  async updateCAS(session: KeycloakSessionSnapshot, tokens: KeycloakTokenBundle): Promise<boolean> {
    if (session.issuer !== this.codec.issuer || session.sessionId !== sessionId(session.tokenHash)
      || !Number.isInteger(session.revision) || session.revision < 1) throw new Error("Keycloak session binding is invalid");
    const ciphertext = this.codec.seal(tokens, session);
    return this.repository.updateCAS(session, ciphertext, this.now());
  }

  async load(cookieToken: unknown, provider: KeycloakSessionProvider): Promise<KeycloakSessionLoad> {
    const tokenHash = hashCookie(cookieToken);
    if (!tokenHash) return { status: "unauthenticated" };
    return this.loadHash(tokenHash, provider);
  }

  /** For CLI parent checks only, after the CLI credential and web issuer have
   * already been validated. A session ID is not browser possession proof. */
  async loadBySessionId(value: unknown, provider: KeycloakSessionProvider): Promise<KeycloakSessionLoad> {
    if (typeof value !== "string") return { status: "unauthenticated" };
    const match = SESSION_ID.exec(value);
    if (!match) return { status: "unauthenticated" };
    return this.loadHash(match[1], provider);
  }

  private async loadHash(tokenHash: string, provider: KeycloakSessionProvider): Promise<KeycloakSessionLoad> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const at = this.now();
      const row = await this.repository.findActive(tokenHash, at);
      if (!row) return { status: "unauthenticated" };
      if (!validRecord(row, tokenHash, this.codec.issuer, at)) {
        await this.repository.revoke(tokenHash);
        return { status: "unauthenticated" };
      }
      let opened: ReturnType<KeycloakSessionCodec["open"]>;
      try { opened = this.codec.open(row.tokensCiphertext, row); }
      catch {
        if (await this.repository.revoke(tokenHash, row.revision)) return { status: "unauthenticated" };
        continue;
      }
      let check: Awaited<ReturnType<KeycloakSessionProvider["introspect"]>>;
      try { check = await provider.introspect(opened.tokens.access_token); }
      catch { return { status: "unavailable" }; }
      if (!check || typeof check !== "object" || !("status" in check)) return { status: "unavailable" };
      if (check.status === "unavailable") return { status: "unavailable" };
      if (check.status === "active") {
        if (typeof check.issuer !== "string" || typeof check.subject !== "string") return { status: "unavailable" };
        if (check.issuer !== row.issuer || check.subject !== row.subject) {
          if (await this.repository.revoke(tokenHash, row.revision)) return { status: "unauthenticated" };
          continue;
        }
        if (opened.needsRewrap) {
          let changed: boolean;
          try { changed = await this.updateCAS(snapshot(row), opened.tokens); }
          catch { return { status: "unavailable" }; }
          if (!changed) continue;
        }
        const current = await this.repository.findActive(tokenHash, this.now());
        if (!current) return { status: "unauthenticated" };
        if (current.revision !== row.revision + Number(opened.needsRewrap)) continue;
        return { status: "authenticated", session: snapshot(current), profile: profile(check) };
      }
      if (check.status !== "inactive") return { status: "unavailable" };
      let refreshed: Awaited<ReturnType<KeycloakSessionProvider["refresh"]>>;
      try { refreshed = await provider.refresh(opened.tokens.refresh_token); }
      catch { return { status: "unavailable" }; }
      if (!refreshed || typeof refreshed !== "object" || !("status" in refreshed)) return { status: "unavailable" };
      if (refreshed.status === "unavailable") return { status: "unavailable" };
      if (refreshed.status === "invalid_grant") {
        // The revision condition is checked under the same transaction/lock
        // as the tombstone write. A concurrent successful rotation wins safely.
        if (await this.repository.revoke(tokenHash, row.revision)) return { status: "unauthenticated" };
        const current = await this.repository.findActive(tokenHash, this.now());
        if (current) continue;
        return { status: "unauthenticated" };
      }
      if (refreshed.status !== "ok") return { status: "unavailable" };
      if (typeof refreshed.issuer !== "string" || typeof refreshed.subject !== "string") return { status: "unavailable" };
      if (refreshed.issuer !== row.issuer || refreshed.subject !== row.subject) {
        if (await this.repository.revoke(tokenHash, row.revision)) return { status: "unauthenticated" };
        continue;
      }
      let changed: boolean;
      try { changed = await this.updateCAS(snapshot(row), refreshed.tokens); }
      catch { return { status: "unavailable" }; }
      if (!changed) continue;
      const current = await this.repository.findActive(tokenHash, this.now());
      if (!current) return { status: "unauthenticated" };
      if (current.revision !== row.revision + 1) continue;
      return { status: "authenticated", session: snapshot(current), profile: profile(refreshed) };
    }
    return { status: "unavailable" };
  }

  /** Caller clears the cookie after success and may use the ID token as a
   * fixed-client RP-Initiated Logout hint. No provider action occurs here. */
  async revoke(cookieToken: unknown): Promise<string | null> {
    const tokenHash = hashCookie(cookieToken);
    if (!tokenHash) return null;
    const row = await this.repository.revoke(tokenHash);
    if (!row) return null;
    try { return this.codec.open(row.tokensCiphertext, row).tokens.id_token; }
    catch { return null; }
  }
}
