import { test, expect } from '@playwright/test';
import { BUYER_SERVICES, buyerServiceRequestHref } from '../../apps/witnessops-web/src/lib/buyer-services';
const repair=BUYER_SERVICES.find(s=>s.id==='automation-repair-handover')!;
const agent=BUYER_SERVICES.find(s=>s.id==='bounded-workflow-review')!;
function answer(text:string,service=repair,free=false) {
 const url=new URL(buyerServiceRequestHref('en',service),'https://witnessops.com');url.searchParams.set('source','ask');
 return {model:'test-model',authority_answer:{schema:'witnessops.ask.assembled-answer.v1',assembler_contract_id:'ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1',assembler_contract_version:1,deterministic_replay_hash:'local-browser-fixture',template:{template_id:'fixture'},policy_decision:{template_id:'fixture'}},schema:'witnessops.ask.generated-answer.v1',status:'success',answer_mode:'ai_assisted',template:{template_id:'answer.public_ai.v1',body:text,source_display:null},route:null,
 recommendation:free?null:{service_id:service.id,name:service.name.en,price_label:service.price.en,delivery_label:service.timing.en,detail_href:service.detailHref.en,request_href:url.pathname+url.search},
 commercial_fit:{schema:'witnessops.ask.commercial-fit.v1',result:'unknown',intent:'other',offer_id:null,source:'ask',offer:null,matching_specimen_id:null},
 presented_sources:[{source_id:free?'public.external-exposure-snapshot':`service.${service.id}`,public_label:free?'Free External Exposure Snapshot':'Service scope',canonical_href:`https://witnessops.com${free?'/check':service.detailHref.en}`,href_class:'same_site'}]};
}
for(const width of [1440,390]) test(`conversation, pricing card, correction, draft and composer at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const requests:any[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/ask-witnessops',async r=>{if(r.request().postDataJSON().telemetry)return r.fulfill({status:204});requests.push(r.request().postDataJSON());await r.fulfill({json:answer(requests.length===1?"A successful workflow run does not establish delivery to HubSpot. Are leads missing entirely, arriving late, or arriving with the wrong fields?":"A person needs to confirm fit and availability. Prepare a request with the deadline you need.")});});
 let contactCalls=0;await page.route('**/api/contact',r=>{contactCalls++;return r.abort();});
 await page.goto('/docs/assistant');const main=page.locator('main');const input=main.getByRole('textbox',{name:'Ask WitnessOps question'});
 await expect(page.getByRole('heading',{level:1})).toHaveText('Ask WitnessOps');await expect(main).toContainText('AI guide to finding the right next step.');
 await expect(page.locator('aside')).toHaveCount(0);await expect(main.getByRole('button',{name:'Send',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('fresh.png')});
 for(const question of ["Our n8n workflow says success, but leads stopped reaching HubSpot yesterday.","Missing. It is live and we need it today.","No, nothing changed. It just stopped reaching HubSpot.","It affects inbound leads.","Please prepare a request."]){
  await input.fill(question);await main.getByRole('button',{name:'Send',exact:true}).click();await expect(input).toHaveValue('');
 }
 expect(requests).toHaveLength(5);expect(JSON.stringify(requests[4].history)).toContain('nothing changed');expect(JSON.stringify(requests[4].history)).toContain('today');
 await expect(main.getByRole('region',{name:'Suggested service'})).toHaveCount(1);await expect(main).toContainText(repair.price.en);
 await main.getByRole('region',{name:'Suggested service'}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('conversation-card.png')});
 await main.getByRole('button',{name:'Prepare my request',exact:true}).click();const draft=main.getByLabel(/Draft request/);await expect(draft).toHaveValue(/nothing changed/);await expect(draft).toHaveValue(/today/);await expect(draft).not.toHaveValue(/A person needs/);expect(contactCalls).toBe(0);
 await draft.fill('Edited visitor request.');await expect(draft).toHaveValue('Edited visitor request.');await page.screenshot({path:info.outputPath('draft.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('Polish answer has Polish catalogue card/actions from English route',async({page},info)=>{
 await page.route('**/api/ask-witnessops',r=>r.fulfill({json:answer('Przegląd dotyczy kontroli zatwierdzania zwrotów. Czy agent już realizuje zwroty, czy sprawdzacie go przed uruchomieniem?',agent)}));
 await page.setViewportSize({width:390,height:844});await page.goto('/docs/assistant');await page.getByLabel('Ask WitnessOps question').fill('Agent zwrotów jest już uruchomiony. Klient prosi o dowód egzekwowania zatwierdzenia.');await page.getByRole('button',{name:'Wyślij',exact:true}).click();
 await expect(page.getByRole('button',{name:'Przygotuj moją prośbę',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Zobacz zakres'})).toBeVisible();await expect(page.getByRole('region',{name:'Suggested service'})).toContainText(agent.price.pl);await page.screenshot({path:info.outputPath('polish-card.png')});let submitted=0;await page.route('**/api/contact',r=>{submitted++;return r.abort();});await page.getByRole('button',{name:'Przygotuj moją prośbę',exact:true}).click();await expect(page.getByLabel(/Szkic prośby/)).toHaveValue('Agent zwrotów jest już uruchomiony.\nKlient prosi o dowód egzekwowania zatwierdzenia.');expect(submitted).toBe(0);
});
test('free check remains an explicit action without a required email',async({page},info)=>{
 let scans=0;await page.route('**/api/external-exposure',r=>{scans++;return r.abort();});await page.route('**/api/ask-witnessops',r=>r.fulfill({json:answer('The free snapshot makes ten bounded public observations of one hostname. It is not a complete security assessment. Use Run free check to continue.',repair,true)}));
 await page.setViewportSize({width:390,height:844});await page.goto('/docs/assistant');await page.getByLabel('Ask WitnessOps question').fill('Can you check my website externally?');await page.getByRole('button',{name:'Send',exact:true}).click();
 const card=page.getByRole('region',{name:'Free External Exposure Snapshot'});await expect(card).toBeVisible();expect(scans).toBe(0);await expect(card.locator('input')).toHaveCount(0);await expect(card.getByRole('button',{name:'Run free check',exact:true})).toBeVisible();await card.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('free-check.png')});
});
