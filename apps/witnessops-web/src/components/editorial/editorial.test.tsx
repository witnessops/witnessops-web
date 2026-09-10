import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ResearchPage from '@/app/research/page';
import CivilizationPage from '@/app/(marketing)/articles/when-civilization-can-no-longer-understand-itself/page';
import SnapshotNote from '@/app/research/reading-a-public-exposure-snapshot/page';
import { editorialArticles, civilizationArticle, exposureSnapshotNote, editorialJsonLd, editorialMetadata } from '@/lib/research';
import { EditorialArticle } from './editorial-article';

test('Research lists the Featured essay and Latest note once with stable links and dates', () => {
  const html = renderToStaticMarkup(<ResearchPage />);
  assert.equal(editorialArticles.length, 2);
  assert.equal(new Set(editorialArticles.map(x => x.href)).size, 2);
  assert.match(html, /aria-label="Featured"[\s\S]*Featured · Essay ·/);
  assert.match(html, /3 September 2026/);
  assert.match(html, /Latest[\s\S]*Research note ·[\s\S]*10 September 2026/);
  for (const entry of editorialArticles) {
    assert.equal(html.split(`href="${entry.href}"`).length - 1, 1);
    assert.ok(html.includes(entry.title));
  }
  assert.doesNotMatch(html, /lorem ipsum|placeholder|Coming soon/i);
});

test('Both articles use the original readable shell with correct identity and JSON-LD', () => {
  for (const [Page, entry] of [[CivilizationPage, civilizationArticle], [SnapshotNote, exposureSnapshotNote]] as const) {
    const html = renderToStaticMarkup(<Page />);
    assert.match(html, /max-w-\[760px\].*data-editorial-article/);
    assert.equal(html.split('<h1').length - 1, 1);
    assert.ok(html.includes(entry.title)); assert.ok(html.includes(entry.deck));
    assert.ok(html.includes(entry.type)); assert.match(html, /<h2/);
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
    assert.deepEqual(json, editorialJsonLd(entry));
  }
  assert.match(renderToStaticMarkup(<CivilizationPage />), /Karol Stefański.*Founder of WitnessOps/);
  assert.match(renderToStaticMarkup(<SnapshotNote />), /No new target was checked/);
});

test('Canonical, OpenGraph and Article metadata share registry identities and sitemap sources', () => {
  assert.equal(civilizationArticle.href, '/articles/when-civilization-can-no-longer-understand-itself');
  for (const entry of editorialArticles) {
    const meta = editorialMetadata(entry), json = editorialJsonLd(entry);
    assert.equal(meta.title, entry.title); assert.equal(meta.description, entry.summary);
    assert.equal(meta.alternates?.canonical, `https://witnessops.com${entry.href}`);
    assert.equal(meta.openGraph?.url, json.mainEntityOfPage);
    assert.equal(json.datePublished, entry.publishedAt);
    assert.equal(json.dateModified, entry.modifiedAt ?? entry.publishedAt);
    assert.equal(json['@type'], 'Article');
    assert.ok(readFileSync(resolve(process.cwd(), entry.contentReference), 'utf8').includes('editorialMetadata'));
  }
  assert.match(readFileSync(resolve(process.cwd(), 'src/app/sitemap.ts'), 'utf8'), /editorialArticles\.map\(entry => \(\{ route: entry.href, sourcePath: entry.contentReference \}\)\)/);
});

test('Approved Civilization body stays byte-identical during shell extraction', () => {
  const source = readFileSync(resolve(process.cwd(), civilizationArticle.contentReference), 'utf8');
  const body = source.slice(source.indexOf('        <section className="pt-10">'), source.lastIndexOf('    </EditorialArticle>'));
  assert.equal(createHash('sha256').update(body).digest('hex'), 'bc42eec0d047489f630d8020c6b47c4acf4b4c0bc330cb7fe7d78249d6bf3aa1');
});

test('JSON-LD cannot terminate its script and body text stays escaped', () => {
  const hostile = '</script><script>alert(1)</script>';
  const html = renderToStaticMarkup(<EditorialArticle entry={{...exposureSnapshotNote, title:hostile}}><p>{hostile}</p></EditorialArticle>);
  assert.equal(html.split('<script').length - 1, 1);
  assert.ok(html.includes('\\u003c/script>')); assert.ok(html.includes('&lt;script&gt;'));
});

test('Optional illustrative hero reserves crop, dimensions and alt without changing canonical identity', () => {
  const hero = { src: '/images/editorial/approved-test.png', alt: 'Illustration of a lone figure overlooking a city and connected globe.', width: 1916, height: 821, position: '35% 50%' };
  const entry = { ...civilizationArticle, hero };
  const html = renderToStaticMarkup(<EditorialArticle entry={entry}><p>Original body</p></EditorialArticle>);
  assert.match(html, /data-editorial-hero/);
  assert.match(html, /aspect-video.*sm:aspect-\[16\/5\]/);
  assert.match(html, /max-w-\[1200px\]/);
  assert.ok(html.includes(`alt="${hero.alt}"`));
  assert.match(html, /width="1916" height="821"/);
  assert.match(html, /object-position:35% 50%/);
  assert.match(html, /srcSet=/i);
  assert.ok(html.indexOf('data-editorial-hero') < html.indexOf('<h1'));
  assert.deepEqual(editorialMetadata(entry), editorialMetadata(civilizationArticle));
  assert.doesNotMatch(renderToStaticMarkup(<SnapshotNote />), /data-editorial-hero/);
  for (const bad of [{...hero,width:0},{...hero,height:-1},{...hero,width:1.5},{...hero,src:'https://unapproved.example/image.png'}]) {
    assert.throws(()=>renderToStaticMarkup(<EditorialArticle entry={{...entry,hero:bad}}>Body</EditorialArticle>), /local asset and positive intrinsic dimensions/);
  }
});

test('Featured accepts imagery while the publication ledger remains text-only', () => {
  const previous = civilizationArticle.hero;
  try {
    civilizationArticle.hero = {src:'/images/editorial/approved-test.png',alt:'Illustrative cityscape.',width:1916,height:821};
    const html=renderToStaticMarkup(<ResearchPage />);
    assert.equal(html.split('data-editorial-hero').length-1,1);
    assert.ok(html.indexOf('data-editorial-hero')<html.indexOf('id="latest-heading"'));
    assert.doesNotMatch(html.slice(html.indexOf('id="latest-heading"')), /<img/);
    assert.equal(exposureSnapshotNote.hero,undefined);
  } finally { civilizationArticle.hero=previous; }
});


test('Activated Civilization artwork matches supplied bytes and intrinsic PNG dimensions', () => {
  const hero=civilizationArticle.hero!;
  const bytes=readFileSync(resolve(process.cwd(),'public'+hero.src));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'d84eec9bc54d35ecd5644b8415e0a19acc2d7dd867778492afef7cc015832976');
  assert.equal(bytes.readUInt32BE(16),hero.width); assert.equal(bytes.readUInt32BE(20),hero.height);
  assert.ok(hero.alt.startsWith('Illustration of '));
  assert.match(renderToStaticMarkup(<CivilizationPage />),/data-editorial-hero/);
  assert.match(renderToStaticMarkup(<ResearchPage />),/data-editorial-hero/);
  assert.equal(exposureSnapshotNote.hero,undefined);
});
