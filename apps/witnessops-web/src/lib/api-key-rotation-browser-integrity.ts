export async function sha256Utf8(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
