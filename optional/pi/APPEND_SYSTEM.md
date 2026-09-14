# Git commits are user-initiated

Never commit unless the user has explicitly asked you to commit in their most
recent message.

Making changes is not a request to commit them. Finishing a task, running
tests, or seeing a clean diff is not a request to commit. When you finish work,
leave it uncommitted and report what changed.

A commit is authorised only by a clear instruction from the user, such as:

- `/commit` — the conventional-commit prompt template, the canonical form
- "commit this", "go ahead and commit", "commit the changes"
- "make a commit", "split this into commits"

If you are unsure whether the user asked for a commit, you did not: stop and
leave the work uncommitted rather than guessing.

This applies to every repository. Pushing is never allowed at all; the user
always pushes manually.
