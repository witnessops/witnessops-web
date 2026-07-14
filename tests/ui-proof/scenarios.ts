export type ScenarioSeverity = "critical" | "warning";
export type ContentVariant = "default" | "long";
export type ColorScheme = "light" | "dark";
export type ReducedMotion = "reduce" | "no-preference";

export type HomepageHeroScenario = {
  name: string;
  viewport: {
    width: number;
    height: number;
  };
  colorScheme: ColorScheme;
  reducedMotion: ReducedMotion;
  contentVariant: ContentVariant;
  deviceScaleFactor: number;
  severity: ScenarioSeverity;
};

export const homepageHeroScenarios: HomepageHeroScenario[] = [
  {
    name: "mobile-320-light-default",
    viewport: { width: 320, height: 740 },
    colorScheme: "light",
    reducedMotion: "no-preference",
    contentVariant: "default",
    deviceScaleFactor: 2,
    severity: "critical",
  },
  {
    name: "mobile-360-dark-long-copy",
    viewport: { width: 360, height: 800 },
    colorScheme: "dark",
    reducedMotion: "no-preference",
    contentVariant: "long",
    deviceScaleFactor: 2,
    severity: "critical",
  },
  {
    name: "mobile-390-light-reduced-motion",
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    reducedMotion: "reduce",
    contentVariant: "default",
    deviceScaleFactor: 3,
    severity: "critical",
  },
  {
    name: "mobile-430-dark-long-copy",
    viewport: { width: 430, height: 932 },
    colorScheme: "dark",
    reducedMotion: "no-preference",
    contentVariant: "long",
    deviceScaleFactor: 3,
    severity: "critical",
  },
  {
    name: "mobile-280-light-extreme",
    viewport: { width: 280, height: 653 },
    colorScheme: "light",
    reducedMotion: "reduce",
    contentVariant: "long",
    deviceScaleFactor: 1,
    severity: "warning",
  },
];
