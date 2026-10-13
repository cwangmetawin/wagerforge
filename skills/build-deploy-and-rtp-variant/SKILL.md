---
name: build-deploy-and-rtp-variant
description: Use when adding or releasing RTP variants, tracing config(variant) into private runtime math, reviewing fixed Promo editions, or preparing owner-gated game image deployment. Keywords deploy, RTP variant, private math, Promo, working tree, image version.
metadata:
  constraints: C14
---

# build-deploy-and-rtp-variant

> **Core insight:** RTP follows runtime math selection, not image tags or public declarations; release evidence must bind reviewed sources, selected math and complete-round payments.

## When to use / When NOT

- Use when adding/selecting an RTP variant or preparing a game release.
- NOT for deriving RTP (`math-rtp-modeling`) or issuing certification (`comp-rtp-certification`, `comp-math-cert-report`).

## Default stack (+ escape hatch)

Default: TypeScript + Node server, PixiJS/Phaser client, exact integer/decimal money; a versioned image containing explicit runtime selectors. Other stacks map `config(variant)` to their math resolver and image tags to versioned artifacts. Artifact rollout and math selection are separate contracts; MSS does not establish external CI/infra behavior.

## Process

1. Trace registered game name, `config(variant)`, private-math selection and default/unknown branches for every action. MSS `games/riseOfTheWolf/index.ts` `server.config` selects public configs; `games/riseOfTheWolf/gamePlay.ts` `playMain` selects private math from `config.variant`.
2. Audit fixed-edition exceptions explicitly. MSS `games/tothetopPromo/index.ts` `server.config` ignores variant; `server.play` uses `_math` to select private promo math. `games/tothetopPromo/test-tothetopPromo-promo.test.ts` pins the parent public config. Report advertised RTP separately from actual math; this specimen does not authorize hiding discrepancies.
3. Bind evidence to source/config version, registration, action, strategy, actual charged stake and all API-round payments. Sum newly credited `response.win`, never display totals. MSS `games/zeus/gamePlay.ts` `playMain` pays continuation totals minus prior base credit. Check buy normalization and later-step costs: MSS `docs/GDK_CONTRACT.md` sim denominator ignores later `bet` values.
4. Test selector fallbacks and minimum/representative stakes, including cap/substitution thresholds. Synchronize behavioral public/private configs in ordinary editions and required base/100k mirrors; document verified Promo exceptions. Refresh math evidence and player rules when behavior changes.
5. Before owner-authorized deploy, audit the actual source build context, including uncommitted/untracked game sources. MSS `Dockerfile` source COPY/build stages and `.dockerignore` show what is included; a commit alone does not define the image. Check mirrors, production-safe test naming, temporary cheats, lint/tests/build and a fresh package/image version. MSS `CLAUDE.md` deployment traps document reused tags returning success while shipping nothing.
6. Keep deployment owner-gated. Never edit or execute the deployment script to investigate it; describe proposed changes generically to the owner. Record the released artifact/version and observed selector/payment behavior separately from local checks.

## Correctness constraints

- **C14:** Switching within an approved pre-certified set differs from changing math or shipping an uncertified value; display the active percent. Promotions outside RNG change effective margin, not game RTP. Promo math changes are game changes. Specific switching/re-certification permissions are **(unverified)** in MSS; obtain applicable approval evidence.

## Pitfalls / red flags

Public RTP treated as runtime truth; hardcoded private fallback; inline sims substituted for API payment evidence; unintended working-tree sources; reused image tags.

## Verification

Retain selector tests, full-round request/payment traces, stake-normalized sim outputs and included-source/version review. Deployment is proven only by authorized release evidence and post-release checks, never by a local build or exit code alone.
