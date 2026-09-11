import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyProofpack } from '../../apps/witnessops-web/src/lib/proofpack/verify.mjs';
import { pinnedRegistryInput } from '../../apps/witnessops-web/src/lib/proofpack/pinned-registry';
import { localAuditAdapter } from '../../apps/witnessops-web/src/lib/proofpack/local-audit-adapter';
import type { LinuxCheckRun, Workspace } from '../../apps/witnessops-app/src/lib/model';
const name='proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
const path=resolve('tests/proofpack/production-fixtures/complete',name);
for(const width of [1440,390]) test(`Linux import and existing report UI ${width}`,async({page},info)=>{
  const checked=await verifyProofpack({proofpack:{name,bytes:readFileSync(path)},signature:{name:name+'.sig.json',bytes:readFileSync(path+'.sig.json')},trust_registry:pinnedRegistryInput()});
  expect(checked.status).toBe('valid');
  const model=localAuditAdapter(checked,'2026-09-11T12:00:00Z')!;
  const run:LinuxCheckRun={id:'linux-run',assetId:'linux-asset',createdAt:'2026-09-11T12:00:00Z',sourceDigest:model.identity.sourceDigest,proofRunId:checked.proof_run_id,verifierVersion:checked.verifier_version,profileId:'linux_baseline_v1',outcome:checked.outcome,synthetic:true,observedHostname:'demo-host',observedAt:model.subject.observedAt,sourceAssetId:'asset-demo-host-001',machineIdentity:null};
  const ws:Workspace={id:'workspace-a',name:'Synthetic workspace',slug:'workspace-a',role:'owner',assets:[],runs:[],linuxRuns:[],members:[]};
  let imports=0,reopens=0,collections=0;
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname==='/api/workspace') return route.fulfill({json:{user:{id:'owner',displayName:'Synthetic owner'},workspaces:[ws],workspace:ws}});
    if(url.pathname==='/api/feedback') return route.fulfill({json:[]});
    if(url.pathname==='/api/assets') {const data=req.postDataJSON();expect(data.type).toBe('linux_server');ws.assets.push({id:'linux-asset',hostname:data.hostname,type:data.type,createdAt:run.createdAt});return route.fulfill({status:201,json:ws.assets[0]});}
    if(url.pathname==='/api/linux-checks') {
      if(req.method()==='POST') {
        // Playwright's intercepted multipart postData omits file bytes. Exact
        // transport/storage custody is exercised by the PostgreSQL/API suite.
        imports++;ws.linuxRuns=[run];return route.fulfill({status:201,json:run});
      }
      reopens++; return route.fulfill({json:{run,model}});
    }
    if(url.pathname==='/api/runs') collections++;
    throw new Error('Unexpected product call '+url.pathname);
  });
  await page.setViewportSize({width,height:1000});await page.goto('/assets/new');
  await page.getByLabel('Asset type').selectOption('linux_server');await page.getByLabel('Recorded Linux hostname').fill('demo-host');
  await page.getByRole('button',{name:'Add without scanning',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Import Security Check'})).toBeVisible();
  await page.getByLabel('Original Proofpack ZIP').setInputFiles(path);await page.getByLabel('Detached signature (.zip.sig.json)').setInputFiles(path+'.sig.json');
  expect(await page.getByLabel('Original Proofpack ZIP').evaluate((input:HTMLInputElement)=>input.files?.[0]?.size)).toBe(readFileSync(path).length);
  await page.screenshot({path:info.outputPath('linux-import.png'),fullPage:true});
  await page.getByRole('button',{name:'Import Security Check',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Saved check',exact:true})).toBeVisible();
  await expect(page.locator('main')).toContainText('does not establish');
  await expect(page.locator('main')).toContainText(model.identity.sourceDigest);
  await page.screenshot({path:info.outputPath('linux-reopened-report.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();await expect(page.getByRole('heading',{name:'Saved check',exact:true})).toBeVisible();
  expect(reopens).toBeGreaterThanOrEqual(2);expect(imports).toBe(1);expect(collections).toBe(0);expect(errors).toEqual([]);
  ws.role='viewer';await page.goto('/assets/linux-asset');await expect(page.getByText('Viewer access · Only an Owner can import a check.')).toBeVisible();await expect(page.getByRole('button',{name:'Import Security Check'})).toHaveCount(0);
  await page.goto('/runs/foreign-run');await expect(page.getByRole('heading',{name:'Run not found'})).toBeVisible();
});
