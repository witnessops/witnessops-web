import "server-only";

import { createRequire } from "node:module";

import { buildAuthorityLoader } from "./authority-loader-core";
import { classifyQuestion } from "./authority-classifier";
import { executePolicy } from "./authority-policy-executor";

export type {
  AuthorityRecord,
  AuthoritySetIdentity,
  PolicyRuleRecord,
  QuestionClassRecord,
  RouteRecord,
  SourceRecord,
  TemplateRecord,
} from "./authority-loader-core";

const require = createRequire(import.meta.url);
const authoritySet: unknown = require(
  "@witnessops/ask-authority/v1/authority-set.json",
);
const loader = buildAuthorityLoader(authoritySet);

export const getQuestionClass = loader.getQuestionClass;
export const getPolicyRule = loader.getPolicyRule;
export const getTemplate = loader.getTemplate;
export const getTemplateForQuestionClass = loader.getTemplateForQuestionClass;
export const getSource = loader.getSource;
export const getAuthority = loader.getAuthority;
export const getRoute = loader.getRoute;
export const getAuthoritySetIdentity = loader.getAuthoritySetIdentity;

export { classifyQuestion };
export { executePolicy };
export type { PolicyDecision } from "./authority-policy-executor";
