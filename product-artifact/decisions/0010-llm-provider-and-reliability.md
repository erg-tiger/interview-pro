---
version: 0.4.0
tags: [decision, adr, llm, provider, reliability, pi, copilot, gemini]
---

# 0010: Provider-neutral LLM access; test Pi with Copilot against the Gemini free tier

- **Status:** accepted; Pi with Copilot is the primary live runtime, JSON reliability and larger prompts still to check. **Correction (2026-10-27):** the provider-neutral interface described below was an intention and is not in the code; see the update at the end.
- **Date:** 2026-10-27

## Context

The agent design (0009) needs an LLM with tool calling and structured output, at no personal cost. GitHub Models, the first choice, had been retired. A spike against the Gemini free tier (OpenAI-compatible endpoint) gave these results:

- **Works:** the model chose the right tool with the right arguments, reasoned correctly over the result, and returned valid JSON.
- **Unreliable:** `gemini-3.8-flash` returned 503 "high demand" or timed out on 8 of 9 attempts. `gemini-2.5-flash` returned 404 (closed to new users).
- **Slow:** with retry and fallback to `gemini-3.6-flash`, the scenario succeeded but took 145 seconds for about three model calls. An earlier single run on `gemini-3.5-flash-lite` took 49 seconds. Sample size is small and may reflect a busy hour.

A live demo cannot depend on a result like that, and a real run has more rounds and a larger prompt.

## Options considered

1. Gemini free tier alone: free and functional, but too slow and unreliable for a live demo.
2. Pi with the author's Copilot login as the runtime: a different capacity pool, so it may be more reliable. Unverified: whether Pi's SDK supports unattended Copilot use inside an app, and whether Copilot terms allow it. Reviewers could not reproduce it with the author's login, and it adds a young, fast-moving dependency.
3. A second free provider (for example Groq) behind the same interface: cheap to try, same interface.
4. Recorded traces replayed locally: guarantees a demo, but is not live.

## Decision

- Keep the provider-neutral OpenAI-compatible interface, so any option is a configuration change.
- Gemini free tier remains the development baseline.
- Run a **timeboxed test of Pi with Copilot** as an alternative runtime, kept behind the same adapter so other providers still work for anyone reproducing the prototype.
- Whatever runs live, **save full traces** (tool calls, results, final proposal) of good runs per scenario and support local replay as demo insurance, clearly labelled as a replay.
- If neither Pi nor the Gemini baseline reaches acceptable latency, rely on replay for the demo and say so openly.

**Pi test criteria (assumption: targets are untested):** the scenario completes with a valid proposal, a correct tool call, and valid JSON, in under about 30 seconds end to end, on at least 4 of 5 runs.

## Pi test result (so far)

- Pi 1.4.0 SDK installed locally; the author's Copilot login worked with no key in code.
- A Node script and a small localhost server streamed tokens from `github-copilot/claude-haiku-5.5` with all tools, extensions, skills, and context files disabled.
- First token about 1.0 to 1.1 seconds, total about 1.2 seconds for short replies; one-line CLI prompts ran in 1.4 to 1.9 seconds on `claude-haiku-5.5` and `gemini-3.8-flash`, versus 503s and timeouts for the same Gemini model on the free tier.
- Short replies arrive in a burst (4 to 18 chunks within a fraction of a second); longer replies will stream more visibly.
- Not yet tested: valid JSON over repeated runs, a realistic prompt size, Copilot usage limits, and reviewer reproducibility (they need their own provider, which the neutral interface allows).

## Why this route

Pi with the author's Copilot login is the primary live runtime because:

1. Evidence: the Gemini free tier failed 8 of 9 attempts, while Copilot answered every test in 1.4 to 2 seconds (small sample).
2. Cost: it uses an existing license, with no new key or spend.
3. Fit: Pi's SDK runs in-process with all tools, extensions, skills, and context files disabled, and streams tokens natively, which suits a live demo.
4. Reversibility: the provider-neutral interface stays, so Gemini, another provider, or recorded traces remain fallbacks.

Accepted trade-offs: it depends on the author's personal login, so reviewers need their own provider; Pi is a young, fast-moving dependency; `npm audit` flagged 2 vulnerabilities in its dependencies; and Copilot usage limits are unverified.

## AI involvement

Copilot advised against Pi as the runtime on the evidence available (unverified terms, non-reproducible for reviewers, a hidden agent loop) and proposed retry, fallback, and a second free provider first. The author chose to test Pi with her Copilot login anyway, because reliability data was poor and she has working access. Copilot's reservations are recorded here, and the test settles them. Copilot also wrote the retry and fallback logic; its first version retried the failing model on every call, which wasted most of the 145 seconds.

## Consequences

- The retry logic should remember a failed model for the rest of a run, instead of retrying it on every call.
- Lower Gemini thinking effort and shorter prompts are untried latency levers.
- The artifact can cite this as a real failure mode: model unavailable leads to retry, fallback, then a clear handoff, matching the failure path in 0009.
- Provider terms and free-tier limits can change, so provider settings stay in configuration.

## Update, 2026-10-27: what the code actually does

- The prototype calls **Pi only** (`prototype/lib/agent.mjs`). There is no provider-neutral adapter and no Gemini path: the only code that reached Gemini was the spike script, which was deleted during cleanup. Only the model name, provider id and thinking level can be changed (by environment variable), and only to another model that Pi can reach.
- There is no retry with backoff and no fallback model. A model error goes straight to a hand-off with the reason, and a failed safety check gets one retry in the same session.
- So the statements above that Gemini, another provider or recorded traces "remain fallbacks" are no longer true. Restoring a second provider would need a small adapter to be written.
- The reservations recorded above still stand: the prototype depends on one person's Copilot login, Copilot's terms for this use were never verified, and a reviewer needs their own setup to reproduce a run.
