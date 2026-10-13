---
schema_version: "1.1"
name: c09-certified-slot-animation
description: Separate server-authoritative certified slots from provably fair commit-reveal
tags: [comp, c9, slots]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We are shipping a lab-certified slot using a protected server CSPRNG, with no provably-fair marketing or player seed protocol. The client starts the reel animation when it receives the server response. Compliance says every certified slot must cryptographically commit the individual result before any animation can start. Do we need to add commit-reveal? Describe the actual result authority and audit requirements.
