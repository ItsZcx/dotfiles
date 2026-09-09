---
name: implement
description: Build the work described by a spec or set of tickets test-first, typechecking as you go, then review the diff before committing.
disable-model-invocation: true
---

<!--
Pi port notes (mattpocock/skills -> pi):
- `/tdd` and `/code-review` have no literal slash form here; they are skills in
  the same tree. Follow them by loading their SKILL.md and executing:
      ../tdd/SKILL.md
      ../code-review/SKILL.md
  "Drive tdd at seams" means run the tdd skill's red-green loop within the work.
- `/clear` between tickets: pi has no single-window clear; start each ticket in a
  fresh session (/new), seeding it from the ticket file and the spec, so each is
  self-contained in its own context window.
- No issue tracker legs. Source of truth is the spec/tickets the user points at
  (e.g. ones written by /skill:to-spec and /skill:to-tickets).
-->

# Implement

Implement the work described by a spec or set of tickets.

Read the spec and/or ticket(s) first. If the user points at tickets written by
the to-tickets skill, work the frontier: any ticket whose blockers are done.

Build each piece **test-first** by loading and following `../tdd/SKILL.md`, one
red-green slice at a time, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite
once at the end.

Once done, load and follow `../code-review/SKILL.md` to review the work along
the Standards axis (and Spec axis against the spec you were given).

Commit your work to the current branch.
