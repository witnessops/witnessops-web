import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import {
  PublicIssuanceAdmissionError,
  reservePublicIssuanceAdmission,
} from "./public-issuance-admission";

const testRoots: string[] = [];

function applyTestStorage(baseDirectory: string): void {
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDirectory, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDirectory, "audit");
}

afterEach(async () => {
  delete process.env.WITNESSOPS_TOKEN_STORE_DIR;
  delete process.env.WITNESSOPS_TOKEN_AUDIT_DIR;
  while (testRoots.length > 0) {
    const root = testRoots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

test("public issuance budget is durable across admissions", async () => {
  const baseDirectory = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-public-issuance-budget-"),
  );
  testRoots.push(baseDirectory);
  applyTestStorage(baseDirectory);

  const limits = {
    dailyLimit: 1,
    maxIntakeRecords: 10,
    maxIssuanceRecords: 10,
    maxEventBytes: 1024 * 1024,
    minFreeBytes: 1,
  };
  await reservePublicIssuanceAdmission(limits);
  await assert.rejects(
    () => reservePublicIssuanceAdmission(limits),
    (error: unknown) =>
      error instanceof PublicIssuanceAdmissionError &&
      error.code === "DAILY_BUDGET_EXHAUSTED",
  );
});

test("public issuance capacity rejects before a new intake can be written", async () => {
  const baseDirectory = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-public-issuance-capacity-"),
  );
  testRoots.push(baseDirectory);
  applyTestStorage(baseDirectory);
  const intakeDirectory = path.join(
    process.env.WITNESSOPS_TOKEN_STORE_DIR!,
    "intakes",
  );
  await mkdir(intakeDirectory, { recursive: true });
  await writeFile(path.join(intakeDirectory, "existing.json"), "{}\n", "utf8");

  await assert.rejects(
    () =>
      reservePublicIssuanceAdmission({
        dailyLimit: 10,
        maxIntakeRecords: 1,
        maxIssuanceRecords: 10,
        maxEventBytes: 1024 * 1024,
        minFreeBytes: 1,
      }),
    (error: unknown) =>
      error instanceof PublicIssuanceAdmissionError &&
      error.code === "INTAKE_CAPACITY_REACHED",
  );
});

test("public issuance reservations prevent concurrent admissions from exceeding capacity", async () => {
  const baseDirectory = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-public-issuance-reservation-"),
  );
  testRoots.push(baseDirectory);
  applyTestStorage(baseDirectory);

  const limits = {
    dailyLimit: 10,
    maxIntakeRecords: 1,
    maxIssuanceRecords: 1,
    maxEventBytes: 1024 * 1024,
    minFreeBytes: 1,
  };
  const reservation = await reservePublicIssuanceAdmission(limits);

  await assert.rejects(
    () => reservePublicIssuanceAdmission(limits),
    (error: unknown) =>
      error instanceof PublicIssuanceAdmissionError &&
      error.code === "INTAKE_CAPACITY_REACHED",
  );

  await reservation.release();
  await reservePublicIssuanceAdmission(limits);
});

test("malformed public issuance budgets fail as controlled admission errors", async () => {
  const baseDirectory = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-public-issuance-corrupt-budget-"),
  );
  testRoots.push(baseDirectory);
  applyTestStorage(baseDirectory);
  const budgetDirectory = path.join(
    process.env.WITNESSOPS_TOKEN_STORE_DIR!,
    "public-issuance-budgets",
  );
  await mkdir(budgetDirectory, { recursive: true });
  await writeFile(
    path.join(budgetDirectory, `${new Date().toISOString().slice(0, 10)}.json`),
    "{",
    "utf8",
  );

  await assert.rejects(
    () =>
      reservePublicIssuanceAdmission({
        dailyLimit: 10,
        maxIntakeRecords: 10,
        maxIssuanceRecords: 10,
        maxEventBytes: 1024 * 1024,
        minFreeBytes: 1,
      }),
    (error: unknown) =>
      error instanceof PublicIssuanceAdmissionError &&
      error.code === "BUDGET_STORE_INVALID",
  );
});
