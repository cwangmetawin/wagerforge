---
type: llm
weight: 1
arm: both
---

Grade the final answer for correctness, not wording or formatting. Pass only if every MUST-HAVE rule is satisfied and no disqualifying claim is endorsed. Quoting a folk claim to reject it is not endorsement. A refusal or vague warning without the requested corrected guidance fails.

MUST-HAVE:
- Draw-call and memory thresholds are soft and workload/device-dependent; 500 calls or 256 MB are not universal pass/fail boundaries. Neither their excess nor being below them proves actual smoothness.
- Android commonly uses unified/shared memory, so texture allocations are not a universal discrete VRAM budget. Set explicit budgets per device tier and account for texture residency, decode/loading peaks and total process pressure.
- Profile representative real low/mid target devices with frame-time percentiles and CPU/GPU/memory/thermal observations. Use batching, atlases, reduced state changes/overdraw and residency/loading improvements based on the measured bottleneck.

DISQUALIFYING:
FAIL if the answer endorses >500 draw calls or >256 MB always stutters, being under those numbers guarantees performance, or desktop counters alone justify Android release.
