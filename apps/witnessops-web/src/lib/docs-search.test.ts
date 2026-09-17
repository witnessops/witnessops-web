import assert from "node:assert/strict";
import test from "node:test";
import { matchScore } from "./docs-search";

test("search finds task phrases across title and description", () => {
  const account = { title: "Get started", description: "Create a free account. Signup and workspace invitations.", layerTitle: "Start here", sectionTitle: "Docs" };
  for (const query of ["create account", "free sign up", "workspace invitation"]) assert.ok(matchScore(query, account) > 0, query);
  assert.equal(matchScore("rotate private keys", account), 0);
  const cli = { ...account, title: "CLI setup and authentication", description: "Install the optional CLI and sign in." };
  assert.ok(matchScore("CLI authentication", cli) > matchScore("CLI authentication", { ...cli, title: "Commands", description: "Current app CLI authentication commands." }));
  assert.ok(matchScore("CLI setup and authentication", cli) > matchScore("CLI authentication", cli));
});
