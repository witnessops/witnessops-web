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

import {
  getPresentationForSource as getPresentationForSourceImpl,
  getGlobalPresentationRules as getGlobalPresentationRulesImpl,
  getPresentationProjectionIdentity as getPresentationProjectionIdentityImpl,
  type PresentationSourceRecord,
  type GlobalPresentationRules,
  type PresentationProjectionIdentity,
} from "./authority-presentation-loader";

import {
  assembleAnswer,
  type AssembleAnswerInput,
  type AssembledAnswer,
} from "./authority-answer-assembler";

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

// Presentation projection surface (output-only, separate from authority loader)
export const getPresentationForSource = getPresentationForSourceImpl;
export const getGlobalPresentationRules = getGlobalPresentationRulesImpl;
export const getPresentationProjectionIdentity = getPresentationProjectionIdentityImpl;
export type { PresentationSourceRecord, GlobalPresentationRules, PresentationProjectionIdentity };

// Assembler surface (server-only composition of policy decision + template + presentation)
export { assembleAnswer };
export type { AssembleAnswerInput, AssembledAnswer };

export { classifyQuestion };
export { executePolicy };
export type { PolicyDecision } from "./authority-policy-executor";
