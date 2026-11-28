import {test,expect} from '@playwright/test';
// The widget experiment is retained in the dedicated preview suite. Published pages
// expose their own actions, and the public assistant remains directly accessible.
for (const route of ['/', '/review/sample-cases', '/check', '/research', '/docs']) {
  test(`mobile public page keeps its content usable without the retired launcher: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Ask (?:WitnessOps|Sovereign)$/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
for(const width of [1440,390])test(`footer and research at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/research');await expect(page).toHaveTitle(/Research & articles/);await expect(page.getByRole('heading',{name:'Research & articles',exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('research.png')});
 const footer=page.locator('#site-footer');await footer.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('footer.png')});
 const links={'AI Agent Red Teaming':'/reviews/agent-action-security-review','Request a security assessment':'/review/request?offerId=agent-action-security-review','How it works':'/how-it-works','Examples':'/review/sample-cases','Docs':'/docs','Privacy':'/privacy','Terms':'/terms','Security':'/security','Company details':'/company'};
 for(const [name,href] of Object.entries(links))await expect(footer.getByRole('link',{name,exact:true})).toHaveAttribute('href',href);
 for(const name of ['External Attack Surface Review','Pricing','Repair and handover','Talk to an expert'])await expect(footer.getByRole('link',{name,exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'How to read a public exposure snapshot',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('How to read a public exposure snapshot');await expect(page.locator('main')).toContainText('No new target was checked');await expect(page.getByRole('button',{name:'Ask WitnessOps',exact:true})).toHaveCount(0);
 expect((await page.goto('/catalog/automation-repair'))?.status()).toBe(410);await expect(page.getByRole('heading',{name:'This offer has been withdrawn'})).toBeVisible();
});
test('Polish footer uses supported destinations and labels English-only surfaces',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/pl');const footer=page.locator('#site-footer');
 for(const [label,href] of [['Red teaming agentów AI','/pl/reviews/agent-action-security-review'],['Zapytaj o ocenę bezpieczeństwa','/pl/review/request?offerId=agent-action-security-review'],['Podejście','/pl/why-witnessops'],['Przykłady (EN)','/review/sample-cases'],['Dokumentacja','/pl/docs'],['Prywatność','/pl/privacy'],['Warunki','/pl/terms'],['Bezpieczeństwo','/pl/security'],['Dane spółki','/pl/company']])await expect(footer.getByRole('link',{name:label,exact:true})).toHaveAttribute('href',href);
 await expect(footer.getByRole('link',{name:'External Attack Surface Review',exact:true})).toHaveCount(0);
 await expect(footer.getByRole('link',{name:'Badania i artykuły (EN)',exact:true})).toHaveCount(0);
 await expect(footer.getByRole('link',{name:'Narzędzie, nie przegląd',exact:true})).toHaveCount(0);
 await expect(footer.getByRole('link',{name:'AI Agent Tools & Access Review (EN)',exact:true})).toHaveCount(0);
 await expect(footer).not.toContainText('Naprawa i przekazanie');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await page.goto('/pl/catalog/offsec-external-exposure'))?.status()).toBe(200);
});
