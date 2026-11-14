// The browser form stores one JSON shape. Other saved text, including an MCP
// answer, must be written back unchanged until the learner edits the form.
export function isBrowserDraft(stored) {
  if (typeof stored !== 'string') return false;
  let parsed;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  if (typeof parsed.limit !== 'string') return false;
  if (!Array.isArray(parsed.claims) || parsed.claims.length !== 3) return false;
  return parsed.claims.every((claim) => {
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) return false;
    if (claim.label != null && typeof claim.label !== 'string') return false;
    if (claim.reason != null && typeof claim.reason !== 'string') return false;
    return true;
  });
}

export function contentToSave(stored, formJson, edited) {
  if (!edited && !isBrowserDraft(stored)) return stored;
  return formJson;
}
