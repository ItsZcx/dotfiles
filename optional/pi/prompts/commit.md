---
description: Commit all uncommitted work in separate logical commits using Conventional Commits
argument-hint: "[type(/scope): description | paths...]"
---

# Conventional Commit — everything

By default, commit **everything that is uncommitted** (staged, unstaged
modified/untracked) by splitting it into separate **logical commits**. If you
pass paths or a subject (e.g. `feat(pi): fix x` or a file list), commit only
what was asked for instead and treat that as the scope.

## Default scope (no arguments)

1. Take stock of the whole working tree, not just staged files:
   ```bash
   git status
   git diff          # unstaged changes to tracked files
   git diff --cached # any already-staged changes
   git ls-files --others --exclude-standard   # untracked files
   ```

2. Group those changes into **separate logical commits**: each commit is one
   cohesive unit (e.g. one feature, one bug fix, one skill, one config tree).
   Split a file from others when they are unrelated — do not force unrelated
   files into one commit just because they were changed in the same session.
   Name a scope per commit (`feat(pi)`, `chore(pi)`, ...) from the table.

3. For each commit, stage exactly its files:
   ```bash
   git add <paths for commit #N>
   ```

4. **Show me your plan before committing anything.** Present each commit in
   the exact layout below, so it is easy to check at a glance:

   ```
   Commit <N> — <full conventional subject, e.g. feat(pi): ...>
   - Developer description: <high-level summary of the diff's important logic,
       functions, parameters, or structural changes>
   - Files:
       <file(s)>: <concise note specific to these file(s)>
   ```

   Rules for this output:
   - `Commit <N> —` keeps the subject exactly as it will be used.
   - **Developer description** explains the *substance* of the change (key
     logic, new/changed functions, parameters, interfaces, structure) at a
     high level, not a line-by-line listing.
   - **Files:** list an actual path (or group of related paths) per bullet,
     each followed by a short description of what changed there. Group files
     that changed together under one entry only when the change is the same
     and it stays readable.

   Repeat the block for every planned commit, in order. Wait for my
   confirmation before running any `git commit`.

## Common steps per commit

5. Choose the commit **type** from the table. Type is **required**. Type is
   required in every subject; use `scope` to identify the touched area.

6. Subject: imperative mood, lowercase, under 72 characters, no period.

7. Add a body only when it explains *why*; wrap at 72 chars; omit when it adds
   nothing. Mark breaking changes with `!` after type/scope
   (`feat(rules)!: require X`).

8. **Never write placeholder brackets literally** (`[scope]`, `[body]`, ...).
   Only real final content in the message.

9. **No authorship attributions** (no `Co-authored-by`, no tool trailers).
   `Signed-off-by` is allowed if I ask for it.

10. When I confirm, run the **exact** commit commands you showed, one logical
    commit at a time, and report each commit's result (its full hash/subject).

11. **Never run `git push`.** Pushing is always done by me after I review the
    commits.

## Types

| Type     | Use when                                                                 |
| -------- | ------------------------------------------------------------------------ |
| `feat`   | Adding a new feature (skill, prompt template, extension, script, config) |
| `fix`    | Fixing a bug or incorrect behavior                                       |
| `perf`   | Performance improvement with no functional behavior change               |
| `docs`   | Documentation-only changes (README, SKILL.md content, prose)             |
| `chore`  | Maintenance tasks (dependency updates, config tweaks)                    |
| `refactor` | Restructuring without changing behavior                                |
| `test`   | Adding or updating tests or validation checks                            |
| `ci`     | CI/CD pipeline changes                                                   |
| `style`  | Formatting, whitespace, or linting fixes with no logic change            |
| `revert` | Reverting a prior change                                                 |

## Constraints
- **Type is required.** Scope optional but recommended
  (`feat(pi):`, `fix(bootstrap):`, `docs(readme):`).
- **Description imperative, lowercase, no period.**
- Splitting is by logical group, not by who staged it or when it was written.
