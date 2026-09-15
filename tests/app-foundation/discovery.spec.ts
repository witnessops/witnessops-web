import { test, expect } from '@playwright/test';
for (const width of [1440,390]) for (const type of ['hostname','linux_server']) test(`discovery ${type} at ${width}`,async({page},info)=>{
  const ws={id:'ws',name:'New workspace',slug:'new',role:'owner',members:[],assets:[] as {id:string;hostname:string;type:string;createdAt:string}[],runs:[],linuxRuns:[]};
  let adds=0;
  await page.route('**/api/**',route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(path==='/api/workspace')return route.fulfill({json:{user:{id:'owner'},workspaces:[ws],workspace:ws}});
    if(path==='/api/feedback')return route.fulfill({json:[]});
    if(path==='/api/assets'&&req.method()==='POST'){
      const data=req.postDataJSON();expect(data.type).toBe(type);adds++;ws.assets.push({...data,id:'asset',createdAt:'2026-09-11T00:00:00Z'});return route.fulfill({status:201,json:ws.assets[0]});
    }
    throw new Error('Unexpected execution during discovery: '+req.method()+' '+path);
  });
  await page.setViewportSize({width,height:1000});await page.goto('/');
  const choice=page.getByRole('region',{name:'Choose a check'});
  for(const name of ['External Exposure Check','One Server Security Check'])await expect(choice.getByRole('heading',{name,exact:true})).toBeVisible();
  await expect(choice).toContainText('from the outside');await expect(choice).toContainText('operator collects locally');
  await expect(choice).toContainText('operator-assisted');await expect(choice).toContainText('You get');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('choice.png'),fullPage:true});
  const product=type==='hostname'?'External Exposure Check':'One Server Security Check';
  await choice.getByRole('link',{name:'Choose '+product,exact:true}).click();
  const input=page.getByLabel(type==='hostname'?'Public hostname':'Recorded Linux hostname',{exact:true});
  await expect(input).toBeFocused();await input.fill(type==='hostname'?'witnessops.com':'server-01');
  await page.getByRole('button',{name:'Add without scanning',exact:true}).click();
  await expect(page.locator('main')).toContainText('Recommended check: '+product);
  await expect(page.getByRole('region',{name:'Choose a check'})).toHaveCount(0);
  if(type==='linux_server'){
    await expect(page.locator('main')).toContainText('No saved server checks yet');
    await expect(page.getByRole('heading',{name:'How to get a server check'})).toBeVisible();
    await expect(page.getByRole('link',{name:'Contact WitnessOps for setup help →'})).toHaveAttribute('href',/^mailto:/);
  }else{
    await expect(page.locator('main')).toContainText('Create your first public baseline');
    await expect(page.getByRole('checkbox')).not.toBeChecked();
  }
  expect(adds).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('first-value.png'),fullPage:true});
});
