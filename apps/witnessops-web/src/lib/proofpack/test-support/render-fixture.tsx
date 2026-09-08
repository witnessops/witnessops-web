import '../../../../../../tests/proofpack/register-report-css.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuyerReportDocument } from '../../../components/proofpack/buyer-report';
import { localAuditAdapter } from '../local-audit-adapter';
import { verifyProofpack, type ProofpackInput } from '../verify.mjs';
import { syntheticProofpackAdapter } from '../../../../../../tests/proofpack/synthetic-adapter';
import { syntheticUnassessedAdapter } from '../../../../../../tests/proofpack/synthetic-unassessed-adapter';
export const GENERATED_AT = '2026-09-08T13:00:00.000Z';
export function fixtureInput(name: string): ProofpackInput {
    const dir = resolve(import.meta.dirname, '../../../../../../tests/proofpack/fixtures', name), names = readdirSync(dir);
    const read = (n: string) => ({ name: n, bytes: new Uint8Array(readFileSync(resolve(dir, n))) });
    return { proofpack: read(names.find(n => n.endsWith('.zip'))!), signature: read(names.find(n => n.endsWith('.sig.json'))!), trust_registry: read('trusted-keys.json') };
}
export async function fixtureModel(name: string) {
    if (name === 'synthetic-unassessed-mixed') return syntheticUnassessedAdapter(GENERATED_AT, 'mixed');
    if (name === 'synthetic-unassessed-only') return syntheticUnassessedAdapter(GENERATED_AT, 'only');
    return name === 'synthetic' ? syntheticProofpackAdapter(GENERATED_AT) : localAuditAdapter(await verifyProofpack(fixtureInput(name)), GENERATED_AT);
}
export async function renderFixture(name: string) {
    const model = await fixtureModel(name);
    if (!model) throw new Error('Fixture rejected');
    return renderToStaticMarkup(<BuyerReportDocument model={model} />);
}
// Playwright imports the real component through this Node helper, without a public fixture route.
if (process.argv[1]?.endsWith('render-fixture.tsx')) {
    void renderFixture(process.argv[2]).then(html => {
    const css = readFileSync(new URL('../../../components/proofpack/buyer-report.module.css', import.meta.url), 'utf8');
    process.stdout.write(`<!doctype html><html><head><style>body{margin:0}${css}</style></head><body>${html}</body></html>`);
    });
}
