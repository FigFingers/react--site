# AI Development Workflow

This document defines how to use Codex on this repository without relying on ad hoc prompts or manual verification.

## Standard Task Shape

Use Codex primarily for issue-sized work:

- small feature additions
- bug fixes
- API endpoint additions inside existing patterns
- focused test additions
- code review and risk discovery

Avoid bundling unrelated UI, API, and schema redesign into one request unless the task explicitly requires it.

## Request Template

Use this structure when assigning work:

```md
## Goal
What should change.

## Success Criteria
- Observable behavior 1
- Observable behavior 2

## Out Of Scope
- Explicit non-goal 1
- Explicit non-goal 2

## Constraints
- API, DB, auth, compatibility, or rollout constraints

## Validation
- Commands to run
- Manual checks if needed
```

## Request Examples

### Implementation

```md
Add `PATCH /api/v1/playlists/{playlistId}` using the existing route handler pattern.
Success criteria:
- owner can update title and description
- non-owner gets the existing authorization error shape
- zod validation follows current server schema conventions
Validation:
- npm run codex:quick
- npm run codex:schema
```

### Prisma Change

```md
Add a soft-delete aware unique constraint for active playlist names per user.
Constraints:
- use `prisma-augment`
- no destructive reset
Validation:
- npm run codex:schema
- npm run codex:db
```

### Review

```md
Review the current branch for bugs, regressions, and missing tests.
Focus on API behavior, auth boundaries, and migration risk.
```

## Execution Flow

1. Inspect the relevant code paths before proposing changes.
2. Follow existing patterns for routes, schemas, services, repositories, and UI composition.
3. Run the smallest meaningful validation gate before editing when setup risk is unclear.
4. After edits, rerun the required gate for the task.
5. Report changed behavior, validation status, and any remaining risks.
6. If the work is ready to land, provide commit/push/PR commands for the user to run instead of executing them.

## Git Operation Policy

- Codex may run read-only git commands such as `git status`, `git diff`, `git log`, and `git show`.
- Codex must not run `git add`, `git commit`, `git push`, `git tag`, `gh pr create`, `gh pr merge`, or equivalent commands that create history, update remotes, or publish review artifacts.
- This rule applies even when the user asks for those operations. The standard behavior is to print the commands only.

## Handoff Format

For work that is ready to land, the final response should include:

- `Validation`
  - commands actually run and whether they passed
- `Suggested commit`
  - a commit message line when a commit is appropriate
- `Suggested commands`
  - the exact `git` / `gh` commands for the user to run manually

## Validation Gates

- `npm run codex:quick`
  - Node version check
  - lint
  - unit tests
  - TypeScript typecheck
- `npm run codex:schema`
  - Prisma schema validation
  - `prisma-augment` dry check
- `npm run codex:db`
  - `.env.local` presence and required DB settings
  - SSH tunnel bootstrap when `DB_SSH_USER` and `DB_SSH_PORT` are configured
  - `prisma migrate status`
- `npm run codex:full`
  - quick
  - schema
  - db
  - production build

## Failure Handling

- If DB access is unavailable, finish code-only work with `codex:quick` and state that DB validation could not run.
- If `codex:schema` fails after Prisma edits, treat that as blocking before handoff.
- If `codex:db` fails because SSH or remote DB is unavailable, do not substitute destructive local reset steps.
- If a request spans API, DB, and frontend changes, split validation results by area instead of summarizing them as one pass/fail line.
