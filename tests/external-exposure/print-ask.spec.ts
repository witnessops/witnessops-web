import { test, expect } from '@playwright/test';
import { externalExposureAdapter, validateExternalSnapshot } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
import { snapshotFixture } from './fixture';
const snapshot=validateExternalSnapshot(snapshotFixture()), model=externalExposureAdapter(snapshot);
test.beforeEach(async({page,baseURL})=>{
 await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(baseURL!).origin?r.continue():r.abort());
 await page.route('**/api/external-exposure',r=>r.fulfill({json:{snapshot,model}}));
 await page.route('**/api/ask-witnessops',r=>r.fulfill({json:{ok:true}}));
 await page.addInitScript(()=>{window.print=()=>{};});
});
test('website navigation exports only the unchanged buyer report',async({page,browserName},info)=>{
 await page.goto('/');await page.getByRole('link',{name:'Free check',exact:true}).first().click();
 await page.getByLabel('Public hostname',{exact:true}).fill('example.com');await page.getByRole('button',{name:'Run free check',exact:true}).click();
 await page.getByRole('button',{name:'View full report',exact:true}).click();
 const before=await page.locator('#external-buyer-report article').innerHTML();
 await page.getByRole('button',{name:'Save report as PDF',exact:true}).click();
 await page.emulateMedia({media:'print'});const printed=page.locator('[data-buyer-print-root] article');await expect(printed).toBeVisible();expect(await printed.innerHTML()).toBe(before);
 for(const selector of ['nav[aria-label="Primary navigation"]','#site-footer','form[aria-label="Run an external exposure snapshot"]'])await expect(page.locator(selector)).not.toBeVisible();
 expect(await page.locator('body > :not([data-buyer-print-root])').evaluateAll(xs=>xs.every(x=>getComputedStyle(x).display==='none'))).toBe(true);
 await expect(printed).toContainText(snapshot.checks.find(x=>x.status==='NEEDS_ATTENTION')!.title);await expect(printed).toContainText('This snapshot covers ten defined public observations');await expect(printed).toContainText('Verification appendix');await expect(page.locator('body')).toHaveCSS('background-color','rgb(255, 255, 255)');
 if(browserName==='chromium')await page.pdf({path:info.outputPath('report-only-A4.pdf'),format:'A4',printBackground:true});
 await page.emulateMedia({media:'screen'});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('result-mobile.png'),fullPage:true});
});
for(const email of ['', 'private-contact@work.example'])test(`Ask handoff without hidden submission: ${email?'email':'no email'}`,async({page},info)=>{
 const allSent:{url:string;body:string}[]=[];
 const sent:{url:string;body:string}[]=[];page.on('request',r=>{if(r.method()!=='GET'){const row={url:r.url(),body:r.postData()??''};allSent.push(row);if(row.url.endsWith('/api/ask-witnessops') && JSON.parse(row.body).telemetry){expect(row.body).not.toContain('private-contact');return;}sent.push(row);}});
 await page.goto('/docs/assistant');const card=page.getByRole('region',{name:'Free External Exposure Snapshot',exact:true});await expect(card).toBeVisible();
 await card.getByLabel('Public hostname',{exact:true}).fill('Example.com.');if(email)await card.getByLabel('Work email (optional)',{exact:true}).fill(email);
 await card.getByRole('button',{name:'Run free check',exact:true}).click();expect(page.url()).toContain('/docs/assistant');expect(sent).toHaveLength(0);
 await card.getByRole('checkbox').check();await page.screenshot({path:info.outputPath('ask-handoff.png'),fullPage:true});await card.getByRole('button',{name:'Run free check',exact:true}).click();await page.waitForURL('**/check?hostname=example.com&source=ask');
 expect(page.url()).not.toContain('private-contact');expect(sent).toHaveLength(0);await expect(page.getByLabel('Public hostname',{exact:true})).toHaveValue('example.com');await expect(page.getByRole('button',{name:'Run free check',exact:true})).toBeFocused();expect(await page.evaluate(()=>sessionStorage.getItem('witnessops.ask-check.v1'))).toBeNull();
 await page.getByRole('button',{name:'Run free check',exact:true}).click();await expect(page.getByRole('button',{name:'Save report as PDF'})).toBeVisible();expect(sent).toHaveLength(1);expect(sent[0].url).toContain('/api/external-exposure');expect(JSON.parse(sent[0].body)).toEqual({hostname:'example.com'});
 if(email){await page.getByRole('button',{name:'Discuss this result',exact:true}).click();await expect(page.locator('input[type=email]')).toHaveValue(email);expect(sent).toHaveLength(1);}else await expect(page.getByRole('button',{name:'Discuss this result',exact:true})).toHaveCount(0);
 expect(allSent.every(r=>!r.url.includes('private-contact')&&!r.body.includes('private-contact'))).toBe(true);
});
test('crafted Ask URL prefills but never starts collection',async({page})=>{let calls=0;await page.route('**/api/external-exposure',r=>{calls++;return r.fulfill({json:{snapshot,model}});});await page.goto('/check?hostname=example.com&source=ask');await expect(page.getByLabel('Public hostname',{exact:true})).toHaveValue('example.com');expect(calls).toBe(0);});
