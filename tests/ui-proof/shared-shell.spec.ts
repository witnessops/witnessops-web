import { expect, test, type Page } from "@playwright/test";

const acceptedRoutes = [
  "/",
  "/pl",
  "/catalog",
  "/pl/catalog",
  "/customer-security-review",
  "/pl/customer-security-review",
  "/review/request",
  "/pl/review/request",
  "/library",
  "/pl/library",
  "/docs",
  "/pl/docs",
  "/verify",
  "/pl/verify",
  "/why-witnessops",
  "/pl/why-witnessops",
  "/support",
  "/pl/support",
  "/review",
  "/media-kit",
] as const;

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "narrow-mobile", width: 320, height: 740 },
] as const;

const languagePairs = [
  ["/", "/pl"],
  ["/catalog", "/pl/catalog"],
  ["/customer-security-review", "/pl/customer-security-review"],
  ["/review/request", "/pl/review/request"],
  ["/library", "/pl/library"],
  ["/docs", "/pl/docs"],
  ["/verify", "/pl/verify"],
  ["/why-witnessops", "/pl/why-witnessops"],
  ["/support", "/pl/support"],
] as const;

const routesWithSecondaryNavigation = new Set<string>(["/docs", "/pl/docs"]);

const canonicalChrome = {
  background: "rgb(5, 5, 5)",
  primary: "rgb(250, 250, 247)",
  accent: "rgb(242, 122, 61)",
  inverse: "rgb(22, 11, 5)",
  tokens: {
    background: "#050505",
    primary: "#fafaf7",
    accent: "#f27a3d",
    inverse: "#160b05",
  },
} as const;

const activeNavigationHref = new Map<string, string>([
  ["/catalog", "/catalog"],
  ["/pl/catalog", "/pl/catalog"],
  ["/customer-security-review", "/customer-security-review"],
  ["/pl/customer-security-review", "/pl/customer-security-review"],
  ["/review/request", "/review/request"],
  ["/pl/review/request", "/pl/review/request"],
  ["/library", "/library"],
  ["/pl/library", "/pl/library"],
  ["/why-witnessops", "/why-witnessops"],
  ["/pl/why-witnessops", "/pl/why-witnessops"],
]);

function parseRgb(value: string): [number, number, number] {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a computed RGB color, received ${value}`);
  }
  return channels as [number, number, number];
}

function relativeLuminance(value: string): number {
  const channels = parseRgb(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

async function openMobileMenu(page: Page) {
  const toggle = page.locator('button[aria-controls="witnessops-mobile-menu"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  return toggle;
}

test("accepted public routes retain one consistent, accessible shared shell", async ({
  browser,
}) => {
  test.setTimeout(360_000);

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    let expectedNavHeight: number | null = null;

    for (const route of acceptedRoutes) {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const onConsole = (message: { type(): string; text(): string }) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      };
      const onPageError = (error: Error) => pageErrors.push(error.message);
      page.on("console", onConsole);
      page.on("pageerror", onPageError);

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `${route} ${viewport.name} status`).toBe(200);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.locator("nav.public-shell")).toHaveCount(1);
      await expect(page.locator("nav.public-shell")).toBeVisible();
      await expect(page.locator("footer[data-brand-footer]")).toHaveCount(1);
      await expect(page.locator("footer[data-brand-footer]")).toBeVisible();

      const shell = await page.evaluate(() => {
        const navElement = document.querySelector<HTMLElement>("nav.public-shell");
        const footerElement = document.querySelector<HTMLElement>(
          "footer[data-brand-footer]",
        );
        const mainElement = document.querySelector<HTMLElement>("main");
        if (!navElement || !footerElement || !mainElement) {
          throw new Error("Expected the shared navigation, footer and main landmarks");
        }

        const nav = navElement.getBoundingClientRect();
        const main = mainElement.getBoundingClientRect();
        const navStyle = getComputedStyle(navElement);
        const footerStyle = getComputedStyle(footerElement);
        const mainStyle = getComputedStyle(mainElement);
        const visibleNavTargets = Array.from(
          document.querySelectorAll<HTMLElement>(
            "nav.public-shell a, nav.public-shell button",
          ),
        ).filter((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            box.width > 0 &&
            box.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            !element.closest("[inert]") &&
            box.bottom > nav.top &&
            box.top < nav.bottom
          );
        });
        const footerLinks = Array.from(
          footerElement.querySelectorAll<HTMLAnchorElement>("a"),
        );
        const visibleDesktopCta = Array.from(
          navElement.querySelectorAll<HTMLAnchorElement>(
            'a[href^="/review/request"], a[href^="/pl/review/request"]',
          ),
        ).find((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return box.width > 0 && box.height > 0 && style.display !== "none";
        });
        const desktopCtaStyle = visibleDesktopCta
          ? getComputedStyle(visibleDesktopCta)
          : null;
        const tokens = (style: CSSStyleDeclaration) => ({
          background: style.getPropertyValue("--color-surface-bg").trim().toLowerCase(),
          primary: style.getPropertyValue("--color-text-primary").trim().toLowerCase(),
          accent: style.getPropertyValue("--color-brand-accent").trim().toLowerCase(),
          inverse: style.getPropertyValue("--color-text-inverse").trim().toLowerCase(),
        });
        return {
          navHeight: nav.height,
          navBottom: nav.bottom,
          mainTop: main.top,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          minNavTarget: Math.min(
            ...visibleNavTargets.map((element) => element.getBoundingClientRect().height),
          ),
          minFooterTarget: Math.min(
            ...footerLinks.map((element) => element.getBoundingClientRect().height),
          ),
          clippedFooterLinks: footerLinks.filter((element) => {
            const box = element.getBoundingClientRect();
            return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
          }).length,
          footerFontSizes: footerLinks.map((element) =>
            Number.parseFloat(getComputedStyle(element).fontSize),
          ),
          navBackground: navStyle.backgroundColor,
          navColor: navStyle.color,
          footerBackground: footerStyle.backgroundColor,
          footerColor: footerStyle.color,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          navTokens: tokens(navStyle),
          footerTokens: tokens(footerStyle),
          mainTokens: tokens(mainStyle),
          desktopCtaBackground: desktopCtaStyle?.backgroundColor ?? null,
          desktopCtaColor: desktopCtaStyle?.color ?? null,
        };
      });

      expectedNavHeight ??= shell.navHeight;
      expect(shell.navHeight, `${route} ${viewport.name} header height`).toBe(
        expectedNavHeight,
      );
      if (!routesWithSecondaryNavigation.has(route)) {
        expect(
          Math.abs(shell.mainTop - shell.navBottom),
          `${route} main offset`,
        ).toBeLessThanOrEqual(1);
      }
      expect(shell.scrollWidth, `${route} ${viewport.name} horizontal overflow`).toBeLessThanOrEqual(
        shell.clientWidth + 1,
      );
      expect(shell.minNavTarget, `${route} ${viewport.name} nav target`).toBeGreaterThanOrEqual(44);
      expect(shell.minFooterTarget, `${route} ${viewport.name} footer target`).toBeGreaterThanOrEqual(44);
      expect(Math.min(...shell.footerFontSizes), `${route} footer font size`).toBeGreaterThanOrEqual(12);
      expect(shell.clippedFooterLinks, `${route} clipped footer links`).toBe(0);
      expect(shell.bodyBackground, `${route} page background`).toBe(
        canonicalChrome.background,
      );
      expect(shell.navBackground, `${route} navigation background`).toBe(
        canonicalChrome.background,
      );
      expect(shell.navColor, `${route} navigation foreground`).toBe(
        canonicalChrome.primary,
      );
      expect(shell.footerBackground, `${route} footer background`).toBe(
        canonicalChrome.background,
      );
      expect(shell.footerColor, `${route} footer foreground`).toBe(
        canonicalChrome.primary,
      );
      for (const [surface, tokens] of [
        ["navigation", shell.navTokens],
        ["footer", shell.footerTokens],
        ["main", shell.mainTokens],
      ] as const) {
        expect(tokens, `${route} ${viewport.name} ${surface} tokens`).toEqual(
          canonicalChrome.tokens,
        );
      }
      expect(
        contrastRatio(shell.navColor, shell.navBackground),
        `${route} navigation contrast`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(shell.footerColor, shell.footerBackground),
        `${route} footer contrast`,
      ).toBeGreaterThanOrEqual(4.5);
      if (viewport.width >= 1024) {
        expect(shell.desktopCtaBackground, `${route} desktop CTA background`).toBe(
          canonicalChrome.accent,
        );
        expect(shell.desktopCtaColor, `${route} desktop CTA foreground`).toBe(
          canonicalChrome.inverse,
        );
        expect(
          contrastRatio(shell.desktopCtaColor!, shell.desktopCtaBackground!),
          `${route} desktop CTA contrast`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      const activeHref = activeNavigationHref.get(route);
      const visibleActive = page.locator(
        'nav.public-shell [aria-current="page"]:visible',
      );
      if (activeHref) {
        await expect(visibleActive, `${route} active route`).toHaveCount(1);
        await expect(visibleActive).toHaveAttribute("href", activeHref);
      } else {
        await expect(visibleActive, `${route} has no represented primary nav item`).toHaveCount(0);
      }

      expect(consoleErrors, `${route} ${viewport.name} console errors`).toEqual([]);
      expect(pageErrors, `${route} ${viewport.name} page errors`).toEqual([]);
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }

    await context.close();
  }
});

test("language switching preserves every accepted route pair and header geometry", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1100 });

  for (const [englishPath, polishPath] of languagePairs) {
    await page.goto(englishPath, { waitUntil: "networkidle" });
    const englishHeaderHeight = await page
      .locator("nav.public-shell")
      .evaluate((nav) => nav.getBoundingClientRect().height);
    const polishLink = page.getByRole("link", { name: "PL", exact: true });
    await expect(polishLink).toHaveCount(1);
    await expect(polishLink).toHaveAttribute("href", polishPath);
    await expect(polishLink).toHaveText("PL");
    await polishLink.click();
    await expect(page).toHaveURL(new RegExp(`${polishPath.replaceAll("/", "\\/")}$`));
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page
        .locator("nav.public-shell")
        .evaluate((nav) => nav.getBoundingClientRect().height),
    ).toBe(englishHeaderHeight);

    const englishLink = page.getByRole("link", { name: "EN", exact: true });
    await expect(englishLink).toHaveCount(1);
    await expect(englishLink).toHaveAttribute("href", englishPath);
    await expect(englishLink).toHaveText("EN");
    await englishLink.click();
    await expect(page).toHaveURL(new RegExp(`${englishPath === "/" ? "\\/" : englishPath.replaceAll("/", "\\/")}$`));
    await expect(page.locator("main h1").first()).toBeVisible();
  }
});

test("mobile navigation excludes closed content, manages focus, and restores scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl/catalog", { waitUntil: "networkidle" });

  const toggle = page.locator('button[aria-controls="witnessops-mobile-menu"]');
  await expect(toggle).toHaveAttribute("aria-label", "Otwórz główną nawigację");
  const firstMenuLink = page.locator("#witnessops-mobile-menu a").first();
  expect(
    await firstMenuLink.evaluate((element) => {
      element.focus();
      return document.activeElement === element;
    }),
    "closed mobile links stay out of the focus order",
  ).toBe(false);

  const closedGeometry = await page.locator("main").evaluate((main) => {
    const box = main.getBoundingClientRect();
    return { top: box.top, left: box.left, width: box.width };
  });
  await toggle.focus();
  await openMobileMenu(page);
  await expect(toggle).toHaveAttribute("aria-label", "Zamknij główną nawigację");
  await expect(firstMenuLink).toBeFocused();
  await expect(firstMenuLink).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  const menuVisuals = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>("#witnessops-mobile-menu");
    const current = document.querySelector<HTMLElement>(
      '#witnessops-mobile-menu [aria-current="page"]',
    );
    const cta = document.querySelector<HTMLElement>(
      '#witnessops-mobile-menu a[href="/pl/review/request"]',
    );
    return {
      currentBackground: current ? getComputedStyle(current).backgroundColor : null,
      currentBorder: current ? getComputedStyle(current).borderLeftWidth : null,
      currentBorderColor: current ? getComputedStyle(current).borderLeftColor : null,
      currentColor: current ? getComputedStyle(current).color : null,
      menuBackground: menu ? getComputedStyle(menu).backgroundColor : null,
      ctaBackground: cta ? getComputedStyle(cta).backgroundColor : null,
      ctaColor: cta ? getComputedStyle(cta).color : null,
    };
  });
  expect(menuVisuals.currentBackground).not.toBe("rgb(238, 238, 238)");
  expect(menuVisuals.currentBorder).toBe("2px");
  expect(menuVisuals.currentBorderColor).toBe(canonicalChrome.accent);
  expect(menuVisuals.currentColor).toBe(canonicalChrome.primary);
  expect(menuVisuals.menuBackground).toBe(canonicalChrome.background);
  expect(menuVisuals.ctaBackground).toBe(canonicalChrome.accent);
  expect(menuVisuals.ctaColor).toBe(canonicalChrome.inverse);
  expect(contrastRatio(menuVisuals.ctaColor!, menuVisuals.ctaBackground!)).toBeGreaterThanOrEqual(4.5);
  const openGeometry = await page.locator("main").evaluate((main) => {
    const box = main.getBoundingClientRect();
    return {
      top: box.top,
      left: box.left,
      width: box.width,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(Math.abs(openGeometry.top - closedGeometry.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(openGeometry.left - closedGeometry.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(openGeometry.width - closedGeometry.width)).toBeLessThanOrEqual(1);
  expect(openGeometry.overflow).toBeLessThanOrEqual(1);

  const mobileTargets = page.locator("#witnessops-mobile-menu a:visible");
  for (let index = 0; index < (await mobileTargets.count()); index += 1) {
    expect((await mobileTargets.nth(index).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  await openMobileMenu(page);
  const englishSwitch = page.locator('#witnessops-mobile-menu a[href="/catalog"]');
  await englishSwitch.click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("mobile review request keeps the conversion form clear and legible", async ({
  browser,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const response = await page.goto("/review/request", { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Tell us what you need reviewed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Ask WitnessOps" })).toHaveCount(0);

    const headerGeometry = await page.locator("nav.public-shell").evaluate((nav) => {
      const logo = nav.querySelector<HTMLElement>('a[aria-label="WitnessOps home"]');
      const menu = nav.querySelector<HTMLElement>(
        'button[aria-controls="witnessops-mobile-menu"]',
      );
      if (!logo || !menu) throw new Error("Expected the mobile brand lockup and menu control");
      const navBox = nav.getBoundingClientRect();
      const logoBox = logo.getBoundingClientRect();
      const menuBox = menu.getBoundingClientRect();
      return {
        navHeight: navBox.height,
        gap: menuBox.left - logoBox.right,
      };
    });
    expect(headerGeometry.navHeight).toBeLessThanOrEqual(64);
    expect(headerGeometry.gap).toBeGreaterThanOrEqual(8);

    const formState = await page.locator("#name").evaluate((input) => {
      const style = getComputedStyle(input);
      const box = input.getBoundingClientRect();
      const center = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return {
        border: style.borderTopColor,
        background: style.backgroundColor,
        fontSize: Number.parseFloat(style.fontSize),
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        centerIsInput: center === input,
        clipped: box.left < 0 || box.right > document.documentElement.clientWidth,
        clientWidth: document.documentElement.clientWidth,
        innerHeight: window.innerHeight,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(formState.height).toBeGreaterThanOrEqual(48);
    expect(formState.fontSize).toBeGreaterThanOrEqual(16);
    expect(formState.left).toBeGreaterThanOrEqual(16);
    expect(formState.right).toBeLessThanOrEqual(formState.clientWidth - 16);
    expect(formState.top).toBeLessThan(formState.innerHeight);
    expect(formState.centerIsInput).toBe(true);
    expect(formState.clipped).toBe(false);
    expect(formState.overflow).toBeLessThanOrEqual(1);
    expect(contrastRatio(formState.border, formState.background)).toBeGreaterThanOrEqual(3);
    await context.close();
  }
});
