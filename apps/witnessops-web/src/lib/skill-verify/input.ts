import { SKILL_CONTRACT_PATH } from "./contract";

export function decodeSkillUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
}

export function encodeSkillUtf8Strict(value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  if (decodeSkillUtf8(bytes) !== value) {
    throw new TypeError("Skill input is not a well-formed UTF-8 string.");
  }
  return bytes;
}

export function normalizeSkillSourceName(value?: string): string {
  const basename = (value ?? SKILL_CONTRACT_PATH)
    .replaceAll("\\", "/")
    .split("/")
    .at(-1) ?? SKILL_CONTRACT_PATH;
  const normalized = basename
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return normalized || SKILL_CONTRACT_PATH;
}
