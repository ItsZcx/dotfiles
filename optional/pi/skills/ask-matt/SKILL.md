---
name: ask-matt
description: Ask which skill or flow fits your situation. A router over the coding/workflow skills installed in this pi.
disable-model-invocation: true
---

<!--
Pi port notes:
- No issue-tracker cohort installed (triage/wayfinder/setup/to-* over a real
  tracker) and no GH wiring yet: multi-session/issue work is done locally via
  this install's to-spec + to-tickets (.scratch files). The user manages real
  GitHub issues by hand for now and will bolt on a tracker later if needed.
- Pi-native primitives it routes to:
    /skill:<name>        force-load any user-invoked skill below
    load ../<x>/SKILL.md follow a model-invoked skill by reading its file
    subagent tool       delegate tightly-scoped work to its own context window
    /new, /resume, /fork fresh context without losing the thread
    /compact            compress when a session gets long
- grill-me / handoff / wait-what / teach / writing-for-agents from the upstream
  catalogue are NOT installed; where the original pointed at them this file
  points at the installed equivalent (see the note on each).
-->

# Ask Matt

You don't remember every skill, so ask.

A **flow** is a path through the skills. Most work runs along one **main flow**, with a couple of starting situations that merge onto it. Everything else is standalone or a vocabulary layer underneath.

## The main flow: idea → ship

The route most work travels. You have an idea and want it built.

1. **`grill-with-docs`** sharpens the idea by interview. Start here whenever you are **in a working directory**: it is stateful, retaining what it learns in `CONTEXT.md` and ADRs. (If you have no working directory, run the raw `grilling` skill instead — see Standalone.)
2. **Branch: can you settle every question in conversation?** If a question needs a runnable answer (state, business logic, a UI you have to see), detour through **`prototype`** with throwaway code, keep it on a `prototype/<name>` branch, then fold the answer back in. (Upstream bridged this with `/handoff` and fresh sessions; here, run the prototype in its own subdirectory and return with what you learned.)
3. **Branch: is this a multi-session build?**
   - **Yes** → run **`to-spec`** to pin the thread to a written spec, then **`to-tickets`** to break it into tracer-bullet tickets under `.scratch/<feature>/issues/`, each declaring its **blocking edges**, worked blockers-first. Kick off **`implement`** per ticket in a **fresh session** (`/new`), reading that ticket + the spec, so each is self-contained and disposable after.
   - **No** → **`implement`** right here, in the same context window.

   Either way, **`implement`** builds each ticket by driving **`tdd`** (one red-green slice at a time), then closes out by running **`code-review`** (Standards axis + Spec if a spec exists) before committing. Reach for **`tdd`** on its own to just build a behaviour test-first, and **`code-review`** on its own to review a branch/`HEAD~N` diff.

### Context hygiene (pi-native)

Keep steps 1–3 in **one unbroken session** (don't spin up fresh sessions until after `to-tickets`) so the grilling, spec, and tickets build on the same thinking. Each `implement` then begins with `/new`.

At the **phase boundary** between two chunks of work you have these pi-native moves:
- **Continue**: stay put — costs nothing.
- Start fresh: `/new` (drop the window; it stays `/resume`-able) or `/resume` an older one.
- `/compact`: compress this context and continue when the session is getting long but you still need it.
- **subagent**: delegate a tightly-scoped, AFK-safe task to its own window and get a report back — leave this session untouched.
- The upstream `/handoff` file is not installed; its "portability" job is covered by `/export` + `/resume`, or writing a manual handoff note into the ticket/spec files.

Read [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md) for the ordering logic — decide **at** a boundary; mid-phase continue or split the rest into subagents.

## On-ramps

A starting situation that generates work, then merges onto the main flow.

- **Bugs and feature requests piling up** → you triage them **by hand** for now (no tracker skill is installed). Once something is specified well enough, it feeds the main flow at **`implement`** (or `to-spec`/`to-tickets` if a bigger chunk).
- **Something's broken** → **`diagnosing-bugs`**. For the hard ones: build a tight feedback loop (one command that already goes red on this bug), minimise, hypothesise, instrument, fix with a regression test. Its post-mortem hands off to **`improve-codebase-architecture`** when the real finding is there's no good seam to lock the bug down.
- **A huge, foggy effort** (greenfield, way too big for one session) with no clear local ticket path → there is **no wayfinder skill installed** (it needs a tracker). Do it in slices manually: grill → spec → tickets per feature, each resolved in its own sessions. When the pieces clear, merge onto the main flow at `to-spec`.

## Codebase health

Not feature work, just upkeep.

- **`improve-codebase-architecture`** runs whenever you have a spare moment to keep a codebase good for agents to operate in. It surfaces **deepening opportunities** as an HTML report; picking one _generates an idea_ you can take into the main flow at `grill-with-docs`. It is the survey that finds the candidates; **`codebase-design`** (below) is the vocabulary you design the chosen one on.

## Vocabulary underneath

Two model-invoked references that run *beneath* the others, each the single source of truth for its vocabulary. Reach for them when the **words**, not the process, are the problem.

- **`domain-modeling`**: sharpen the project's *domain* language — challenge a fuzzy term, record a hard-to-reverse decision as an ADR, keep `CONTEXT.md` a clean glossary. It's what `grill-with-docs` drives inline.
- **`codebase-design`**: the deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality). `tdd` and `improve-codebase-architecture` both speak it.

## Standalone

Off the main flow.

- **`grilling`** — the interview primitive itself (rounds, frontier, facts are your job, decisions are the user's). Use `grill-with-docs` when in a repo, raw `grilling` anywhere. (Upstream's `/grill-me` — the stateless named variant — is not installed; raw `grilling` is the equivalent.)
- **`tdd`** — red-green-refactor on one vertical slice; use to build *any* concrete behaviour test-first.
- **`code-review`** — review a diff since a fixed point on two axes (Standards + Spec) before committing.
- **`resolving-merge-conflicts`** — work an in-progress merge/rebase conflict hunk by hunk by intent; never `--abort`.
- **`prototype`** — a small throwaway program that answers one design question.
- **`research`** — delegate reading to a **subagent**: investigate against primary sources, leave a cited Markdown file in the repo. Feed the result into `grill-with-docs` (research feeds thinking, it doesn't replace it).
- **`wizard`** — for steps only a **human** can take: provisioning infra, credentials, an unfamiliar dashboard, a one-off migration. Generates an interactive bash script.
- **`technical-writing`** and **`unslop`** — prose standards for docs/READMEs/commit messages; rough on top of any of the above when writing.
- **`to-spec` / `to-tickets` / `implement`** compound the workflow; listed in the main flow.

## Remarks

No `/setup-*` skill is installed (no tracker). The engineering skills here assume a working repo with `CONTEXT.md`/ADR conventions if you keep them (see `domain-modeling`), which is sufficient — nothing needs configuring up front.
