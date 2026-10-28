import assert from "node:assert/strict";
import test from "node:test";
import { constrainPosition, defaultPosition, sovereignLinks } from "./floating-position";

test("dragging beyond any edge leaves the entire pet reachable", () => {
  const viewport = { x: 0, y: 0, width: 1280, height: 800 };
  const pet = { width: 148, height: 154 };
  assert.deepEqual(constrainPosition({ x: -900, y: -100 }, pet, viewport), { x: 16, y: 16 });
  assert.deepEqual(constrainPosition({ x: 9000, y: 9000 }, pet, viewport), { x: 1116, y: 630 });
  assert.deepEqual(constrainPosition({ x: 400, y: 200 }, pet, viewport), { x: 400, y: 200 });
});

test("rotation and a smaller visual viewport recover an off-screen position", () => {
  const pet = { width: 148, height: 154 };
  const keyboardViewport = { x: 0, y: 80, width: 320, height: 300 };
  assert.deepEqual(constrainPosition({ x: 1116, y: 630 }, pet, keyboardViewport), { x: 156, y: 210 });
  assert.deepEqual(defaultPosition(pet, keyboardViewport), { x: 156, y: 210 });
});

test("a full-screen or oversized surface never receives negative coordinates", () => {
  const viewport = { x: 0, y: 0, width: 320, height: 300 };
  assert.deepEqual(constrainPosition({ x: -20, y: 600 }, { width: 320, height: 300 }, viewport), { x: 0, y: 0 });
  assert.deepEqual(defaultPosition({ width: 460, height: 720 }, viewport), { x: 0, y: 0 });
});

test("Polish links support today's /pl and a future independent domain root", () => {
  assert.deepEqual(sovereignLinks("/pl"), { docs: "/pl/docs", contact: "/pl/contact" });
  assert.deepEqual(sovereignLinks(""), { docs: "/docs", contact: "/contact" });
});
