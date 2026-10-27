const { test, before } = require("node:test");
const assert = require("node:assert/strict");
let C;
before(async () => {
  C = await import("../src/content.js");
});
test("eleven unique destinations and eight correctly ordered planets", () => {
  assert.equal(C.destinations.length, 11);
  assert.equal(new Set(C.destinations.map((d) => d.id)).size, 11);
  assert.deepEqual(
    C.planets.map((d) => d.name),
    ["수성", "금성", "지구", "화성", "목성", "토성", "천왕성", "해왕성"],
  );
  for (const d of C.destinations) {
    assert.ok(d.page);
    assert.equal(d.options.length, 3);
    assert.ok(d.answer >= 0 && d.answer < 3);
    assert.equal(d.pos.length, 3);
  }
});
test("save validation rejects malformed progress and duplicates", () => {
  assert.deepEqual(
    C.cleanSave({
      done: ["earth", "earth", "x"],
      signals: [1, 1, 8, -1, "2"],
      challenges: ["order", "order", "x"],
    }),
    { done: ["earth"], signals: [1], challenges: ["order"] },
  );
  for (const s of [null, undefined, 9, "bad"])
    assert.deepEqual(C.cleanSave(s), { done: [], signals: [], challenges: [] });
});
test("repeated rewards never duplicate points; all activities total 1330 XP", () => {
  let s = C.reward(null, "done", "earth");
  s = C.reward(s, "done", "earth");
  assert.equal(C.score(s), 100);
  for (const d of C.destinations) s = C.reward(s, "done", d.id);
  for (let i = 0; i < 8; i++) s = C.reward(s, "signals", i);
  for (const id of C.challengeIds) s = C.reward(s, "challenges", id);
  assert.equal(C.score(s), 1330);
});
test("moon sequence repeats after 30 model days and waxing side is right", () => {
  for (let day = 0; day <= 30; day++)
    assert.equal(C.phaseForDay(day), C.phaseForDay(day + 30));
  assert.equal(C.phaseForDay(15), 4);
  assert.equal(C.lit(0, 0, 0), false);
  assert.equal(C.lit(4, 0, 0), true);
  assert.equal(C.lit(2, 0.5, 0), true);
  assert.equal(C.lit(2, -0.5, 0), false);
  assert.equal(C.lit(6, 0.5, 0), false);
  assert.equal(C.lit(6, -0.5, 0), true);
});
test("all three northern charts have valid edges and distinct stars", () => {
  assert.equal(Object.keys(C.charts).length, 3);
  for (const c of Object.values(C.charts)) {
    assert.equal(
      new Set(c.points.map((p) => p.join(","))).size,
      c.points.length,
    );
    for (const [a, b] of c.edges) {
      assert.ok(a >= 0 && a < c.points.length);
      assert.ok(b >= 0 && b < c.points.length);
    }
  }
});
test("surface classification matches the textbook", () => {
  for (const d of C.planets.slice(0, 4)) assert.equal(C.surface(d.id), "rock");
  for (const d of C.planets.slice(4)) assert.equal(C.surface(d.id), "gas");
});

test("every mission has two distinct review questions with valid answers", () => {
  for (const d of C.destinations) {
    const questions = C.quizSet(d);
    assert.equal(questions.length, 2);
    assert.notEqual(questions[0].q, questions[1].q);
    for (const q of questions) {
      assert.equal(q.options.length, 3);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3);
      assert.ok(q.why.length > 15);
    }
  }
});
