---
name: to-spec
description: Turn the current conversation into a written spec saved to the repo, with no follow-up interview. Use when a feature or change has been discussed enough that it is ready to be pinned down on paper.
disable-model-invocation: true
---

<!--
Pi port notes (mattpocock/skills -> pi):
- Invocation: user-invoked (/skill:to-spec).
- No issue tracker (GH dropped for now): the spec is written to a LOCAL file
  under docs/specs/ (see step 3). If a tracker is added later, re-publishing a
  saved spec is a mechanical copy.
- Vocabulary: load and follow ../codebase-design and ../domain-modeling as
  needed for seam and domain language.
-->

# To Spec

This skill takes the current conversation context and codebase understanding and produces a spec. Do NOT interview the user; just synthesize what you already know.

## Process

1. **Explore the repo** to understand the current state of the codebase, if you haven't already. Use the project's domain glossary (`CONTEXT.md`) vocabulary throughout the spec, and respect any ADRs in the area you're touching. If this repo keeps the domain model conventions from the domain-modeling skill, match them.

2. **Sketch the seams** at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better — the ideal number is one. (This is the codebase-design vocabulary: **module / interface / seam**.)

   Check with the user that these seams match their expectations before writing.

3. **Write the spec** using the template below, and save it to a **local file**:

   - Working on a named feature already in `.scratch/` → `docs/specs/<feature-slug>.md`, or if the discussion is still exploratory/not ready to be durable, `.scratch/<feature-slug>/spec.md`.
   - Otherwise → `docs/specs/<feature-slug>.md`. Feature slug = a short kebab-case name derived from the work.
   - Create `docs/specs/` if it doesn't exist.
   - Tell the user the absolute path.

   Do NOT create a GitHub issue or apply labels. If the user later asks to put it on a tracker, you can copy the file contents.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>
