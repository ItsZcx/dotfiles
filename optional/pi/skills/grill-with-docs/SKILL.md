---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADRs and glossary) as you go. Use when working inside a repo and you want the conversation to leave a paper trail.
disable-model-invocation: true
---

<!--
Pi port notes (mattpocock/skills -> pi):
- Upstream body is "Call the Skill tool twice, for grilling and domain-modeling."
  On pi there is no Skill tool; this skill COMPOSES two sibling skills in this
  tree by loading and executing both, interleaved:
      ../grilling/SKILL.md              the interview primitive (rounds, frontier)
      ../domain-modeling/SKILL.md       which turns agreed decisions into
                                        CONTEXT.md glossary terms and ADRs inline
- No issue-tracker/doc-layout precondition (no /setup step). This is stateless
  with respect to a tracker; it only needs a working directory with the repo.
-->

# Grill With Docs

**User-invoked. `disable-model-invocation: true`, so it runs when you /skill:grill-with-docs.**

## Decided here, not built here

This skill **interviews and writes documentation only. It never implements.** Your outputs are (a) a sharpened, agreed design and (b) the durable documentation of it in `CONTEXT.md`/ADRs.

Reaching agreement is **not** a licence to build. When the grill converges, you stop and hand off: summarize the settled decisions, point at what was written to docs, and let the **user** choose the next skill (`implement`, `tdd`, `to-spec`, `to-tickets`, `prototype`, …) to carry it forward. Do not code, scaffold, write implementation files, or otherwise start the work.

How it runs:

Load and execute **both** of these sibling skills now, interleaved:

1. **`../grilling/SKILL.md`** — drive the interview: rounds of direct questions on a plan or design, pushing on the fringe ("frontier"), distinguishing your job (bring facts, evidence, sharp questions) from the user's job (make decisions). It is the raw primitive.

2. **`../domain-modeling/SKILL.md`** — run it *inline* alongside the grilling so that every agreed decision becomes durable, on the spot:
   - when a term is settled or sharpened, record/update it in `CONTEXT.md`;
   - when a hard-to-reverse decision crystallizes, propose an ADR;
   - keep the project's vocabulary matching what you both actually agreed.

How the two interleave: as each grilling round converges on a decision, immediately persist the vocabulary/ADR side effect via domain-modeling **before** moving to the next round. End-of-session, the transcript's paper trail (fresh `CONTEXT.md` terms, ADRs) is the deliverable that makes this different from a stateless grill.

## Stop after deciding

Run grilling to the empty frontier (every branch visited, nothing silently assumed). When it converges:

1. Summarize what was agreed.
2. Note what you recorded in `CONTEXT.md` / ADRs.
3. Ask which skill the user wants to continue with (`implement` / `tdd` / `to-spec` / `to-tickets` / `prototype`, or back to `grilling`).
4. **Stop.** Do not implement, scaffold, write code, or continue the feature yourself.

The idea is sharp and documented — but building it is a separate step the user launches.
