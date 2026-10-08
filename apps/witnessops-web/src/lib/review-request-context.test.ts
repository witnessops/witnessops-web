import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  BUYER_SERVICES,
  buyerRequestHref,
  buyerServiceById,
  buyerServiceByProductId,
  buyerServiceByPublicOfferId,
  buyerServiceRequestHref,
} from "@/lib/buyer-services";
import { reviewRequestHrefForLocation } from "./review-request-context";

const empty = new URLSearchParams();

test("shared-shell workflow CTAs use only the new fixed one-action identity", () => {
  const expected="/review/request?offerId=agent-action-security-review&offer=Agent+Action+Security+Review";
  assert.equal(reviewRequestHrefForLocation("en","/catalog/workflows",empty),expected);
  assert.equal(reviewRequestHrefForLocation("pl","/catalog/workflows",empty),"/pl"+expected);
  const current=buyerServiceByPublicOfferId("agent-action-security-review");
  assert.equal(current?.name.en,"Agent Action Security Review");
  assert.equal(current?.price.en,"€2,500 fixed · excluding VAT");
  assert.equal(buyerServiceByPublicOfferId("agent-tools-access-review"),undefined);
  assert.equal(buyerServiceById("agent-tools-access-review").name.en,"AI Agent Tools & Access Review");
});
test("the external review retains its exact productId and localized detail CTA", () => {
  const expected=buyerServiceRequestHref("pl",buyerServiceById("external-exposure-assessment"));
  assert.equal(reviewRequestHrefForLocation("pl","/pl/catalog/offsec-external-exposure",empty),expected);
  assert.equal(reviewRequestHrefForLocation("pl","/pl/review/request",new URLSearchParams(expected.split("?")[1])),expected);
  assert.equal(new URL(expected,"https://witnessops.com").searchParams.get("productId"),"OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(buyerServiceByProductId("OFFSEC-EXTERNAL-EXPOSURE")?.name.en,"External Attack Surface Review");
});
test("every new public review detail keeps its same selection", () => {
  for(const id of ["agent-action-security-review","external-exposure-assessment"] as const){
    const service=buyerServiceById(id);
    for(const locale of ["en","pl"] as const){
      const detail=service.detailHref[locale];
      assert.ok(detail);
      const expected=buyerServiceRequestHref(locale,service);
      assert.notEqual(expected,buyerRequestHref(locale));
      assert.equal(reviewRequestHrefForLocation(locale,detail,empty),expected);
      assert.equal(reviewRequestHrefForLocation(locale,buyerRequestHref(locale),new URLSearchParams(expected.split("?")[1])),expected);
    }
  }
});
test("historical service records remain readable but new public CTA cannot issue from them", () => {
  for(const service of BUYER_SERVICES.filter(s=>!["agent-action-security-review","external-exposure-assessment"].includes(s.id))){
    for(const locale of ["en","pl"] as const){
      assert.equal(buyerServiceRequestHref(locale,service),buyerRequestHref(locale),service.id);
    }
  }
});
test("unknown, historical, conflicting, duplicate or display-only selectors never silently substitute an offer",()=>{
  for(const query of [
    "offerId=agent-tools-access-review",
    "offerId=bounded-workflow-review",
    "offer=AI+Agent+Tools+%26+Access+Review",
    "offer=Agent+Action+Security+Review",
    "offerId=unknown",
    "offerId=agent-action-security-review&productId=OFFSEC-EXTERNAL-EXPOSURE",
    "offerId=agent-action-security-review&offerId=agent-action-security-review",
    "productId=OFFSEC-EXTERNAL-EXPOSURE&productId=OFFSEC-EXTERNAL-EXPOSURE",
    "offerId=agent-action-security-review&enquiryPath=early-bird",
    "productId=OFFSEC-LOCAL-AUDIT",
    "productId=OFFSEC-PILOT",
  ]){
    assert.equal(reviewRequestHrefForLocation("en","/review/request",new URLSearchParams(query)),"/review/request",query);
  }
  const selected=reviewRequestHrefForLocation("en","/review/request",new URLSearchParams("offerId=agent-action-security-review&offer=untrusted&source=ask"));
  assert.equal(selected,buyerServiceRequestHref("en",buyerServiceById("agent-action-security-review")));
  assert.equal(reviewRequestHrefForLocation("en","/review/request",new URLSearchParams("productId=OFFSEC-EXTERNAL-EXPOSURE&offer=wrong")) ,buyerServiceRequestHref("en",buyerServiceById("external-exposure-assessment")));
});
test("header and footer preserve configured routes and the selected context helper",()=>{
  const navbar=readFileSync(resolve(__dirname,"../components/shared/navbar.tsx"),"utf8");
  const footer=readFileSync(resolve(__dirname,"../components/marketing/footer.tsx"),"utf8");
  assert.match(navbar,/href: signupUrl \|\| "\/check"/);
  assert.match(footer,/reviewRequestHrefForLocation\(/);
  assert.match(footer,/primaryHref=\{reviewRequestHref\}/);
});
