import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {RECOMMENDED_PROFILE,type Run} from '../../apps/witnessops-app/src/lib/model';
import {savedRunReport} from '../../apps/witnessops-app/src/lib/report-model';
import {recipientReport} from '../../apps/witnessops-app/src/lib/share-projection';
import {canonicalSource} from '../../apps/witnessops-app/src/lib/source-digest';
const snapshot=JSON.parse(readFileSync(resolve('tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json'),'utf8'));
const run:Run={id:'run-fixture',assetId:'asset-fixture',createdAt:snapshot.finished_at,profile:structuredClone(RECOMMENDED_PROFILE),snapshot,sourceDigest:createHash('sha256').update(canonicalSource(snapshot)).digest('hex')};
const safe=recipientReport(savedRunReport(run),'Password specimen');
for(const width of [1440,390])test(`password recipient memory, navigation, expiry and revocation ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const token='a'.repeat(43),credential='b'.repeat(43),secret='synthetic password only';let valid=true,revoked=false,attempts=0;
 await page.route('**/api/shared-report',route=>{
  const body=route.request().postDataJSON();
  if(revoked||body.token!==token)return route.fulfill({status:404,json:{error:'Shared report unavailable.'}});
  if(body.action==='unlock'){attempts++;return body.password===secret?route.fulfill({json:{unlock:credential,expiresAt:new Date(Date.now()+1800000).toISOString()}}):route.fulfill({status:401,json:{passwordRequired:true,error:'Password did not unlock this report.'}});}
  if(body.unlock!==credential||!valid)return route.fulfill({status:401,json:{passwordRequired:true,error:'This report requires its password.'}});
  return route.fulfill({json:{snapshot:safe,digest:'d'.repeat(64),passwordProtected:true,expiresAt:new Date(Date.now()+86400000).toISOString()}});
 });
 await page.goto('/s#'+token);await expect(page.getByRole('heading',{name:'Password required'})).toBeVisible();await expect(page.getByText('Password specimen',{exact:true})).toHaveCount(0);
 await page.getByLabel('Report password',{exact:true}).fill('wrong');await page.keyboard.press('Enter');await expect(page.locator('main').getByRole('alert')).toContainText('did not unlock');await expect(page.getByLabel('Report password',{exact:true})).toHaveValue('');
 await page.getByLabel('Report password',{exact:true}).fill(secret);await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Password specimen'})).toBeVisible();
 await page.getByRole('button',{name:'Findings',exact:true}).click();expect(new URL(page.url()).hash).toBe('#'+token);
 expect(await page.evaluate(()=>JSON.stringify([localStorage,sessionStorage,document.cookie]))).not.toContain(credential);expect(attempts).toBe(2);
 await page.reload();await expect(page.getByRole('heading',{name:'Password required'})).toBeVisible();
 await page.getByLabel('Report password',{exact:true}).fill(secret);await page.getByRole('button',{name:'Unlock report'}).click();await expect(page.getByRole('heading',{name:'Password specimen'})).toBeVisible();
 valid=false;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.getByRole('heading',{name:'Password required'})).toBeVisible();await expect(page.getByText('Password specimen',{exact:true})).toHaveCount(0);
 await page.screenshot({path:info.outputPath(`password-required-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 revoked=true;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.locator('main').getByRole('alert')).toContainText('unavailable');await expect(page.getByLabel('Report password',{exact:true})).toHaveCount(0);
});

test('Owner protects preview before explicit publication and clears typed passwords',async({page})=>{
 const workspace={id:'workspace',name:'Private workspace',slug:'private',role:'owner',members:[],assets:[],runs:[run]};let protectedShare=false,published=false;let version=1;
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;if(path==='/api/workspace')return route.fulfill({json:{user:{id:'owner'},workspaces:[workspace],workspace}});if(path==='/api/feedback')return route.fulfill({json:[]});if(path==='/api/events')return route.fulfill({json:{recorded:true}});
  expect(path).toBe('/api/shares');const body=route.request().postDataJSON();
  if(body.action==='list')return route.fulfill({json:published?[{id:'share',state:'published',version,passwordProtected:protectedShare,expiresAt:new Date(Date.now()+86400000).toISOString()}]:[]});
  if(body.action==='preview')return route.fulfill({json:{id:'share',token:'a'.repeat(43),digest:'digest',snapshot:safe,version,passwordProtected:protectedShare,canPublish:true,expiresAt:new Date(Date.now()+86400000).toISOString()}});
  if(body.action==='password'){expect(body.version).toBe(1);expect(body.password).toBe('synthetic password only');protectedShare=true;version++;return route.fulfill({json:{version,passwordProtected:true,expiresAt:new Date(Date.now()+86400000).toISOString()}});}
  if(body.action==='publish'){expect(protectedShare).toBe(true);expect(body.audience).toBe('link_and_password');published=true;return route.fulfill({json:{id:'share',token:'a'.repeat(43)}});}
  if(body.action==='email-history')return route.fulfill({json:[]});throw new Error(body.action);
 });
 await page.goto('/reports/'+run.id);await page.getByRole('button',{name:'Share report',exact:true}).click();const panel=page.getByRole('region',{name:'Recipient preview'});
 await panel.getByLabel('New report password',{exact:true}).fill('synthetic password only');await panel.getByLabel('Repeat report password').fill('synthetic password only');await panel.getByRole('button',{name:'Require password',exact:true}).click();
 await expect(panel.getByRole('status')).toContainText('Password protection saved');await expect(panel.getByLabel('New report password',{exact:true})).toHaveValue('');expect(published).toBe(false);
 await expect(panel.getByRole('button',{name:'Publish link',exact:true})).toBeDisabled();await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Publish link',exact:true}).click();await expect(panel.getByLabel('Published link')).toBeVisible();expect(published).toBe(true);
});
