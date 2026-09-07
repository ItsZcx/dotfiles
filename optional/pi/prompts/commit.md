---
description: Commit staged changes using the Conventional Commits specification
argument-hint: "[type/description]"
---

# Conventional Commit

Commit the currently staged changes following the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Steps

1. Inspect what is staged:
   ```bash
   git diff --cached --stat
   git diff --cached
   ```

2. If nothing is staged, say so and **stop** — do not stage files yourself without asking me first.

3. Choose the commit **type** from: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

4. If the change is scoped to a specific part (e.g. an API, module, or package), add a **scope**:
   ```
   feat(api): add pagination to list endpoint
   ```

5. Subject line rules:
   - imperative mood ("add", not "adds"/"added")
   - lowercase, under 72 characters, no trailing period

6. Add a **body** only when the change needs explanation — focus on *why*, not *what*. Wrap at 72 chars.

7. Show me the exact commit command you intend to run and wait for my explicit confirmation **before executing it**.

8. **Never run `git push`.** Pushing is always done manually by me after I review the commit.

## Examples

```
feat: allow users to configure a default timeout

Users can now set a per-project timeout in the config file. Defaults to 30s.
```

```
fix(parser): handle CRLF line endings on Windows

The previous regex only matched \n, which broke diffs checked out with
core.autocrlf=true.
```
