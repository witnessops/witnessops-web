import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { reportPageIdentityStyle } from './report-print-style';

test('package identifiers cannot inject CSS or close the style element', () => {
    const rule = reportPageIdentityStyle('</style><img src=x>";url(x)\\\n', '";}@import url(x);');
    assert.equal((rule.match(/@page/g) ?? []).length, 1);
    assert.ok(!rule.includes('</style>'));
    assert.ok(!rule.includes('url('));
    assert.ok(!rule.includes('@import'));
    const content = rule.match(/content: "([^"]*)";/)![1];
    assert.match(content, /^(?:\\[0-9a-f]+ )+$/);
});

test('footer retains a bounded host and digest prefix, with full identity left to provenance', () => {
    const rule = reportPageIdentityStyle('a'.repeat(100), 'b'.repeat(64));
    const content = rule.match(/content: "([^"]*)";/)![1];
    const decoded = content.replace(/\\([0-9a-f]+) /g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    assert.equal(decoded, `${'a'.repeat(32)}… | sha256:${'b'.repeat(16)}… | Derived report`);
});
