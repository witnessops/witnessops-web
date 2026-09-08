import '../../../../../../tests/proofpack/register-report-css.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
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
// setContent has no application layout. Reuse its font declarations and exact
// local bytes, keeping this standalone test document independent of a server.
function fixtureTypography() {
    const globals = postcss.parse(readFileSync(new URL('../../../app/globals.css', import.meta.url), 'utf8'));
    const tokens = postcss.parse(readFileSync(new URL('../../../../../../packages/ui/tokens/witnessops.css', import.meta.url), 'utf8'));
    const sans: string[] = [], bodyFamily: string[] = [], faces: string[] = [];
    tokens.walkRules(':root', rule => { rule.walkDecls('--font-sans', declaration => { sans.push(declaration.toString()); }); });
    globals.walkRules('body', rule => { rule.walkDecls('font-family', declaration => { bodyFamily.push(declaration.toString()); }); });
    globals.walkAtRules('font-face', rule => {
        const face = rule.clone();
        face.walkDecls('src', declaration => {
            const match = /^url\("(\/fonts\/[a-z0-9-]+\.woff2)"\) format\("woff2"\)$/.exec(declaration.value);
            if (!match) throw new Error('Fixture font source must be an existing local WOFF2 asset');
            const bytes = readFileSync(new URL(`../../../../public${match[1]}`, import.meta.url));
            declaration.value = `url("data:font/woff2;base64,${bytes.toString('base64')}") format("woff2")`;
        });
        faces.push(face.toString());
    });
    if (sans.length !== 1 || bodyFamily.length !== 1 || !faces.length) throw new Error('Application font contract missing or ambiguous');
    return `:root{${sans[0]}}body{${bodyFamily[0]}}${faces.join('\n')}`;
}
// Playwright imports the real component through this Node helper, without a public fixture route.
if (process.argv[1]?.endsWith('render-fixture.tsx')) {
    void renderFixture(process.argv[2]).then(html => {
    const css = readFileSync(new URL('../../../components/proofpack/buyer-report.module.css', import.meta.url), 'utf8');
    process.stdout.write(`<!doctype html><html><head><style>body{margin:0}${fixtureTypography()}${css}</style></head><body>${html}</body></html>`);
    });
}
