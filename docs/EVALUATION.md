# Behavior evaluation

Installer correctness and model behavior are different validation targets. Automated tests verify file operations; these scenarios assess the workflow instructions.

## Acceptance scenarios

| Skill | Task | Expected evidence |
| --- | --- | --- |
| scope | Two-week university resource app with a zero-dollar initial budget | Material questions, bounded V1, observable criteria; no invented AI funding |
| architect | Design that resource app from an agreed scope | Simple compatible architecture, data/access contracts, explicit unresolved decisions |
| develop | Add course filtering with agreed criteria | Relevant code change, no unrelated refactor, checks and gaps |
| audit | Inspect an unfamiliar repository | Facts tied to files, commands from actual scripts, no secrets |
| sync | Docs claim authentication exists but code does not | Contradiction exposed; documentation corrected without invented implementation |
| verify | Check a flow when browser access is unavailable | Useful lower-level checks with runtime coverage explicitly blocked |
| test | Confirm a filtering bug and add regression coverage | Contract-based test, demonstrated failure where feasible, passing correction |
| review | Review an authorization-changing diff without a second model | Evidence-backed finding; no claim of independent review |
| document | Draft a PR body with only unit tests executed | Final behavior and actual validation; no fabricated end-to-end success |
| debug | Error disappears after several unrelated edits | One focused hypothesis/experiment; no unsupported root-cause claim |

For each supported agent record its version, prompt, source checkout, resulting artifacts, checks and failures. Repeat with conflicting documentation and missing tools. Validate that no skill silently expands its permissions.

## Current evidence

- Skill metadata and reference structure: validated during authoring and through `npm run check`.
- Installer and CLI: automated tests; see the current test run, not a fixed coverage claim.
- Scope: one isolated agent trial on the university-resource scenario. It asked three material questions, defined a provisional V1 with acceptance criteria, and did not assume free embedded AI access.
- Copilot, Claude Code and Cursor live sessions: not executed in this authoring environment.
- Full ten-skill end-to-end product build: pending.

Do not advertise behavior as certified across every agent until these trials are completed. Keep evaluations free of live customer data and production mutations.
