import assert from "node:assert/strict";
import test from "node:test";
import { appAuthMode } from "./auth-mode";

test("existing app deployments retain WorkOS unless Keycloak is selected", () => {
  assert.equal(appAuthMode({}), "workos");
  assert.equal(appAuthMode({ WITNESSOPS_APP_AUTH_PROVIDER: "keycloak" }), "keycloak");
});

test("unknown auth values and the separate AASR staging profile fail closed", () => {
  assert.throws(() => appAuthMode({ WITNESSOPS_APP_AUTH_PROVIDER: "other" }), /Unsupported app authentication provider/);
  assert.throws(() => appAuthMode({ WITNESSOPS_APP_AUTH_PROVIDER: "keycloak", WITNESSOPS_BUILD_PROFILE: "aasr-staging" }), /not admitted/);
  assert.equal(appAuthMode({ WITNESSOPS_BUILD_PROFILE: "aasr-staging" }), "workos");
});
