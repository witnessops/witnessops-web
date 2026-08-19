import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  statfs,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { withFilesystemLock } from "./filesystem-lock";
import { getConfiguredEnvPath } from "./storage-config";
import { getAdmissionStoreDir } from "./token-store";

const DAILY_BUDGET_SCHEMA = "witnessops.public-issuance-budget.v1";
const DEFAULT_DAILY_ISSUANCE_LIMIT = 100;
const DEFAULT_MAX_INTAKE_RECORDS = 50_000;
const DEFAULT_MAX_ISSUANCE_RECORDS = 50_000;
const DEFAULT_MAX_EVENT_BYTES = 512 * 1024 * 1024;
const DEFAULT_MIN_FREE_BYTES = 256 * 1024 * 1024;
const RESERVED_EVENT_BYTES = 16 * 1024;
const BUDGET_RETENTION_DAYS = 8;
const RESERVATION_STALE_MS = 30 * 60 * 1000;

interface PublicIssuanceBudget {
  schema: typeof DAILY_BUDGET_SCHEMA;
  day: string;
  count: number;
  reservations: Record<string, { reservedAt: string }>;
}

export interface PublicIssuanceAdmissionLimits {
  readonly dailyLimit: number;
  readonly maxIntakeRecords: number;
  readonly maxIssuanceRecords: number;
  readonly maxEventBytes: number;
  readonly minFreeBytes: number;
}

export interface PublicIssuanceAdmissionReservation {
  release(): Promise<void>;
}

export class PublicIssuanceAdmissionError extends Error {
  constructor(
    readonly code:
      | "DAILY_BUDGET_EXHAUSTED"
      | "INTAKE_CAPACITY_REACHED"
      | "ISSUANCE_CAPACITY_REACHED"
      | "EVENT_CAPACITY_REACHED"
      | "LOW_STORAGE_HEADROOM"
      | "BUDGET_STORE_INVALID",
  ) {
    super("Public verification issuance is temporarily unavailable.");
    this.name = "PublicIssuanceAdmissionError";
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function configuredLimits(): PublicIssuanceAdmissionLimits {
  return {
    dailyLimit: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_DAILY_LIMIT,
      DEFAULT_DAILY_ISSUANCE_LIMIT,
    ),
    maxIntakeRecords: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_MAX_INTAKE_RECORDS,
      DEFAULT_MAX_INTAKE_RECORDS,
    ),
    maxIssuanceRecords: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_MAX_ISSUANCE_RECORDS,
      DEFAULT_MAX_ISSUANCE_RECORDS,
    ),
    maxEventBytes: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_MAX_EVENT_BYTES,
      DEFAULT_MAX_EVENT_BYTES,
    ),
    minFreeBytes: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_MIN_FREE_BYTES,
      DEFAULT_MIN_FREE_BYTES,
    ),
  };
}

function eventDirectory(): string {
  return (
    getConfiguredEnvPath(
      ["WITNESSOPS_INTAKE_EVENT_DIR", "WITNESSOPS_TOKEN_AUDIT_DIR"],
      "Intake event ledger directory",
    ) ?? path.join(getAdmissionStoreDir(), "events")
  );
}

function currentDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function budgetDirectory(storeDirectory: string): string {
  return path.join(storeDirectory, "public-issuance-budgets");
}

function budgetPath(storeDirectory: string, day: string): string {
  return path.join(budgetDirectory(storeDirectory), `${day}.json`);
}

async function jsonFileCount(directory: string): Promise<number> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

async function byteSize(filePath: string): Promise<number> {
  try {
    return (await stat(filePath)).size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

async function assertStorageHeadroom(
  storeDirectory: string,
  limits: PublicIssuanceAdmissionLimits,
  reservedAdmissions: number,
): Promise<void> {
  const [intakeCount, issuanceCount, eventBytes, storeFilesystem, eventFilesystem] =
    await Promise.all([
      jsonFileCount(path.join(storeDirectory, "intakes")),
      jsonFileCount(path.join(storeDirectory, "issuances")),
      byteSize(path.join(eventDirectory(), "events.ndjson")),
      statfs(storeDirectory),
      statfs(eventDirectory()),
    ]);

  if (intakeCount + reservedAdmissions + 1 > limits.maxIntakeRecords) {
    throw new PublicIssuanceAdmissionError("INTAKE_CAPACITY_REACHED");
  }
  if (issuanceCount + reservedAdmissions + 1 > limits.maxIssuanceRecords) {
    throw new PublicIssuanceAdmissionError("ISSUANCE_CAPACITY_REACHED");
  }
  if (
    eventBytes + (reservedAdmissions + 1) * RESERVED_EVENT_BYTES >
    limits.maxEventBytes
  ) {
    throw new PublicIssuanceAdmissionError("EVENT_CAPACITY_REACHED");
  }

  const freeBytes = [storeFilesystem, eventFilesystem].map(
    (filesystem) => Number(filesystem.bavail) * Number(filesystem.bsize),
  );
  if (
    freeBytes.some(
      (available) =>
        !Number.isFinite(available) ||
        available - (reservedAdmissions + 1) * RESERVED_EVENT_BYTES <
          limits.minFreeBytes,
    )
  ) {
    throw new PublicIssuanceAdmissionError("LOW_STORAGE_HEADROOM");
  }
}

async function readBudget(filePath: string, day: string): Promise<PublicIssuanceBudget> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<PublicIssuanceBudget>;
    const reservations = parsed.reservations ?? {};
    if (
      parsed.schema !== DAILY_BUDGET_SCHEMA ||
      parsed.day !== day ||
      typeof parsed.count !== "number" ||
      !Number.isSafeInteger(parsed.count) ||
      parsed.count < 0 ||
      !reservations ||
      typeof reservations !== "object" ||
      Array.isArray(reservations) ||
      Object.values(reservations).some(
        (reservation) =>
          !reservation ||
          typeof reservation !== "object" ||
          typeof (reservation as { reservedAt?: unknown }).reservedAt !==
            "string" ||
          !Number.isFinite(
            Date.parse((reservation as { reservedAt: string }).reservedAt),
          ),
      )
    ) {
      throw new PublicIssuanceAdmissionError("BUDGET_STORE_INVALID");
    }
    return {
      schema: DAILY_BUDGET_SCHEMA,
      day,
      count: parsed.count,
      reservations: reservations as Record<string, { reservedAt: string }>,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schema: DAILY_BUDGET_SCHEMA, day, count: 0, reservations: {} };
    }
    if (error instanceof PublicIssuanceAdmissionError) throw error;
    throw new PublicIssuanceAdmissionError("BUDGET_STORE_INVALID");
  }
}

async function writeBudget(filePath: string, budget: PublicIssuanceBudget): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(budget)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(tempPath, filePath);
}

async function pruneExpiredBudgets(directory: string, day: string): Promise<void> {
  const cutoff = new Date(`${day}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - BUDGET_RETENTION_DAYS);
  const cutoffDay = cutoff.toISOString().slice(0, 10);
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name) &&
          entry.name.slice(0, 10) < cutoffDay,
      )
      .map((entry) => unlink(path.join(directory, entry.name))),
  );
}

function unexpiredReservations(
  reservations: Record<string, { reservedAt: string }>,
  now: number,
): Record<string, { reservedAt: string }> {
  return Object.fromEntries(
    Object.entries(reservations).filter(
      ([, reservation]) =>
        Date.parse(reservation.reservedAt) + RESERVATION_STALE_MS > now,
    ),
  );
}

async function activeReservationCount(
  directory: string,
  now: number,
): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !/^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name)) {
      continue;
    }

    const day = entry.name.slice(0, 10);
    const filePath = path.join(directory, entry.name);
    const budget = await readBudget(filePath, day);
    const reservations = unexpiredReservations(budget.reservations, now);
    if (Object.keys(reservations).length !== Object.keys(budget.reservations).length) {
      await writeBudget(filePath, { ...budget, reservations });
    }
    count += Object.keys(reservations).length;
  }

  return count;
}

function admissionLockPath(storeDirectory: string): string {
  return path.join(storeDirectory, "locks", "public-issuance-admission.lock");
}

function admissionReservation(
  storeDirectory: string,
  day: string,
  reservationId: string,
): PublicIssuanceAdmissionReservation {
  let released = false;

  return {
    async release(): Promise<void> {
      if (released) return;
      await withFilesystemLock(
        {
          lockPath: admissionLockPath(storeDirectory),
          description: "public verification issuance admission",
        },
        async () => {
          const filePath = budgetPath(storeDirectory, day);
          try {
            await access(filePath);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
            throw error;
          }

          const budget = await readBudget(filePath, day);
          if (!budget.reservations[reservationId]) return;
          const { [reservationId]: _releasedReservation, ...reservations } =
            budget.reservations;
          await writeBudget(filePath, { ...budget, reservations });
        },
      );
      released = true;
    },
  };
}

/**
 * Reserves one public verification issuance before it can write intake data or
 * contact a mail provider. The budget is intentionally consumed for attempts:
 * a provider timeout is still an outbound quota event and must not become a
 * retry amplifier.
 */
export async function reservePublicIssuanceAdmission(
  limits: PublicIssuanceAdmissionLimits = configuredLimits(),
): Promise<PublicIssuanceAdmissionReservation> {
  const storeDirectory = getAdmissionStoreDir();
  const day = currentDay();
  const budgetsDirectory = budgetDirectory(storeDirectory);
  const reservationId = randomUUID();

  return withFilesystemLock(
    {
      lockPath: admissionLockPath(storeDirectory),
      description: "public verification issuance admission",
    },
    async () => {
      await Promise.all([
        mkdir(budgetsDirectory, { recursive: true, mode: 0o700 }),
        mkdir(eventDirectory(), { recursive: true, mode: 0o700 }),
      ]);
      await pruneExpiredBudgets(budgetsDirectory, day);

      const activeReservations = await activeReservationCount(
        budgetsDirectory,
        Date.now(),
      );
      await assertStorageHeadroom(storeDirectory, limits, activeReservations);

      const filePath = budgetPath(storeDirectory, day);
      const budget = await readBudget(filePath, day);
      if (budget.count >= limits.dailyLimit) {
        throw new PublicIssuanceAdmissionError("DAILY_BUDGET_EXHAUSTED");
      }

      await writeBudget(filePath, {
        ...budget,
        count: budget.count + 1,
        reservations: {
          ...budget.reservations,
          [reservationId]: { reservedAt: new Date().toISOString() },
        },
      });
      return admissionReservation(storeDirectory, day, reservationId);
    },
  );
}
