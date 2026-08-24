const CREDENTIAL_KEY_NAMES = new Set([
  "AWSACCESSKEYID",
  "AWSSECRETACCESSKEY",
  "AWSSESSIONTOKEN",
]);

function normalizeKeyName(key) {
  return key.replace(/[^A-Za-z0-9]+/g, "").toUpperCase();
}

function containsCredentialKey(value) {
  if (Array.isArray(value)) return value.some(containsCredentialKey);
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      CREDENTIAL_KEY_NAMES.has(normalizeKeyName(key)) || containsCredentialKey(nested),
  );
}

export function containsCredentialMaterial(value) {
  const serialized = JSON.stringify(value);
  return (
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(serialized) ||
    /AKIA[0-9A-Z]{16}/.test(serialized) ||
    /ASIA[0-9A-Z]{16}/.test(serialized) ||
    /AWS_SECRET_ACCESS_KEY\s*[:=]/i.test(serialized) ||
    containsCredentialKey(value)
  );
}
