export const routes = {
  home: "/",
  contact: "/contact",
  review: "/review",
  reviewRequest: "/review/request",
  verify: "/verify",
  whyOffsec: "/why-witnessops",
  proofBackedSecuritySystems: "/proof-backed-security-systems",
  security: "/security",
  privacy: "/privacy",
  terms: "/terms",
  support: "/support",
} as const;

export type Route = (typeof routes)[keyof typeof routes];
