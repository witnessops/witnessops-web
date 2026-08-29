export async function sha256Utf8(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function sha256HexToIntegrity(value: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error("Expected a lowercase 32-byte SHA-256 digest.");
  }

  let binary = "";
  for (let index = 0; index < value.length; index += 2) {
    binary += String.fromCharCode(Number.parseInt(value.slice(index, index + 2), 16));
  }

  return `sha256-${btoa(binary)}`;
}

export function mutateFirstBase64Byte(value: string): string {
  const decoded = atob(value);
  if (decoded.length === 0) {
    throw new Error("Cannot mutate an empty evidence artifact.");
  }

  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  bytes[0] ^= 0x01;

  let mutated = "";
  for (const byte of bytes) {
    mutated += String.fromCharCode(byte);
  }
  return btoa(mutated);
}
