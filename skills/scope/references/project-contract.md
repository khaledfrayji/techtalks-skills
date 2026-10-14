# Shared project contract

## Context and artifacts

Find the repository root and read applicable instructions before changing files. Prefer existing project documentation. When no equivalent exists, use `docs/techtalks/`:

- `scope.md`: users, problem, V1 boundaries, acceptance criteria (AC-01, AC-02), assumptions and unresolved questions.
- `architecture.md`: system boundaries, interfaces, data model, relevant tradeoffs and decision records (ADR-01). Mark proposed, accepted or superseded decisions.
- `progress.md`: implementation steps, affected requirements, completed work, outstanding work and evidence.
- `context.md`: concise observed stack, file map, commands, constraints and links to authoritative records.
- `verification.md`: requirement-to-check mapping, environment, outcomes, evidence and untested paths.

Create or update only artifacts relevant to the request. Keep code paths and commands grounded in inspected files. Label observations, assumptions, proposals and unknowns. Never claim a timestamp proves freshness: compare documentation to code and evidence.

## Decision discipline

Existing accepted decisions remain authoritative until explicitly revised. A small local change does not require a new architecture document. For a material missing decision (authorization, public API contract, persistent data model, external dependency or infrastructure), state the gap and a recommended choice. Resolve it with the developer before implementing work that depends on it; continue independent authorized work.

Record the outcome, alternatives and reason for material decisions. Do not silently turn an assumption into a requirement. A thin vertical slice is an implementation strategy; an MVP is a product scope. They can be used together.

## Evidence and safety

Do not overwrite unrelated work, erase tests to make checks pass, weaken authorization or silently change requirements. Do not publish, deploy, send messages, incur costs or perform destructive operations without authorization. Use fake or local test data. Do not copy credentials, customer records or private logs into artifacts.

Inspect available scripts and environment requirements before executing. Distinguish passed, failed, blocked and not run. Report the command or action, relevant result and limitation. A green build alone does not prove user flows, accessibility, security or business correctness.

## Communication

Lead with the outcome. Ask only questions that materially change the work, in small groups. Use plain language and actionable recommendations. End with completed work, evidence, unresolved items and the next useful workflow. Skills guide the agent; they do not enforce a deterministic execution policy or provide additional tools.
