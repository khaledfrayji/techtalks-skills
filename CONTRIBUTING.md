# Contributing

Keep changes focused. Explain the workflow problem and provide a reproducible scenario before expanding an instruction.

1. Create a branch for the change.
2. Edit the canonical `skills/<name>/SKILL.md`. Keep its required name and description frontmatter and relative references valid.
3. If changing the shared project contract, update every skill's bundled copy identically. Bundled copies keep each installed skill self-contained.
4. Keep agent-neutral instructions in the skill body. Additional tools are capabilities to check, not assumptions.
5. Update `agents/openai.yaml` if the skill's purpose changes. Do not add credentials or tool preapproval.
6. Add a meaningful installer regression test when changing file operations. Add an evaluation scenario when changing model behavior.
7. Run `npm run check`, `npm test` and `npm pack --dry-run`.
8. Describe validation, relevant risks and limitations in the PR.

Use Node built-ins where possible. Keep the CLI dependency-free and cross-platform. Do not add install hooks, telemetry or automatic publication.

The installer exposes an in-process Node diagnostics channel, `techtalks-skills:mutation`, with `before`, `after` and `rollback` phases plus root, file and action. Use synchronous subscribers to reproduce edits at precise transaction boundaries in tests instead of depending on operating-system filesystem notification timing. These events are local instrumentation, not network telemetry. Keep subscribers read-only outside tests; subscriber exceptions can interrupt the process.

On Windows, directory-link tests use junctions, which do not require Developer Mode. The file-symlink test is skipped only if the OS explicitly denies creation; it remains active on capable Windows environments and other platforms. No installer safety check is disabled.
