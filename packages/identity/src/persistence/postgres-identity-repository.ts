import type { SqlExecutor } from '@taymex/data-postgres';
import type { Account } from '../account.js';
import type {
  IdentityChallenge,
  IdentityChallengeKind,
  IdentityRepository,
  PasswordCredential,
} from '../contracts.js';
import type { SessionRecord } from '../session.js';

export class PostgresIdentityRepository implements IdentityRepository {
  constructor(private readonly db: SqlExecutor) {}

  async findAccountById(id: string): Promise<Account | null> {
    const result = await this.db.query<AccountRow>(`${ACCOUNT_SELECT} WHERE id = $1`, [id]);
    return result.rows[0] ? accountFromRow(result.rows[0]) : null;
  }

  async findAccountByNormalizedEmail(normalizedEmail: string): Promise<Account | null> {
    const result = await this.db.query<AccountRow>(`${ACCOUNT_SELECT} WHERE normalized_email = $1`, [normalizedEmail]);
    return result.rows[0] ? accountFromRow(result.rows[0]) : null;
  }

  async createAccount(account: Account): Promise<'created' | 'duplicate-email'> {
    const result = await this.db.query(
      `INSERT INTO identity_accounts
        (id, email, normalized_email, status, email_verified_at, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (normalized_email) DO NOTHING
       RETURNING id`,
      [account.id, account.email, account.normalizedEmail, account.status, account.emailVerifiedAt, account.version, account.createdAt, account.updatedAt],
    );
    return result.rowCount === 1 ? 'created' : 'duplicate-email';
  }

  async replaceAccountIfVersionMatches(account: Account, expectedVersion: number): Promise<'updated' | 'version-conflict'> {
    const result = await this.db.query(
      `UPDATE identity_accounts
          SET email=$2, normalized_email=$3, status=$4, email_verified_at=$5, version=$6, updated_at=$7
        WHERE id=$1 AND version=$8
        RETURNING id`,
      [account.id, account.email, account.normalizedEmail, account.status, account.emailVerifiedAt, account.version, account.updatedAt, expectedVersion],
    );
    return result.rowCount === 1 ? 'updated' : 'version-conflict';
  }

  async findPasswordCredential(accountId: string): Promise<PasswordCredential | null> {
    const result = await this.db.query<CredentialRow>(
      `SELECT account_id, password_hash, changed_at, version FROM identity_password_credentials WHERE account_id=$1`,
      [accountId],
    );
    const row = result.rows[0];
    return row ? Object.freeze({ accountId: row.account_id, passwordHash: row.password_hash, changedAt: date(row.changed_at), version: row.version }) : null;
  }

  async replacePasswordCredential(credential: PasswordCredential): Promise<void> {
    const result = await this.db.query(
      `WITH updated AS (
         UPDATE identity_password_credentials
            SET password_hash=$2, changed_at=$3, version=$4
          WHERE account_id=$1 AND version=$4-1
          RETURNING account_id
       ), inserted AS (
         INSERT INTO identity_password_credentials (account_id, password_hash, changed_at, version)
         SELECT $1,$2,$3,$4
          WHERE $4=1 AND NOT EXISTS (SELECT 1 FROM updated)
         ON CONFLICT (account_id) DO NOTHING
         RETURNING account_id
       )
       SELECT account_id FROM updated
       UNION ALL
       SELECT account_id FROM inserted`,
      [credential.accountId, credential.passwordHash, credential.changedAt, credential.version],
    );
    if (result.rowCount !== 1) throw new Error('Password credential version conflict.');
  }

  async createSession(session: SessionRecord): Promise<void> {
    await this.db.query(
      `INSERT INTO identity_sessions
        (id, account_id, token_hash, assurance, client_label, created_at, expires_at, rotated_at, revoked_at, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [session.id, session.accountId, session.tokenHash, session.assurance, session.clientLabel, session.createdAt, session.expiresAt, session.rotatedAt, session.revokedAt, session.version],
    );
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const result = await this.db.query<SessionRow>(`${SESSION_SELECT} WHERE token_hash=$1`, [tokenHash]);
    return result.rows[0] ? sessionFromRow(result.rows[0]) : null;
  }

  async replaceSessionIfVersionMatches(session: SessionRecord, expectedVersion: number): Promise<'updated' | 'version-conflict'> {
    const result = await this.db.query(
      `UPDATE identity_sessions
          SET token_hash=$2, assurance=$3, client_label=$4, expires_at=$5, rotated_at=$6, revoked_at=$7, version=$8
        WHERE id=$1 AND version=$9
        RETURNING id`,
      [session.id, session.tokenHash, session.assurance, session.clientLabel, session.expiresAt, session.rotatedAt, session.revokedAt, session.version, expectedVersion],
    );
    return result.rowCount === 1 ? 'updated' : 'version-conflict';
  }

  async listSessionsForAccount(accountId: string): Promise<readonly SessionRecord[]> {
    const result = await this.db.query<SessionRow>(`${SESSION_SELECT} WHERE account_id=$1 ORDER BY created_at DESC, id`, [accountId]);
    return Object.freeze(result.rows.map(sessionFromRow));
  }

  async revokeAllSessionsForAccount(accountId: string, revokedAt: Date, exceptSessionId?: string): Promise<number> {
    const result = await this.db.query(
      `UPDATE identity_sessions
          SET revoked_at=$2, version=version+1
        WHERE account_id=$1 AND revoked_at IS NULL AND ($3::uuid IS NULL OR id <> $3::uuid)`,
      [accountId, revokedAt, exceptSessionId ?? null],
    );
    return result.rowCount;
  }

  async createChallenge(challenge: IdentityChallenge): Promise<void> {
    await this.db.query(
      `INSERT INTO identity_challenges
        (id, kind, account_id, token_hash, created_at, expires_at, consumed_at, version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [challenge.id, challenge.kind, challenge.accountId, challenge.tokenHash, challenge.createdAt, challenge.expiresAt, challenge.consumedAt, challenge.version],
    );
  }

  async findChallengeByTokenHash(kind: IdentityChallengeKind, tokenHash: string): Promise<IdentityChallenge | null> {
    const result = await this.db.query<ChallengeRow>(`${CHALLENGE_SELECT} WHERE kind=$1 AND token_hash=$2`, [kind, tokenHash]);
    return result.rows[0] ? challengeFromRow(result.rows[0]) : null;
  }

  async consumeChallengeIfActive(id: string, expectedVersion: number, consumedAt: Date): Promise<'consumed' | 'unavailable'> {
    const result = await this.db.query(
      `UPDATE identity_challenges
          SET consumed_at=$3, version=version+1
        WHERE id=$1 AND version=$2 AND consumed_at IS NULL AND expires_at > $3
        RETURNING id`,
      [id, expectedVersion, consumedAt],
    );
    return result.rowCount === 1 ? 'consumed' : 'unavailable';
  }
}

const ACCOUNT_SELECT = `SELECT id, email, normalized_email, status, email_verified_at, version, created_at, updated_at FROM identity_accounts`;
const SESSION_SELECT = `SELECT id, account_id, token_hash, assurance, client_label, created_at, expires_at, rotated_at, revoked_at, version FROM identity_sessions`;
const CHALLENGE_SELECT = `SELECT id, kind, account_id, token_hash, created_at, expires_at, consumed_at, version FROM identity_challenges`;

type AccountRow = Record<string, unknown> & { id:string; email:string; normalized_email:string; status:Account['status']; email_verified_at:Date|null; version:number; created_at:Date; updated_at:Date };
type CredentialRow = Record<string, unknown> & { account_id:string; password_hash:string; changed_at:Date; version:number };
type SessionRow = Record<string, unknown> & { id:string; account_id:string; token_hash:string; assurance:SessionRecord['assurance']; client_label:string|null; created_at:Date; expires_at:Date; rotated_at:Date|null; revoked_at:Date|null; version:number };
type ChallengeRow = Record<string, unknown> & { id:string; kind:IdentityChallengeKind; account_id:string; token_hash:string; created_at:Date; expires_at:Date; consumed_at:Date|null; version:number };

function accountFromRow(row: AccountRow): Account { return Object.freeze({ id:row.id,email:row.email,normalizedEmail:row.normalized_email,status:row.status,emailVerifiedAt:nullableDate(row.email_verified_at),version:row.version,createdAt:date(row.created_at),updatedAt:date(row.updated_at) }); }
function sessionFromRow(row: SessionRow): SessionRecord { return Object.freeze({ id:row.id,accountId:row.account_id,tokenHash:row.token_hash,assurance:row.assurance,clientLabel:row.client_label,createdAt:date(row.created_at),expiresAt:date(row.expires_at),rotatedAt:nullableDate(row.rotated_at),revokedAt:nullableDate(row.revoked_at),version:row.version }); }
function challengeFromRow(row: ChallengeRow): IdentityChallenge { return Object.freeze({ id:row.id,kind:row.kind,accountId:row.account_id,tokenHash:row.token_hash,createdAt:date(row.created_at),expiresAt:date(row.expires_at),consumedAt:nullableDate(row.consumed_at),version:row.version }); }
function date(value: Date): Date { return new Date(value); }
function nullableDate(value: Date | null): Date | null { return value === null ? null : date(value); }
