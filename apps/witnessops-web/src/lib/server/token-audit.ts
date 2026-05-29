import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getConfiguredEnvPath } from "./storage-config";

export interface TokenAuditRecord {
  kind: "issuance" | "verification";
  issuanceId: string;
  email: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

function getAuditDir(): string {
  return (
    getConfiguredEnvPath(
      ["WITNESSOPS_TOKEN_AUDIT_DIR"],
      "Token audit directory",
    ) ?? path.join(process.cwd(), ".witnessops-token-store", "audit")
  );
}

export async function writeTokenAudit(record: TokenAuditRecord): Promise<string> {
  const dir = getAuditDir();
  await mkdir(dir, { recursive: true });
  const fileName = `${record.timestamp}-${record.kind}-${record.issuanceId}.json`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return filePath;
}
