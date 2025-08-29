// run tests: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const { createDetector } = require("./index");

// Helper tạo model luôn resolve
const ok = (payload) => async () => payload;
// Helper tạo model luôn reject
const fail = (name = "X") => async () => {
  throw new Error(`${name} failed`);
};

test("A succeeds -> uses A", async () => {
  const detector = createDetector({
    modelA: ok({ model: "ModelA", confidence: 0.9, result: "Human" }),
    modelB: fail("ModelB"),
    modelC: fail("ModelC"),
  });

  const r = await detector("Q1", { useCache: false });
  assert.equal(r.model, "ModelA");
});

test("A fails, B succeeds -> uses B", async () => {
  const detector = createDetector({
    modelA: fail("ModelA"),
    modelB: ok({ model: "ModelB", confidence: 0.8, result: "AI" }),
    modelC: fail("ModelC"),
  });

  const r = await detector("Q2", { useCache: false });
  assert.equal(r.model, "ModelB");
});

test("A & B fail, C succeeds -> uses C", async () => {
  const detector = createDetector({
    modelA: fail("ModelA"),
    modelB: fail("ModelB"),
    modelC: ok({ model: "ModelC", confidence: 0.7, result: "Human" }),
  });

  const r = await detector("Q3", { useCache: false });
  assert.equal(r.model, "ModelC");
});

test("All fail -> throws error", async () => {
  const detector = createDetector({
    modelA: fail("ModelA"),
    modelB: fail("ModelB"),
    modelC: fail("ModelC"),
  });

  await assert.rejects(() => detector("Q4", { useCache: false }), /All models failed/);
});

test("Cache returns instantly and marks cached=true", async () => {
  let calls = 0;
  const detector = createDetector({
    modelA: async () => {
      calls++;
      return { model: "ModelA", confidence: 0.9, result: "AI" };
    },
    modelB: fail("ModelB"),
    modelC: fail("ModelC"),
  });

  const r1 = await detector("Q-cache");
  const r2 = await detector("Q-cache"); // nên lấy từ cache

  assert.equal(calls, 1);               // cache hit, so calls does not increase
  assert.equal(r2.cached, true);
});
