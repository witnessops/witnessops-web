import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/api/external-exposure',r=>r.fulfill({status:503,json:{error:'Mock collection unavailable'}}));await page.route('**/api/ask-witnessops', r => r.request().postDataJSON().telemetry ? r.fulfill({status:204}) : r.fulfill({json:{
 schema:'witnessops.ask.generated-answer.v1',status:'success',answer_mode:'ai_assisted',model:'fixture',
 authority_answer:{schema:'witnessops.ask.assembled-answer.v1',assembler_contract_id:'ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1',assembler_contract_version:1,deterministic_replay_hash:'fixture',template:{template_id:'fixture'},policy_decision:{template_id:'fixture'}},
 template:{template_id:'answer.public_ai.v1',body:'The free snapshot covers ten bounded public observations of one hostname.',source_display:null},route:null,recommendation:null,
 commercial_fit:{schema:'witnessops.ask.commercial-fit.v1',result:'unknown',intent:'other',offer_id:null,source:'ask',offer:null,matching_specimen_id:null},
 presented_sources:[{source_id:'public.external-exposure-snapshot',public_label:'Free External Exposure Snapshot',canonical_href:'https://witnessops.com/check',href_class:'same_site'}]
 }}));});
for(const route of ['/','/review/sample-cases','/check','/research','/docs'])test(`mobile Ask remains available: ${route}`,async({page},info)=>{
 await page.setViewportSize({width:390,height:844});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 expect((await page.goto(route))?.status()).toBe(200);
 const launcher=page.getByRole('button',{name:'Ask WitnessOps',exact:true});await expect(launcher).toBeVisible();await expect(launcher).toHaveCSS('width','48px');
 for(const position of ['middle','footer']){
  if(position==='middle')await page.locator('main').evaluate(el=>window.scrollTo(0,Math.min(el.scrollHeight/2,800)));else await page.locator('#site-footer').scrollIntoViewIfNeeded();
  await expect(launcher).toBeVisible();await page.screenshot({path:info.outputPath(`${position}.png`)});
  await launcher.click();const dialog=page.getByRole('dialog',{name:'ASK WITNESSOPS',exact:true});await expect(dialog).toBeVisible();await expect(dialog).toHaveAttribute('aria-modal','true');await expect(dialog.getByRole('region',{name:'Free External Exposure Snapshot'})).toHaveCount(0);await expect(dialog.getByLabel('Ask WitnessOps question')).toBeVisible();await expect(dialog.getByRole('button',{name:'Check my public exposure',exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Prepare my request',exact:true})).toHaveCount(0);
  await dialog.getByRole('button',{name:'Close Ask WitnessOps'}).click();await expect(dialog).not.toBeVisible();await expect(launcher).toBeFocused();
 }
 await launcher.click();const active=page.getByRole('dialog',{name:'ASK WITNESSOPS',exact:true});await active.getByRole('button',{name:'Check my public exposure',exact:true}).click();
 const offer=active.getByRole('region',{name:'Free External Exposure Snapshot'});await expect(offer).toBeVisible();await expect(offer.locator('input')).toHaveCount(0);
 await offer.getByRole('button',{name:'Run free check',exact:true}).click();await offer.getByLabel('Public hostname',{exact:true}).fill('example.com');await offer.getByRole('button',{name:'Continue',exact:true}).click();await expect(offer.getByRole('button',{name:'Add email',exact:true})).toBeVisible();await offer.getByRole('button',{name:'Skip',exact:true}).click();await expect(offer).toContainText('Confirm that you own example.com');await offer.getByRole('button',{name:'I’m authorized — run check',exact:true}).click();await page.waitForURL('**/check?hostname=example.com&source=ask');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('focused control collision hides launcher only while actually overlapped',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/check');const launcher=page.getByRole('button',{name:'Ask WitnessOps',exact:true});await expect(launcher).toBeVisible();
 const input=page.getByLabel('Public hostname',{exact:true});await input.focus();await expect(launcher).toBeVisible();
 await input.evaluate(el=>{el.style.position='fixed';el.style.bottom='16px';el.style.right='16px';el.style.width='100px';el.style.height='48px';});await input.focus();await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await expect(launcher).not.toBeVisible();await input.evaluate(el=>{el.removeAttribute('style');el.blur();});await expect(launcher).toBeVisible();
});
for(const width of [1440,390])test(`footer and research at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/research');await expect(page).toHaveTitle(/Research & articles/);await expect(page.getByRole('heading',{name:'Research & articles',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('research.png')});
 const footer=page.locator('#site-footer');await footer.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('footer.png')});
 const links={'Agent Action Security Review':'/catalog/workflows','External Attack Surface Review':'/catalog/offsec-external-exposure','Our approach':'/why-witnessops','Research & articles':'/research','Sample work':'/review/sample-cases','Free check':'/check','Docs':'/docs','Verify a receipt':'/verify'};
 for(const [name,href] of Object.entries(links))await expect(footer.getByRole('link',{name,exact:true})).toHaveAttribute('href',href);
 await expect(footer).not.toContainText('Repair and handover');await expect(footer.getByRole('link',{name:'Scope a review',exact:true})).toHaveAttribute('href',/\/review\/request/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'How to read a public exposure snapshot',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('How to read a public exposure snapshot');await expect(page.locator('main')).toContainText('No new target was checked');await expect(page.getByRole('button',{name:'Ask WitnessOps',exact:true})).toBeVisible();
 expect((await page.goto('/catalog/automation-repair'))?.status()).toBe(200);await expect(page.locator('main')).toContainText('Automation Repair');
});
test('Polish footer uses supported destinations and labels English-only surfaces',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/pl');const footer=page.locator('#site-footer');
 for(const [label,href] of [['Agent Action Security Review (EN)','/catalog/workflows'],['External Attack Surface Review','/pl/catalog/offsec-external-exposure'],['Badania i artykuły (EN)','/research'],['Bezpłatne sprawdzenie (EN)','/check'],['Dokumentacja','/pl/docs']])await expect(footer.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',href);
 await expect(footer).not.toContainText('Naprawa i przekazanie');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await page.goto('/pl/catalog/offsec-external-exposure'))?.status()).toBe(200);
});
