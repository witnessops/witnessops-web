import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyProofpack } from '../../apps/witnessops-web/src/lib/proofpack/verify.mjs';
import { pinnedRegistryInput } from '../../apps/witnessops-web/src/lib/proofpack/pinned-registry';
import { localAuditAdapter } from '../../apps/witnessops-web/src/lib/proofpack/local-audit-adapter';
import type { LinuxCheckRun, Workspace } from '../../apps/witnessops-app/src/lib/model';
import { linuxServerSnapshotFromVerifiedResult as project } from '../../apps/witnessops-app/src/lib/linux-snapshot';
import { compareLinuxRuns } from '../../apps/witnessops-app/src/lib/linux-comparison';
const name='proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
const path=resolve('tests/proofpack/production-fixtures/complete',name);
for(const synthetic of [true,false]) for(const width of [1440,390]) test(`Linux import and existing report UI ${width} synthetic=${synthetic}`,async({page},info)=>{
  const checked=await verifyProofpack({proofpack:{name,bytes:readFileSync(path)},signature:{name:name+'.sig.json',bytes:readFileSync(path+'.sig.json')},trust_registry:pinnedRegistryInput()});
  expect(checked.status).toBe('valid');
  const model=localAuditAdapter(checked,'2026-09-11T12:00:00Z')!;
  const run:LinuxCheckRun={id:'linux-run',assetId:'linux-asset',createdAt:'2026-09-11T12:00:00Z',sourceDigest:model.identity.sourceDigest,proofRunId:checked.proof_run_id,verifierVersion:checked.verifier_version,profileId:'linux_baseline_v1',outcome:checked.outcome,synthetic,observedHostname:'demo-host',observedAt:model.subject.observedAt,sourceAssetId:'asset-demo-host-001',machineIdentity:null};
  const ws:Workspace={id:'workspace-a',name:'Synthetic workspace',slug:'workspace-a',role:'owner',assets:[],runs:[],linuxRuns:[],members:[]};
  let imports=0,reopens=0,collections=0;
  const downloads:string[]=[];
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname==='/api/workspace') return route.fulfill({json:{user:{id:'owner',displayName:'Synthetic owner'},workspaces:[ws],workspace:ws}});
    if(url.pathname==='/api/feedback') return route.fulfill({json:[]});
    if(url.pathname==='/api/assets') {const data=req.postDataJSON();expect(data.type).toBe('linux_server');ws.assets.push({id:'linux-asset',hostname:data.hostname,type:data.type,createdAt:run.createdAt});return route.fulfill({status:201,json:ws.assets[0]});}
    if(url.pathname==='/api/linux-checks') {
      expect(req.headers()['x-witnessops-workspace']).toBe(ws.id);
      if(req.method()==='POST') {
        // Playwright's intercepted multipart postData omits file bytes. Exact
        // transport/storage custody is exercised by the PostgreSQL/API suite.
        imports++;ws.linuxRuns=[run];return route.fulfill({status:201,json:run});
      }
      expect(url.searchParams.get('id')).toBe(run.id);
      const artifact=req.headers()['x-witnessops-artifact'];
      if(artifact) {
        expect(['zip','signature']).toContain(artifact);
        downloads.push(artifact);
        const suffix=artifact==='signature'?'.sig.json':'';
        return route.fulfill({body:readFileSync(path+suffix),contentType:artifact==='zip'?'application/zip':'application/json',headers:{'content-disposition':`attachment; filename="${name+suffix}"`}});
      }
      reopens++; return route.fulfill({json:{run,model}});
    }
    if(url.pathname==='/api/runs') collections++;
    throw new Error('Unexpected product call '+url.pathname);
  });
  await page.setViewportSize({width,height:1000});await page.goto('/assets/new');
  await page.getByRole('button', { name: 'Choose One Server Security Check', exact: true }).click();await page.getByLabel('Recorded Linux hostname').fill('demo-host');
  await page.getByRole('button',{name:'Add without scanning',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Import Security Check'})).toBeVisible();
  await page.getByLabel('Original Proofpack ZIP').setInputFiles(path);await page.getByLabel('Detached signature (.zip.sig.json)').setInputFiles(path+'.sig.json');
  expect(await page.getByLabel('Original Proofpack ZIP').evaluate((input:HTMLInputElement)=>input.files?.[0]?.size)).toBe(readFileSync(path).length);
  await page.screenshot({path:info.outputPath('linux-import.png'),fullPage:true});
  await page.getByRole('button',{name:'Import Security Check',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Saved check',exact:true})).toBeVisible();
  // Presentation-only response variants; this does not reclassify the signed fixture.
  await expect(page.locator('main')).toContainText(synthetic ? 'Synthetic check' : 'Live server check');
  await expect(page.locator('main')).not.toContainText(synthetic ? 'Live server check' : 'Synthetic check');
  await expect(page.locator('main')).toContainText('does not establish');
  await expect(page.locator('main')).toContainText(model.identity.sourceDigest);
  for(const [label,suffix] of [['Download original ZIP',''],['Download detached signature','.sig.json']]) {
    const ready=page.waitForEvent('download');
    await page.getByRole('button',{name:label,exact:true}).click();
    const download=await ready;
    expect(download.suggestedFilename()).toBe(name+suffix);
    const downloadedPath=await download.path();
    expect(downloadedPath).toBeTruthy();
    expect(readFileSync(downloadedPath!)).toEqual(readFileSync(path+suffix));
  }
  expect(downloads).toEqual(['zip','signature']);
  await expect(page.getByRole('link',{name:'Open report',exact:true})).toHaveAttribute('href','/reports/linux-run');
  await page.screenshot({path:info.outputPath('linux-reopened-report.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();await expect(page.getByRole('heading',{name:'Saved check',exact:true})).toBeVisible();
  expect(reopens).toBeGreaterThanOrEqual(2);expect(imports).toBe(1);expect(collections).toBe(0);expect(errors).toEqual([]);
  ws.role='viewer';await page.goto('/assets/linux-asset');await expect(page.getByText('Viewer access · Only an Owner can import a check.')).toBeVisible();await expect(page.getByRole('button',{name:'Import Security Check'})).toHaveCount(0);
  await page.goto('/runs/foreign-run');await expect(page.getByRole('heading',{name:'Run not found'})).toBeVisible();
});

for(const width of [1440,390]) test(`Linux comparison qualification and three lanes ${width}`,async({page},info)=>{
  const load=async(kind:string)=>verifyProofpack({proofpack:{name,bytes:readFileSync(resolve('tests/proofpack/production-fixtures',kind,name))},signature:{name:name+'.sig.json',bytes:readFileSync(resolve('tests/proofpack/production-fixtures',kind,name+'.sig.json'))},trust_registry:pinnedRegistryInput()});
  const first=await load('complete'),second=await load('adverse');
  const baseline={id:'baseline',assetId:'linux-asset',workspaceId:'workspace-a',createdAt:'2026-09-11T12:00:00Z',snapshot:project(first)};
  const current={...baseline,id:'current',createdAt:'2026-09-11T12:01:00Z',snapshot:project(second)};
  const comparison=compareLinuxRuns(current,baseline);
  const metadata=(r:typeof current):LinuxCheckRun=>({id:r.id,assetId:r.assetId,createdAt:r.createdAt,sourceDigest:r.snapshot.source.sourceDigest,proofRunId:r.snapshot.source.proofRunId,verifierVersion:r.snapshot.source.verifierVersion,profileId:r.snapshot.source.profileId,outcome:'pass',synthetic:true,observedHostname:'demo-host',observedAt:r.snapshot.source.observedAt,sourceAssetId:'asset-demo-host-001',machineIdentity:null});
  const ws:Workspace={id:'workspace-a',name:'Synthetic comparison',slug:'comparison',role:'owner',assets:[{id:'linux-asset',hostname:'demo-host',type:'linux_server',createdAt:baseline.createdAt}],runs:[],linuxRuns:[metadata(baseline),metadata(current)],members:[]};
  let calls=0;
  await page.route('**/api/**',route=>{
    const url=new URL(route.request().url());
    if(route.request().method()!=='GET')throw new Error('Comparison must not write or recollect');
    if(url.pathname==='/api/workspace')return route.fulfill({json:{user:{id:'owner',displayName:'Owner'},workspace:ws,workspaces:[ws]}});
    if(url.pathname==='/api/feedback')return route.fulfill({json:[]});
    if(url.pathname==='/api/linux-checks'){calls++;return route.fulfill({json:{run:metadata(current),model:localAuditAdapter(second,current.createdAt),snapshot:current.snapshot,comparison}});}
    throw new Error('Unexpected route');
  });
  await page.setViewportSize({width,height:1000});await page.goto('/assets/linux-asset');
  await expect(page.getByRole('heading',{name:'What changed since the previous check?'})).toBeVisible();
  await expect(page.locator('.change-panel')).toContainText('Listener added: udp/0.0.0.0:53');
  for(const name of ['Environment','Coverage','Uncertainty'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await expect(page.locator('.change-panel')).toContainText('Update cache freshness is not established');
  await expect(page.getByRole('link',{name:'Open comparison baseline →'})).toHaveAttribute('href','/runs/baseline');
  const history=page.locator('.linux-history .ledger-row');
  await expect(history).toHaveCount(2);
  await expect(history.nth(0)).toHaveAttribute('href','/runs/current');
  await expect(history.nth(1)).toHaveAttribute('href','/runs/baseline');
  await expect(history.nth(0).locator('time').nth(0)).toHaveAttribute('datetime',current.snapshot.source.observedAt);
  await expect(history.nth(0).locator('time').nth(0)).toContainText('UTC');
  await expect(history.nth(0).locator('time').nth(1)).toHaveAttribute('datetime',current.createdAt);
  await expect(history.nth(0).locator('time').nth(1)).toContainText('12:01 UTC');
  await page.screenshot({path:info.outputPath('linux-comparison.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  // Next dev/React Strict Mode may replay the mount effect once. Both requests
  // are read-only; subsequent rerenders must not create a request loop.
  expect(calls).toBeGreaterThanOrEqual(1);expect(calls).toBeLessThanOrEqual(2);
});

// Regression: a verifier slot collision is not an access/verification failure.
for(const exhaust of [false,true]) test(`Linux reopen retries explicit verification backpressure exhaust=${exhaust}`,async({page})=>{
  const checked=await verifyProofpack({proofpack:{name,bytes:readFileSync(path)},signature:{name:name+'.sig.json',bytes:readFileSync(path+'.sig.json')},trust_registry:pinnedRegistryInput()});
  const model=localAuditAdapter(checked,'2026-09-11T12:00:00Z')!;
  const run={id:'busy-run',assetId:'linux-asset',synthetic:true,sourceDigest:model.identity.sourceDigest};
  const ws={id:'workspace-a',name:'Test',role:'owner',assets:[],runs:[],members:[],linuxRuns:[run]};
  let calls=0;
  await page.route('**/api/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/workspace')return route.fulfill({json:{user:{id:'owner'},workspace:ws,workspaces:[ws]}});
    if(url.pathname==='/api/feedback')return route.fulfill({json:[]});
    if(url.pathname==='/api/linux-checks')return (++calls<=2||exhaust)
      ?route.fulfill({status:429,json:{error:'Another package is being checked. Try again shortly.',code:'verification_busy',retryable:true}})
      :route.fulfill({json:{run,model}});
    throw new Error('Unexpected route');
  });
  await page.goto('/runs/busy-run');
  await expect(page.getByRole('status')).toHaveText('Verification is busy. Retrying…');
  if(exhaust)await expect(page.locator('p[role="alert"]')).toHaveText('This saved check could not be accessed or reverified.',{timeout:7000});
  else await expect(page.getByRole('heading',{name:'Saved check',exact:true})).toBeVisible({timeout:7000});
  expect(calls).toBeLessThanOrEqual(5);
});
