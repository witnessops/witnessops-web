import assert from "node:assert/strict";
import test from "node:test";

import type { Metadata } from "next";

import { metadata as enAgent } from "@/app/(marketing)/reviews/agent-action-security-review/page";
import { metadata as enExternal } from "@/app/(marketing)/reviews/external-attack-surface-review/page";
import { metadata as plAgent } from "@/app/pl/reviews/agent-action-security-review/page";
import { metadata as plExternal } from "@/app/pl/reviews/external-attack-surface-review/page";
import { DEFAULT_SOCIAL_IMAGE_PATH } from "@/lib/social-metadata";

test("each review offer page shares its own title over the default social image", () => {
  for (const [route, metadata] of [
    ["/reviews/agent-action-security-review", enAgent],
    ["/reviews/external-attack-surface-review", enExternal],
    ["/pl/reviews/agent-action-security-review", plAgent],
    ["/pl/reviews/external-attack-surface-review", plExternal],
  ] as const satisfies ReadonlyArray<readonly [string, Metadata]>) {
    const expectedTitle = `${String(metadata.title)} | WitnessOps`;
    const openGraph = metadata.openGraph as { title?: string; description?: string; images?: Array<{ url: string }> };
    const twitter = metadata.twitter as { title?: string; card?: string; images?: string[] };
    assert.equal(openGraph.title, expectedTitle, route);
    assert.equal(openGraph.description, metadata.description, route);
    assert.equal(openGraph.images?.[0]?.url, DEFAULT_SOCIAL_IMAGE_PATH, route);
    assert.equal(twitter.title, expectedTitle, route);
    assert.equal(twitter.card, "summary_large_image", route);
    assert.deepEqual(twitter.images, [DEFAULT_SOCIAL_IMAGE_PATH], route);
  }
});
