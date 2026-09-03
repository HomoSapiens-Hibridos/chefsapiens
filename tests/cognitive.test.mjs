import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCulinaryState,
  evaluateMemoryCandidate,
  reflectCulinaryAction
} from "../api/lib/cognitive.mjs";

test("buildCulinaryState normalizes bounded state", () => {
  const state = buildCulinaryState({ objective: "risoto", servings: 4, stage: "cooking" });
  assert.equal(state.schema, "chefsapiens.culinary-state.v1");
  assert.equal(state.servings, 4);
  assert.equal(state.stage, "cooking");
});

test("memory gate accepts sourced confident semantic memory", () => {
  const result = evaluateMemoryCandidate({
    type: "semantic",
    source: "official-source",
    confidence: 0.9,
    content: { fact: "validated" }
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.reasons, []);
});

test("memory gate rejects secrets and low confidence", () => {
  const result = evaluateMemoryCandidate({
    type: "semantic",
    source: "conversation",
    confidence: 0.4,
    content: { token: "never-persist-this" }
  });
  assert.equal(result.accepted, false);
  assert.ok(result.reasons.includes("low_confidence"));
  assert.ok(result.reasons.includes("sensitive_content"));
});

test("reflection fails closed when food safety review is unresolved", () => {
  const result = reflectCulinaryAction({
    objective: "prepare chicken",
    restrictions: [],
    allergenRisk: false,
    foodSafetyRisk: true,
    minimalIntervention: "cook safely"
  });
  assert.equal(result.ok, false);
  assert.ok(result.unresolved.includes("foodSafetyReviewed"));
});

test("reflection proceeds only after required checks", () => {
  const result = reflectCulinaryAction({
    objective: "finish sauce",
    restrictions: [],
    allergenRisk: false,
    foodSafetyRisk: false,
    requiresEvidence: false,
    minimalIntervention: "adjust salt"
  });
  assert.equal(result.ok, true);
  assert.equal(result.recommendation, "proceed_with_minimal_effective_intervention");
});
