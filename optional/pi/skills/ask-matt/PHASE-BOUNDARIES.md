# Phase boundaries

A **phase** is a chunk of work inside a session: the grilling, the implementation, the QA. The definition is fuzzy on purpose: a phase ends when you think *"ok, we're done with that"*.

The **phase boundary** is the gap between two phases, and it is the only place this decision belongs. Mid-phase there is no decision to make: continue, or split the work that's left into subagents. Compacting mid-phase makes the agent lose the thread.

## The options (pi-native)

| Option       | What it does                                                    |
| ------------ | --------------------------------------------------------------- |
| **Continue** | Stay in the session. No context switch at all.                    |
| **`/new`**   | Empty the window and start from nothing; the old session stays `/resume`-able. |
| **`/compact`** | Compress this context and carry on in the same session.          |
| **Subagent** | Send a tightly-scoped task to its own context window (pi `subagent` tool) and get a report back. |
| **`/export` + `/resume`** | Write the session to a file and seed it again elsewhere (the portability move; closest to the upstream `/handoff`). |

The upstream `/clear`/`/handoff` commands are not pi built-ins. `/new` plays `/clear`'s role of a fresh, still-resumable window; `/export`+`/resume` play `/handoff`'s role when something must travel. Don't invent other semantics.

## The tree

Work top to bottom at the boundary. The first **yes** wins.

**1. Can you continue in this session?** Two things make the answer yes: the next phase needs this phase as a **primary source** (grilling → implementation wants the reasoning verbatim, not a summary), or you have enough room left for the next phase to fit comfortably. Grilling → implementation is the standard yes. Continue costs nothing and loses nothing, so rule it out before anything else.

**2. Is the context irrelevant to what comes next?** Is everything in this session (exploration, decisions, dead ends) disposable? If so, start fresh with `/new` — it hands back the whole window and the old session stays resumable.

The cost of getting this wrong is one-way. Clearing a *relevant* context loses the **why** behind what you built, and no amount of reading the diff back returns it.

**3. Does something need to travel?** `/export` + `/resume` (a file that moves) — only when you're swapping harnesses, moving to a new directory/repo, sending work to a colleague, or forking a side task mid-phase. If nothing is travelling you don't need it.

**4. Can the task be done AFK?** Is it scoped tightly enough to run with the user away from the keyboard, no steering? Send it to a **subagent** and leave this session untouched. Automated review is the standard case: the agent reads the diff and reports, and no one is needed while it does.

**5. Otherwise, `/compact`.** Relevant context, same harness, same directory, user stays in the loop: this is where the tree lands, and it lands here often. Pass it an instruction (`/compact we're going to QA this area`) so the summary keeps what the next phase needs.

`/compact` is the **default, not the first reach**. The four questions above it are cheaper or more precise. The failure mode when you start here is a fresh session confidently wrong about a decision the summary flattened.

## Primary and secondary sources

Every move except **Continue** turns a **primary source** into a **secondary source**: the session as it happened, replaced by a summary or a fresh start. The trade is always the same shape:

| Source                                          | Information | Noise | Room to move |
| ----------------------------------------------- | ----------- | ----- | ------------ |
| Primary (Continue)                              | Full        | Lots  | Little       |
| Secondary (`/compact`, `/export`, subagent)     | Lossy       | Less  | Lots         |

This is why question 1 comes first. You only pay the lossiness when staying costs more than it saves.

## These are judgement calls

The questions are not objective: each has taste in it, and the same boundary can go two ways on two days. The value is in asking them **in order**, at the boundary rather than in the middle of the work.

> Upstream provenance: mattpocock/skills engineering `ask-matt` support doc, re-mapped from Claude Code commands (`/clear`, `/handoff`, `/compact`) onto pi-native equivalents (`/new`, `/export`+`/resume`, `/compact`) and the pi `subagent` tool.
