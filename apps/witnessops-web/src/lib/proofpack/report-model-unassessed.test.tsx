import '../../../../../tests/proofpack/register-report-css.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuyerReportDocument } from '../../components/proofpack/buyer-report';
import { syntheticProofpackAdapter } from '../../../../../tests/proofpack/synthetic-adapter';
import { syntheticUnassessedAdapter } from '../../../../../tests/proofpack/synthetic-unassessed-adapter';
import { fixtureModel, GENERATED_AT } from './test-support/render-fixture';
import { createReportModel, printBuyerReport, type ProofpackReportV1, type ReportModelInput } from './report-model';

const mutable = (model: ProofpackReportV1): ReportModelInput => structuredClone(model) as ReportModelInput;
const render = (model: ProofpackReportV1) => renderToStaticMarkup(<BuyerReportDocument model={model} />);
const region = (html: string, label: string) => html.match(new RegExp(`<section[^>]*aria-label="${label}">([\\s\\S]*?)</section>`))?.[1] ?? '';
const findingSections = (html: string) => [...html.matchAll(/<section class="finding">([\s\S]*?)<\/section>/g)].map(match => match[1]);

test('All-assessed reports retain the omitted field and accept an explicit zero without changing their document', () => {
    const original = syntheticProofpackAdapter(GENERATED_AT);
    assert.equal(Object.hasOwn(original.summary.findings, 'unassessed'), false);
    const before = JSON.stringify(original);
    assert.equal(JSON.stringify(createReportModel(mutable(original))), before);
    const explicitZero = mutable(original);
    explicitZero.summary.findings.unassessed = 0;
    assert.equal(createReportModel(explicitZero).summary.findings.unassessed, 0);
    assert.equal(render(createReportModel(explicitZero)), render(original));
    const explicitUndefined = mutable(original);
    explicitUndefined.summary.findings.unassessed = undefined;
    assert.equal(JSON.stringify(createReportModel(explicitUndefined)), before);
    assert.doesNotMatch(render(original), /Severity not assessed|severity not assessed|Severity-assessed findings/);
});

for (const variant of ['mixed', 'only'] as const) test(`Explicit null severity has a separate count and preserves disposition: ${variant}`, () => {
    const model = syntheticUnassessedAdapter(GENERATED_AT, variant);
    const counts = model.summary.findings;
    assert.equal(counts.unassessed, model.findings.filter(finding => finding.severity === null).length);
    assert.equal(Object.values(counts.severities).reduce((sum, count) => sum + count, 0) + counts.unassessed!, counts.total);
    assert.equal(counts.needsAttention + counts.informational, counts.total);
    assert.equal(counts.severities.informational ?? 0, 0, 'No informational severity is invented from a null severity');
    assert.deepEqual(model, syntheticUnassessedAdapter(GENERATED_AT, variant));
    assert.ok(Object.isFrozen(model) && Object.isFrozen(model.findings) && Object.isFrozen(model.findings[0]));
    const input = mutable(model);
    const detached = createReportModel(input);
    input.findings[0].title = 'Changed after creation';
    assert.equal(detached.findings[0].title, model.findings[0].title);
});

test('Unassessed-only findings retain an informational disposition independently of their severity', () => {
    const model = syntheticUnassessedAdapter(GENERATED_AT, 'only');
    assert.deepEqual(model.summary.findings, { total: 2, needsAttention: 1, informational: 1, unassessed: 2, severities: {} });
    assert.equal(model.findings[1].state, 'informational');
    assert.equal(model.findings[1].severity, null);
});

for (const [label, value] of [
    ['null', null], ['negative', -1], ['fractional', 0.5], ['string', '1'], ['NaN', NaN],
    ['infinite', Infinity], ['unsafe integer', Number.MAX_SAFE_INTEGER + 1], ['too few', 0], ['too many', 2],
] as const) test(`Invalid unassessed count is rejected: ${label}`, () => {
    const input = mutable(syntheticUnassessedAdapter(GENERATED_AT, 'mixed'));
    (input.summary.findings as unknown as Record<string, unknown>).unassessed = value;
    assert.throws(() => createReportModel(input), /Inconsistent report model/);
});

for (const omit of [true, false]) test(`Null severity requires its count: ${omit ? 'missing' : 'undefined'}`, () => {
    const input = mutable(syntheticUnassessedAdapter(GENERATED_AT, 'mixed'));
    if (omit) delete input.summary.findings.unassessed;
    else input.summary.findings.unassessed = undefined;
    assert.throws(() => createReportModel(input), /Inconsistent report model/);
});

test('A null summary count is invalid even when every severity is assessed', () => {
    const input = mutable(syntheticProofpackAdapter(GENERATED_AT));
    (input.summary.findings as unknown as Record<string, unknown>).unassessed = null;
    assert.throws(() => createReportModel(input), /Inconsistent report model/);
});

for (const [label, value] of [
    ['undefined', undefined], ['empty', ''], ['whitespace', '  '], ['number', 0], ['boolean', false], ['object', {}], ['array', []],
] as const) test(`Invalid finding severity is rejected: ${label}`, () => {
    const input = mutable(syntheticProofpackAdapter(GENERATED_AT));
    (input.findings[0] as unknown as Record<string, unknown>).severity = value;
    assert.throws(() => createReportModel(input), /Inconsistent report model/);
});

test('An absent severity does not silently become unassessed', () => {
    const input = mutable(syntheticUnassessedAdapter(GENERATED_AT, 'mixed'));
    delete (input.findings[0] as unknown as Record<string, unknown>).severity;
    assert.throws(() => createReportModel(input), /Inconsistent report model/);
});

test('Assessed totals and each recorded severity bucket must match the findings', () => {
    const wrongTotal = mutable(syntheticUnassessedAdapter(GENERATED_AT, 'mixed'));
    wrongTotal.summary.findings.severities.low = 2;
    assert.throws(() => createReportModel(wrongTotal), /Inconsistent report model/);
    const wrongBucket = mutable(syntheticUnassessedAdapter(GENERATED_AT, 'mixed'));
    delete wrongBucket.summary.findings.severities.high;
    wrongBucket.summary.findings.severities.informational = 1;
    assert.throws(() => createReportModel(wrongBucket), /Inconsistent report model/);
    const wrongDisposition = mutable(syntheticUnassessedAdapter(GENERATED_AT, 'mixed'));
    wrongDisposition.summary.findings.needsAttention -= 1;
    assert.throws(() => createReportModel(wrongDisposition), /Inconsistent report model/, 'Unassessed is not a third disposition');
});

test('Mixed reports keep unassessed findings outside severity priority and badge semantics', () => {
    const model = syntheticUnassessedAdapter(GENERATED_AT, 'mixed');
    const html = render(model);
    const priority = region(html, 'Priority findings');
    assert.deepEqual([...priority.matchAll(/<strong>(.*?)<\/strong>/g)].map(match => match[1]), [
        'High severity fixture finding', 'Medium severity fixture finding', 'Low severity fixture finding',
    ]);
    const unassessed = model.findings.find(finding => finding.severity === null)!;
    assert.ok(!priority.includes(unassessed.title));
    assert.ok(!region(html, 'Suggested next action').includes(unassessed.recommendation!));
    assert.ok(region(html, 'Suggested next action').includes(model.findings.find(finding => finding.severity === 'high')!.recommendation!));
    assert.match(region(html, 'Unassessed findings'), /1 finding is recorded without an assessed severity/);
    assert.match(html, /1 high · 1 medium · 1 low · 1 severity not assessed/);
    const sections = findingSections(html);
    assert.equal(sections.length, 4);
    assert.deepEqual(sections.map(section => section.match(/<h3>(.*?)<\/h3>/)![1]), [
        ...model.findings.filter(finding => finding.severity !== null), unassessed,
    ].map(finding => finding.title));
    const nullSection = sections.find(section => section.includes(unassessed.title))!;
    assert.match(nullSection, /<span>Severity not assessed<\/span>/);
    assert.doesNotMatch(nullSection, /data-severity=/);
    assert.doesNotMatch(html, /data-severity="(?:null|informational)"/);
});

test('Only unassessed findings remain readable without a ranked summary or an empty-findings claim', () => {
    const model = syntheticUnassessedAdapter(GENERATED_AT, 'only');
    const html = render(model);
    assert.doesNotMatch(html, /aria-label="Priority findings"|Review first|No findings (?:were )?recorded|data-severity=/);
    assert.match(region(html, 'Unassessed findings'), /2 findings are recorded without an assessed severity/);
    assert.match(region(html, 'Suggested next action'), /Their severity has not been assessed/);
    assert.match(html, /2 severity not assessed/);
    assert.match(html, /<h2>Recorded findings<\/h2>/);
    const sections = findingSections(html);
    assert.equal(sections.length, 2);
    model.findings.forEach((finding, index) => {
        assert.ok(sections[index].includes(finding.title));
        assert.ok(sections[index].includes(String(finding.observation)));
        assert.match(sections[index], /<span>Severity not assessed<\/span>/);
    });
    assert.match(sections[1], /<span>informational<\/span>/, 'The recorded disposition is preserved');
});

test('Unassessed finding text stays escaped in the document', () => {
    const input = mutable(syntheticUnassessedAdapter(GENERATED_AT, 'only'));
    const unsafe = '<img src=x onerror="alert(1)"> & <script>alert(2)</script>';
    Object.assign(input.findings[0], { title: unsafe, observation: unsafe, recommendation: unsafe, interpretation: unsafe, limitations: [unsafe], evidence: [unsafe] });
    const html = render(createReportModel(input));
    assert.doesNotMatch(html, /<img|<script|<span data-severity=/);
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; &lt;script&gt;alert\(2\)&lt;\/script&gt;/);
});

for (const name of ['synthetic', 'synthetic-unassessed-mixed', 'synthetic-unassessed-only']) test(`Browser document and print use one immutable deterministic model: ${name}`, async () => {
    const model = (await fixtureModel(name))!;
    const before = JSON.stringify(model);
    const html = render(model);
    let printed = 0;
    assert.equal(printBuyerReport(model, () => { printed += 1; assert.equal(render(model), html); }), true);
    assert.equal(printed, 1);
    assert.equal(JSON.stringify(model), before);
    assert.equal(render((await fixtureModel(name))!), html);
});

// Captured before this compatibility change from main defda896 at the fixed time below.
const localAuditHtmlDigests = {
    complete: '84a6bf34edbd1262690f47d622b99062a2c33297ba30294721c6e799c2227827',
    adverse: 'b89ba03f8fcb228e90a230247074391ca53639426e6f13690fae61bfc323a5ce',
    partial: 'c2f44bf5390635660ebfa92f6998c1be9097121d9184e9c629dbe36bc6f938ca',
};
for (const name of ['complete', 'adverse', 'partial'] as const) test(`Local Audit has zero effective unassessed findings and byte-identical HTML: ${name}`, async () => {
    const model = (await fixtureModel(name))!;
    assert.equal(model.summary.findings.unassessed ?? 0, 0);
    assert.equal(Object.hasOwn(model.summary.findings, 'unassessed'), false);
    assert.ok(model.findings.every(finding => typeof finding.severity === 'string'));
    assert.equal(Object.values(model.summary.findings.severities).reduce((sum, count) => sum + count, 0), model.findings.length);
    assert.doesNotMatch(render(model), /Severity not assessed|severity not assessed|Severity-assessed findings/);
    const fixedTime = mutable(model);
    fixedTime.identity.generatedAt = '2026-09-08T12:00:00.000Z';
    assert.equal(createHash('sha256').update(render(createReportModel(fixedTime))).digest('hex'), localAuditHtmlDigests[name]);
});
