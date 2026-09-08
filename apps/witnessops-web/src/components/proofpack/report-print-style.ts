// Escape every code point as CSS text. Package-provided identifiers must never
// become CSS syntax, URLs, or a closing HTML style tag.
function cssText(value: string): string {
    return Array.from(value, character => `\\${character.codePointAt(0)!.toString(16)} `).join('');
}

export function reportPageIdentityStyle(hostname: string, digest: string): string {
    const characters = Array.from(hostname);
    const host = characters.length > 32 ? characters.slice(0, 32).join('') + '…' : hostname;
    const identity = `${host} | sha256:${digest.slice(0, 16)}… | Derived report`;
    return `@page proofpackBuyerReport { @bottom-left { content: "${cssText(identity)}"; font: 7pt ui-monospace, monospace; color: #44443d; } }`;
}
