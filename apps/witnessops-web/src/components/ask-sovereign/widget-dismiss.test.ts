import assert from "node:assert/strict";
import test from "node:test";
import { pointOutsideBox, shouldDismissBackdrop, shouldDismissSwipe } from "./widget-dismiss";

const panel = { left: 800, top: 160, right: 1260, bottom: 880 };

test("a press that starts and ends on the dimmed page closes the chat", () => {
  assert.equal(pointOutsideBox({ x: 24, y: 24 }, panel), true);
  assert.equal(shouldDismissBackdrop(true, { x: 24, y: 24 }, panel), true);
});

test("a press that starts inside the chat does not close when it is released outside", () => {
  assert.equal(shouldDismissBackdrop(false, { x: 24, y: 24 }, panel), false);
});

test("a press that starts outside and ends inside the chat stays open", () => {
  assert.equal(shouldDismissBackdrop(true, { x: 900, y: 400 }, panel), false);
  assert.equal(pointOutsideBox({ x: 800, y: 160 }, panel), false);
});

test("a phone header flick closes only when it moves down far or quickly", () => {
  assert.equal(shouldDismissSwipe(97, 400), true);
  assert.equal(shouldDismissSwipe(40, 50), true);
  assert.equal(shouldDismissSwipe(40, 200), false);
  assert.equal(shouldDismissSwipe(96, 400), false);
  assert.equal(shouldDismissSwipe(-120, 80), false);
});
