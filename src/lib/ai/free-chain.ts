// The default chain of FREE OpenRouter models, appended as fallback when the
// user's primary provider is already OpenRouter.
//
// ⚠️ THESE IDS ROT. OpenRouter adds and retires free models continuously. Verify
// against https://openrouter.ai/models?max_price=0 when touching this file.
// A stale id is self-limiting: the executor gets a 404, classifies it as
// permanent, and moves to the next candidate — so the cost of one rotting is a
// wasted round-trip, not a failure.
//
// ORDER IS DELIBERATE: the two Gemma models share an upstream (Google) and are
// kept apart, so a Google-side rate limit cannot take out two consecutive links.
// The real diversity is NVIDIA → Google → meta-router → Google.
// `openrouter/free` is a meta-router over free models, not a model — it
// contributes a different resolution path rather than a fourth concrete model.
//
// Only `nvidia/nemotron-3-ultra-550b-a55b:free` has CONFIRMED function-calling
// support. The others are not assumed to have it: a model without tools degrades
// cleanly to the static path (see shouldDegradeToStatic in coach-service).
export const FREE_MODEL_CHAIN: readonly string[] = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
  "google/gemma-4-26b-a4b-it:free",
] as const
