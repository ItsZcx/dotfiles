---
description: Commit staged changes using the Conventional Commits format
argument-hint: "[type(/scope): description]"
---

# Conventional Commit

Commit the currently staged changes following the [Conventional Commits](https://www.conventionalcommits.org/) format.

## Steps

1. Inspect what is staged:
   ```bash
   git diff --cached --stat
   git diff --cached
   ```

2. If nothing is staged, say so and **stop** — do not stage files yourself without asking me first.

3. Choose the commit **type** from the table below. Type is **required**; every subject starts with a valid type.

4. Add a **scope** when the change targets a specific part of the repo (a file, module, directory, or logical component). Optional but recommended:
   ```
   feat(pi): add unslop skill
   ```

5. Write the subject: imperative mood, lowercase, under 72 characters, no trailing period.

6. Add a **body** only when the change needs explanation — focus on *why*, not *what*. Wrap at 72 chars. Omit the body entirely when it adds nothing.

7. Mark **breaking changes** with `!` after the type/scope: `feat(rules)!: require X`.

8. **Never write placeholder brackets literally.** Drop any section that has no content — never leave `[optional body]`, `[optional footer(s)]`, `[scope]`, or any `[...]` marker in the message. The message must contain only real, final content.

9. **No authorship attributions.** Never add `Co-authored-by`, "authored by AI", tool-name trailers, or any signature lines. `Signed-off-by` is allowed when asked for.

10. Show me the exact commit command you intend to run and wait for my explicit confirmation **before executing it**.

11. **Never run `git push`.** Pushing is always done manually by me after I review the commit.

## Types

| Type       | Use when                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| `feat`     | Adding a new feature (skill, prompt template, extension, script, config) |
| `fix`      | Fixing a bug or incorrect behavior                                       |
| `perf`     | Performance improvement with no functional behavior change               |
| `docs`     | Documentation-only changes (README, SKILL.md content, prose)             |
| `chore`    | Maintenance tasks (dependency updates, config tweaks)                    |
| `refactor` | Restructuring without changing behavior                                  |
| `test`     | Adding or updating tests or validation checks                            |
| `ci`       | CI/CD pipeline changes                                                   |
| `style`    | Formatting, whitespace, or linting fixes with no logic change            |
| `revert`   | Reverting a prior change                                                 |

## Constraints

- **Type is required.** Every subject starts with a valid type.
- **Scope is optional but recommended** — clarify which part of the codebase the change affects, e.g. `feat(pi):`, `fix(bootstrap):`, `docs(readme):`.
- **Description is imperative, lowercase, no period**: "add shell-expert wrapper", not "Added shell-expert wrapper."
- **Breaking changes** add `!` after the type/scope: `feat(rules)!: require ...`.
- **Body** only when needed; state *why*, not *what*; wrap at 72 chars.

## Examples

```
feat(pi): add unslop skill for stripping AI tells

Applies to all prose output automatically. Source: cursor/plugins pstack.
```

```
fix(parser): handle CRLF line endings on Windows

The previous regex only matched \n, which broke diffs checked out with
core.autocrlf=true.
```

```
docs(readme): document optional install features
```
