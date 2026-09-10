import { test, expect, type Page, type Locator } from '@playwright/test';
import { BUYER_SERVICES, buyerServiceRequestHref } from '../../apps/witnessops-web/src/lib/buyer-services';
const repair=BUYER_SERVICES.find(s=>s.id==='automation-repair-handover')!;
function answer(text:string,service=repair,free=false) {
 const url=new URL(buyerServiceRequestHref('en',service),'https://witnessops.com');url.searchParams.set('source','ask');
 return {model:'test-model',authority_answer:{schema:'witnessops.ask.assembled-answer.v1',assembler_contract_id:'ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1',assembler_contract_version:1,deterministic_replay_hash:'local-browser-fixture',template:{template_id:'fixture'},policy_decision:{template_id:'fixture'}},schema:'witnessops.ask.generated-answer.v1',status:'success',answer_mode:'ai_assisted',template:{template_id:'answer.public_ai.v1',body:text,source_display:null},route:null,
 recommendation:free?null:{service_id:service.id,name:service.name.en,price_label:service.price.en,delivery_label:service.timing.en,detail_href:service.detailHref.en,request_href:url.pathname+url.search},
 commercial_fit:{schema:'witnessops.ask.commercial-fit.v1',result:'unknown',intent:'other',offer_id:null,source:'ask',offer:null,matching_specimen_id:null},
 presented_sources:[{source_id:free?'public.external-exposure-snapshot':`service.${service.id}`,public_label:free?'Free External Exposure Snapshot':'Service scope',canonical_href:`https://witnessops.com${free?'/check':service.detailHref.en}`,href_class:'same_site'}]};
}

async function visibleInHistory(target: Locator) {
 await expect.poll(()=>target.evaluate(el=>{
  const r=el.closest('[data-ask-scroll-region]')!, a=el.getBoundingClientRect(), b=r.getBoundingClientRect();
  return a.top>=b.top-1 && a.bottom<=b.bottom+1 && a.bottom<=innerHeight;
 })).toBe(true);
}
async function open(page:Page,widget:boolean){await page.goto(widget?'/':'/docs/assistant');if(widget)await page.getByRole('button',{name:'Ask WitnessOps',exact:true}).click();}
async function mock(page:Page,text='A useful next step.',free=false){await page.route('**/api/ask-witnessops',r=>r.request().postDataJSON().telemetry?r.fulfill({status:204}):r.fulfill({json:answer(text,repair,free)}));}
for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844},{width:390,height:667}])for(const widget of [true,false])test(`fresh ${widget?'widget':'page'} ${viewport.width}x${viewport.height}`,async({page},info)=>{
 await page.setViewportSize(viewport);await open(page,widget);
 const shell=page.locator(widget?'#ask-witnessops-dialog':'[data-ask-page]');
 if(widget){await expect(shell).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(shell).toHaveCSS('opacity','1');}
 const composer=shell.locator('[data-ask-composer]');
 expect(await composer.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1})).toBe(true);
 expect(await shell.locator('[data-ask-scroll-region]').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(shell.getByLabel('Ask WitnessOps question')).toBeVisible();
 await expect(shell.getByLabel('Public hostname')).toHaveCount(0);await expect(shell.getByRole('button',{name:'Prepare my request',exact:true})).toHaveCount(0);
 await page.screenshot({path:info.outputPath('fresh.png')});
});
for(const widget of [true,false])test(`progressive active steps fit without scrolling ${widget?'widget':'page'}`,async({page},info)=>{
 await page.setViewportSize({width:390,height:667});await mock(page,'Ten bounded observations, one hostname.',true);await open(page,widget);
 await page.getByRole('button',{name:'Check my public exposure',exact:true}).click();const card=page.getByRole('region',{name:'Free External Exposure Snapshot'});
 await visibleInHistory(card.getByRole('button',{name:'Run free check',exact:true}));await page.screenshot({path:info.outputPath('offer.png')});
 await card.getByRole('button',{name:'Run free check',exact:true}).click();const host=card.getByLabel('Public hostname');await expect(host).toBeFocused();await visibleInHistory(host);await page.screenshot({path:info.outputPath('hostname.png')});
 await host.fill('example.com');await card.getByRole('button',{name:'Continue',exact:true}).click();await visibleInHistory(card.getByRole('button',{name:'Skip',exact:true}));await page.screenshot({path:info.outputPath('email-choice.png')});
 await card.getByRole('button',{name:'Add email',exact:true}).click();const email=card.getByLabel('Work email (optional)');await expect(email).toBeFocused();await visibleInHistory(email);await email.fill('');await card.getByRole('button',{name:'Continue',exact:true}).click();await visibleInHistory(card.getByRole('button',{name:'I’m authorized — run check',exact:true}));await page.screenshot({path:info.outputPath('authorization.png')});
});
for(const widget of [true,false])test(`follow respects upward reader and long answer start ${widget?'widget':'page'}`,async({page},info)=>{
 await page.setViewportSize({width:390,height:844});let n=0;let release:()=>void=()=>{};
 await page.route('**/api/ask-witnessops',async r=>{if(r.request().postDataJSON().telemetry)return r.fulfill({status:204});n++;if(n===2)await new Promise<void>(resolve=>release=resolve);await r.fulfill({json:answer(n===1?'Beginning of first reply. '+ 'A useful explanation. '.repeat(150):'Newest reply begins here. '+ 'New detail. '.repeat(150))});});
 await open(page,widget);const input=page.getByLabel('Ask WitnessOps question'), history=page.locator('[data-ask-scroll-region]');
 await input.fill('Our workflow stopped.');await input.press('Enter');await expect(page.getByText(/Beginning of first reply/).first()).toBeVisible();
 await expect.poll(()=>history.evaluate(e=>e.scrollTop)).toBeGreaterThanOrEqual(0);
 // Follow from the genuine bottom, then move up while the next answer is pending.
 await history.evaluate(e=>{e.scrollTop=e.scrollHeight});await page.waitForTimeout(100);await input.fill('What comes next?');await input.press('Enter');
 await history.evaluate(e=>{e.scrollTop=0});await page.waitForTimeout(100);release();
 await expect(page.getByRole('button',{name:'New reply ↓',exact:true})).toBeVisible();expect(await history.evaluate(e=>e.scrollTop)).toBeLessThan(5);await page.screenshot({path:info.outputPath('reader-up.png')});
 await page.getByRole('button',{name:'New reply ↓',exact:true}).click();await expect(page.getByRole('button',{name:'New reply ↓',exact:true})).toHaveCount(0);
 expect(await history.evaluate(e=>e.scrollHeight-e.clientHeight-e.scrollTop)).toBeGreaterThan(120);
 await page.screenshot({path:info.outputPath('new-reply-start.png')});
});

for(const widget of [true,false])test(`structured intake replaces chat and cancels without losing context ${widget?'widget':'page'}`,async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await mock(page,'A bounded snapshot starts after your authorization.',true);await open(page,widget);
 await page.getByRole('button',{name:'Check my public exposure',exact:true}).click();const card=page.getByRole('region',{name:'Free External Exposure Snapshot'});
 await expect(card.getByRole('button',{name:'Run free check',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('offered.png')});
 await card.getByRole('button',{name:'Run free check',exact:true}).click();await expect(page.getByLabel('Ask WitnessOps question')).toHaveCount(0);
 await expect(card.getByLabel('Public hostname')).toHaveAttribute('placeholder','example.com');await page.screenshot({path:info.outputPath('hostname.png')});
 await card.getByLabel('Public hostname').fill('example.com');await card.getByRole('button',{name:'Continue',exact:true}).click();await card.getByRole('button',{name:'Add email',exact:true}).click();
 await expect(card.getByLabel('Work email (optional)')).toHaveAttribute('placeholder','name@company.com');await expect(page.getByLabel('Ask WitnessOps question')).toHaveCount(0);await page.screenshot({path:info.outputPath('email.png')});
 await card.getByRole('button',{name:'Continue',exact:true}).click();await expect(card.locator('input')).toHaveCount(0);await expect(page.getByLabel('Ask WitnessOps question')).toHaveCount(0);await page.screenshot({path:info.outputPath('authorization.png')});
 await card.getByRole('button',{name:'Cancel free check',exact:true}).click();await expect(page.getByLabel('Ask WitnessOps question')).toBeVisible();await expect(page.getByText('A bounded snapshot starts after your authorization.',{exact:true}).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const widget of [true,false])test(`long Free Check reply starts at its beginning ${widget?'widget':'page'}`,async({page},info)=>{
 await page.setViewportSize({width:390,height:667});await mock(page,'Beginning of the bounded explanation. '+ 'These observations have a limited scope. '.repeat(90),true);await open(page,widget);
 await page.getByRole('button',{name:'Check my public exposure',exact:true}).click();
 const reply=page.getByText(/^Beginning of the bounded explanation/).first();await expect(reply).toBeVisible();
 await expect.poll(()=>reply.evaluate(el=>{const r=el.getBoundingClientRect(),b=el.closest('[data-ask-scroll-region]')!.getBoundingClientRect();return r.top>=b.top-1&&r.top<b.bottom})).toBe(true);
 await page.screenshot({path:info.outputPath('long-answer-start.png')});
});

async function expectMobileSurface(page: Page, height: number) {
 const dialog=page.locator('#ask-witnessops-dialog');
 await expect(dialog).toHaveAttribute('aria-modal','true');
 await expect.poll(()=>dialog.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})).toEqual({x:0,y:0,width:page.viewportSize()!.width,height});
 await expect(dialog).toHaveCSS('border-radius','0px');
 await expect(dialog).toHaveCSS('max-height','none');
 await expect(dialog).toHaveCSS('overflow-y','hidden');
 await expect(dialog.locator('[data-ask-chrome]')).toBeInViewport();
 expect(await dialog.evaluate(root=>Array.from(root.querySelectorAll('*')).filter(e=>{const s=getComputedStyle(e);return ['auto','scroll'].includes(s.overflowY)&&e.scrollHeight>e.clientHeight+1&&e.getBoundingClientRect().height>0;}).length)).toBeLessThanOrEqual(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('button',{name:'Ask WitnessOps',exact:true})).toHaveCount(0);
}

for(const viewport of [{width:390,height:844},{width:390,height:667},{width:430,height:932}])test(`mobile full viewport, inert background and focus return ${viewport.width}x${viewport.height}`,async({page},info)=>{
 await page.setViewportSize(viewport);await mock(page);await page.goto('/');
 await page.evaluate(()=>window.scrollTo(0,400));
 const before=await page.evaluate(()=>scrollY), launcher=page.getByRole('button',{name:'Ask WitnessOps',exact:true});
 await launcher.click();await expectMobileSurface(page,viewport.height);
 await expect(page.locator('[data-ask-composer]')).toBeInViewport();
 expect(await page.locator('main').evaluate(e=>Boolean(e.closest('[inert]')))).toBe(true);
 await expect(page.locator('body')).toHaveCSS('overflow','hidden');
 for(const [x,y] of [[1,1],[viewport.width-2,viewport.height-2]])expect(await page.evaluate(({x,y})=>Boolean(document.elementFromPoint(x,y)?.closest('#ask-witnessops-dialog')),{x,y})).toBe(true);
 await page.screenshot({path:info.outputPath('mobile-fullscreen-fresh.png')});
 // Both forward and backward focus navigation remain inside the existing modal.
 await page.getByRole('button',{name:'Close Ask WitnessOps',exact:true}).focus();
 await page.keyboard.press('Shift+Tab');expect(await page.locator('#ask-witnessops-dialog').evaluate(e=>e.contains(document.activeElement))).toBe(true);
 await page.mouse.move(10,viewport.height-10);await page.mouse.wheel(0,300);
 expect(await page.evaluate(()=>scrollY)).toBe(before);
 await page.getByRole('button',{name:'Close Ask WitnessOps',exact:true}).click();
 await expect(launcher).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(before);
 expect(await page.locator('main').evaluate(e=>Boolean(e.closest('[inert]')))).toBe(false);
});

for(const width of [768,1440])test(`larger Ask remains a floating panel ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await open(page,true);
 const dialog=page.locator('#ask-witnessops-dialog');await expect(dialog).toHaveAttribute('aria-modal','false');
 await expect(dialog).toHaveCSS('border-radius','8px');
 // WebKit's page scrollbar can put a 768px window below the existing 767px content breakpoint.
 const expectedHeight=await page.evaluate(()=>matchMedia('(max-width: 767px)').matches?650:760);
 await expect.poll(async()=>Math.round((await dialog.boundingBox())!.height)).toBe(expectedHeight);
 const bounds=await dialog.boundingBox();expect(bounds!.width).toBe(520);expect(bounds!.x).toBeGreaterThan(0);expect(bounds!.y).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('desktop-floating-panel.png')});
});

test('mobile full-screen conversation, structured steps, draft and keyboard geometry',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});let free=false;
 await page.route('**/api/ask-witnessops',r=>r.request().postDataJSON().telemetry?r.fulfill({status:204}):r.fulfill({json:answer(free?'Ten bounded observations after explicit authorization.':'A person needs to confirm fit and availability.',repair,free)}));
 await open(page,true);const input=page.getByLabel('Ask WitnessOps question');
 for(const question of ['Our live workflow stopped sending leads yesterday.','We need diagnosis today.']){await input.fill(question);await input.press('Enter');await expect(input).toHaveValue('');await expect(page.getByRole('button',{name:'Prepare my request',exact:true})).toBeVisible();}
 await expectMobileSurface(page,844);await page.screenshot({path:info.outputPath('mobile-fullscreen-conversation.png')});
 await page.getByRole('button',{name:'Prepare my request',exact:true}).click();const draft=page.getByLabel(/Draft request/);await expect(draft).toBeVisible();await draft.scrollIntoViewIfNeeded();await expectMobileSurface(page,844);await page.screenshot({path:info.outputPath('mobile-fullscreen-draft.png')});
 await page.getByRole('button',{name:'Close Ask WitnessOps',exact:true}).click();await page.getByRole('button',{name:'Ask WitnessOps',exact:true}).click();
 // A fresh page resets only the fixture session for the independent structured flow.
 await page.reload();free=true;await page.getByRole('button',{name:'Ask WitnessOps',exact:true}).click();
 await page.getByRole('button',{name:'Check my public exposure',exact:true}).click();const card=page.getByRole('region',{name:'Free External Exposure Snapshot'});
 await card.getByRole('button',{name:'Run free check',exact:true}).click();const host=card.getByLabel('Public hostname');await visibleInHistory(host);await expectMobileSurface(page,844);await page.screenshot({path:info.outputPath('mobile-fullscreen-hostname.png')});
 // Emulate the existing visualViewport resize event, without changing application logic.
 await page.evaluate(()=>{Object.defineProperty(window.visualViewport!,'height',{configurable:true,value:480});window.visualViewport!.dispatchEvent(new Event('resize'));});
 await expectMobileSurface(page,480);await visibleInHistory(host);
 expect(await page.evaluate(()=>getComputedStyle(document.elementFromPoint(5,700)!).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
 await page.screenshot({path:info.outputPath('mobile-keyboard-simulation.png')});
 await page.evaluate(()=>{delete (window.visualViewport as unknown as Record<string,unknown>).height;window.visualViewport!.dispatchEvent(new Event('resize'));});
 await host.fill('example.com');await card.getByRole('button',{name:'Continue',exact:true}).click();await card.getByRole('button',{name:'Add email',exact:true}).click();await visibleInHistory(card.getByLabel('Work email (optional)'));await expectMobileSurface(page,844);await page.screenshot({path:info.outputPath('mobile-fullscreen-email.png')});
 await card.getByRole('button',{name:'Continue',exact:true}).click();await visibleInHistory(card.getByRole('button',{name:'I’m authorized — run check',exact:true}));await expectMobileSurface(page,844);await page.screenshot({path:info.outputPath('mobile-fullscreen-authorization.png')});
});
