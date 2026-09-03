const MEMORY_TYPES = new Set([
  "session", "episodic", "semantic", "procedural", "project", "configuration"
]);

const SENSITIVE_KEYS = new Set([
  "password", "passwd", "secret", "token", "apiKey", "api_key", "authorization"
]);

function text(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function canonicalConfidence(value, fallback = 0.5) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

function containsSensitiveKey(object) {
  if (!object || typeof object !== "object") return false;
  for (const [key, value] of Object.entries(object)) {
    if (SENSITIVE_KEYS.has(key)) return true;
    if (value && typeof value === "object" && containsSensitiveKey(value)) return true;
  }
  return false;
}

export function buildCulinaryState(input = {}) {
  return {
    schema: "chefsapiens.culinary-state.v1",
    objective: text(input.objective, 300) || null,
    cuisine: text(input.cuisine, 100) || null,
    reference: text(input.reference, 300) || null,
    ingredients: Array.isArray(input.ingredients) ? input.ingredients.slice(0, 200) : [],
    restrictions: Array.isArray(input.restrictions) ? input.restrictions.slice(0, 50) : [],
    equipment: Array.isArray(input.equipment) ? input.equipment.slice(0, 50) : [],
    servings: Number.isFinite(Number(input.servings)) ? Math.max(1, Number(input.servings)) : null,
    stage: text(input.stage, 80) || "not_started",
    observedFailures: Array.isArray(input.observedFailures) ? input.observedFailures.slice(0, 50) : [],
    nextIntervention: text(input.nextIntervention, 500) || null,
    stopCriterion: text(input.stopCriterion, 300) || null
  };
}

export function evaluateMemoryCandidate(candidate = {}) {
  const type = text(candidate.type, 40);
  const source = text(candidate.source, 300);
  const confidence = canonicalConfidence(candidate.confidence);
  const reasons = [];

  if (!MEMORY_TYPES.has(type)) reasons.push("invalid_memory_type");
  if (!source) reasons.push("missing_source");
  if (confidence < 0.6) reasons.push("low_confidence");
  if (containsSensitiveKey(candidate.content)) reasons.push("sensitive_content");
  if (candidate.contradictsHigherAuthority === true) reasons.push("higher_authority_conflict");

  return {
    accepted: reasons.length === 0,
    type,
    source: source || null,
    confidence,
    reasons
  };
}

export function reflectCulinaryAction(input = {}) {
  const checks = {
    objectiveClear: Boolean(text(input.objective)),
    restrictionsKnown: Array.isArray(input.restrictions),
    allergenRiskReviewed:
      input.allergenRisk === false || input.allergenRiskReviewed === true,
    foodSafetyReviewed:
      input.foodSafetyRisk === false || input.foodSafetyReviewed === true,
    evidenceSufficient:
      input.requiresEvidence !== true || Boolean(input.evidenceSufficient),
    minimalInterventionKnown:
      Boolean(text(input.minimalIntervention))
  };

  const unresolved = Object.entries(checks)
    .filter((,, ok]) => !ok)
    .map(([key]) => key);

  return {
    ok: unresolved.length === 0,
    checks,
    unresolved,
    recommendation: unresolved.length
      ? "resolve_before_action"
      : "proceed_with_minimal_effective_intervention"
  };
}
