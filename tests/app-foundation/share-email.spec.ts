import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {RECOMMENDED_PROFILE,type Run,type Workspace} from '../../apps/witnessops-app/src/lib/model';
import {savedRunReport} from '../../apps/witnessops-app/src/lib/report-model';
import {recipientReport} from '../../apps/witnessops-app/src/lib/share-projection';
import {canonicalSource} from '../../apps/witnessops-app/src/lib/source-digest';
const snapshot=JSON.parse(readFileSync(resolve('tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json'),'utf8'));
const run:Run={id:'run-fixture',assetId:'asset-fixture',createdAt:snapshot.finished_at,profile:structuredClone(RECOMMENDED_PROFILE),snapshot,sourceDigest:createHash('sha256').update(canonicalSource(snapshot)).digest('hex')};
const safe=recipientReport(savedRunReport(run),'Release report');
for(const width of [1440,390]) test(`review email and manage access ${width}`,async({page,baseURL},info)=>{
 await page.setViewportSize({width,height:900});
 const workspace:Workspace={id:'workspace',name:'Private workspace',slug:'private',role:'owner',members:[],assets:[],runs:[run]};
 let published=false,version=1,token='a'.repeat(43),expiresAt=new Date(Date.now()+86400000).toISOString(),delivery='draft',sends=0,previews=0;
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/workspace')return route.fulfill({json:{user:{id:'owner'},workspaces:[workspace],workspace}});
  if(path==='/api/feedback')return route.fulfill({json:[]});
  if(path==='/api/events')return route.fulfill({json:{recorded:true}});
  if(path!=='/api/shares')throw new Error(path);
  const body=route.request().postDataJSON();
  if(body.action==='list')return route.fulfill({json:published?[{id:'share',state:'published',expiresAt,version}]:[]});
  if(body.action==='preview')return route.fulfill({json:{id:'share',token,digest:'digest',snapshot:safe,expiresAt,canPublish:true}});
  if(body.action==='publish'){published=true;return route.fulfill({json:{id:'share',token,digest:'digest',expiresAt}});}
  if(body.action==='access'){expect(body.version).toBe(version);version++;expiresAt=body.expiresAt;if(body.rotate)token='b'.repeat(43);return route.fulfill({json:{id:'share',version,expiresAt,token:body.rotate?token:undefined}});}
  if(body.action==='email-preview'){previews++;expect(body.token).toBe(token);delivery='draft';return route.fulfill({json:{id:'delivery',digest:'email-digest',state:'draft',message:{from:'WitnessOps Reports <reports@send.witnessops.com>',replyTo:'engage@mail.witnessops.com',to:body.email,subject:'A WitnessOps report was shared with you',text:`Release report\n${baseURL}/s#${token}\nAnyone with this link can access it.`}}});}
  if(body.action==='email-send'){sends++;expect(body.confirmed).toBe(true);expect(body.digest).toBe('email-digest');expect(body.token).toBe(token);delivery='unknown';return route.fulfill({json:{recorded:true}});}
  if(body.action==='email-history')return route.fulfill({json:previews?[{id:'delivery',recipient:'recipient@example.com',state:delivery,provider:null}]:[]});
  throw new Error(body.action);
 });
 await page.goto('/reports/'+run.id);await page.getByRole('button',{name:'Share report',exact:true}).click();
 const panel=page.getByRole('region',{name:'Recipient preview'});
 await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Publish link',exact:true}).click();
 const manage=panel.locator('details').filter({has:page.locator('summary').filter({hasText:'Manage link and email'})});
 await manage.locator('summary').focus();await page.keyboard.press('Enter');
 await manage.getByLabel('Recipient email').fill('recipient@example.com');
 await manage.getByRole('button',{name:'Preview email',exact:true}).click();
 expect(sends).toBe(0);await expect(manage.getByRole('region',{name:'Email preview'})).toContainText('Release report');
 await expect(manage.getByRole('button',{name:'Send reviewed email'})).toBeDisabled();
 await manage.getByRole('checkbox').check();await manage.getByRole('button',{name:'Send reviewed email'}).click();
 expect(sends).toBe(1);await expect(manage).toContainText('Outcome unknown — may have been sent');
 await expect(manage.getByRole('button',{name:'Send reviewed email'})).toHaveCount(0);
 await manage.getByRole('button',{name:'Refresh email history'}).click();expect(sends).toBe(1);
 await manage.getByRole('button',{name:'Rotate link — invalidate old link'}).click();
 await expect(manage.getByLabel('Current access link')).toHaveValue(`${baseURL}/s#${'b'.repeat(43)}`);
 await expect(panel.getByLabel('Published link')).toHaveValue(`${baseURL}/s#${'b'.repeat(43)}`);
 await expect(manage.getByRole('region',{name:'Email preview'})).toHaveCount(0);
 await manage.getByLabel('Expiry (UTC)').fill(new Date(Date.now()+2*86400000).toISOString().slice(0,16));
 await manage.getByRole('button',{name:'Save expiry'}).click();await expect(manage).toContainText('Expiry updated');expect(version).toBe(3);
 await manage.screenshot({path:info.outputPath(`share-email-${width}.png`)});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
