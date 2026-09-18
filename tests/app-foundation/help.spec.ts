import { test, expect } from '@playwright/test';
import type { Workspace } from '../../apps/witnessops-app/src/lib/model';
for(const width of [390,1440])test(`Help stays beside the work and clears workspace context ${width}`,async({page},info)=>{
 const first:Workspace={id:'private-one',name:'Private one',slug:'one',role:'owner',assets:[],runs:[],members:[]};const second={...first,id:'private-two',name:'Private two',slug:'two'};let current=first,fail=false;const sent:unknown[]=[];
 await page.setViewportSize({width,height:900});
 await page.route('**/api/**',route=>{const req=route.request(),path=new URL(req.url()).pathname;
 if(path==='/api/workspace'){if(req.headers()['x-witnessops-workspace']===second.id)current=second;return route.fulfill({json:{user:{id:'user',displayName:'Private person'},workspaces:[first,second],workspace:current}});}
 if(path==='/api/help'){sent.push(req.postDataJSON());return fail?route.fulfill({status:503,json:{error:'AI documentation guidance is unavailable.'}}):route.fulfill({json:{status:'supported_by_docs',facts:['A Viewer can read permitted workspace results.'],inference:[],limits:['This answer does not grant membership.'],sources:[{title:'Documentation',url:'https://witnessops.com/docs'}]}});}
 if(path==='/api/feedback')return route.fulfill({json:[]});throw new Error('Unexpected request '+path);});
 await page.goto('/assets/new');const target=page.getByLabel('Public hostname',{exact:true});await target.fill('private.example');
 const help=page.getByRole('button',{name:'Help',exact:true});await expect(page.getByRole('dialog')).toHaveCount(0);await help.focus();await page.keyboard.press('Enter');
 const panel=page.getByRole('dialog',{name:'Ask WitnessOps'});await expect(panel).toBeVisible();await expect(panel.getByLabel('Ask a documentation question')).toBeFocused();await expect(panel).not.toContainText('Private one');await expect(panel).not.toContainText('private.example');
 await panel.getByLabel('Ask a documentation question').fill('What can a Viewer do?');await panel.getByRole('button',{name:'Ask',exact:true}).click();await expect(panel).toContainText('A Viewer can read permitted workspace results.');
 expect(sent).toEqual([{question:'What can a Viewer do?',page:'assets'}]);await expect(panel.getByRole('link',{name:'Ask a person'})).toHaveAttribute('href',/^mailto:engage@mail.witnessops.com\?subject=/);
 await page.screenshot({path:info.outputPath(`help-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(help).toBeFocused();await expect(target).toHaveValue('private.example');
 await help.click();await expect(panel).toContainText('A Viewer can read');fail=true;await panel.getByLabel('Ask a documentation question').fill('How do I export?');await panel.getByRole('button',{name:'Ask',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('unavailable');await panel.getByRole('button',{name:'Close Help'}).click();
 await page.getByLabel('Active workspace').selectOption(second.id);await expect(page).toHaveURL(/:3022\/$/);await expect(page.getByRole('heading',{name:second.name,exact:true})).toBeVisible();await help.click();await expect(panel).not.toContainText('What can a Viewer do?');await expect(panel.getByLabel('Ask a documentation question')).toHaveValue('');await expect(panel).not.toContainText('Private two');
});
