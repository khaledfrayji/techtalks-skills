# TechTalks Skills

Ten practical software development workflows for AI coding agents. Define what to build, record important decisions, implement deliberately, and verify the result.

**One package. One installer. No agent selection.** No runtime dependencies, API keys, hosted backend, telemetry or install-time network requests beyond npm downloading the package.

## Quick start

Requires Node.js 22 or newer and a supported agent with local/project skill discovery.

Once this package is published on npm, run inside your project:

```bash
npx techtalks-skills init
```

Or pin it as a development dependency:

```bash
npm install -D techtalks-skills
npx techtalks-skills init
```

Installing the npm dependency does not modify your project instructions. Run `init` explicitly. The installer uses the current directory, not an inferred parent repository. Run at the repository root or pass `--cwd`.

**Before npm publication**, clone this repository and run:

```bash
npm ci --ignore-scripts
node bin/cli.js init --cwd /absolute/path/to/your-project
```

Open or reload your agent session. Ask:

> Use the TechTalks scope skill to define V1 for a university resource platform.

Where the agent exposes custom skill commands, use `/scope`, `/architect`, `/develop`, and the other skill names. In Codex, use its skill selector or `$scope`. Command menus and built-in name collisions vary by agent and version; select the project skill or explicitly name its `SKILL.md` path if necessary. The installer cannot change a chat client's command parser.

## The workflows

| Skill | Result |
| --- | --- |
| `scope` | Requirements, V1 boundaries, acceptance criteria and delivery strategy |
| `architect` | System design, contracts and material decision records |
| `develop` | Implementation grounded in agreed requirements and decisions |
| `audit` | Evidence-backed repository context and a prioritized baseline |
| `sync` | Documentation reconciled with inspected code changes |
| `verify` | Real application checks against acceptance criteria |
| `test` | Automated coverage of observable contracts and regressions |
| `review` | Actionable findings from the relevant code diff |
| `document` | Accurate PR descriptions, changelogs and usage documentation |
| `debug` | Reproduction, investigated cause, minimal fix and regression evidence |

For a new project, start with scope and architecture, then develop a small vertical slice. Use test and verify to establish evidence, review to inspect changes, and document/sync to preserve context. For an existing project, audit first when necessary. Invoke debug for a concrete failure. This is a flexible workflow, not a requirement to run all ten skills for every edit.

## Agent compatibility

The installer writes the same portable skill content to two project discovery roots:

| Location | Documented consumers |
| --- | --- |
| `.agents/skills/<name>/` | Codex, GitHub Copilot and Cursor |
| `.claude/skills/<name>/` | Claude Code; also discovered by compatible agents |

No agent needs a different workflow source. Some agents scan both roots and may show duplicate names; use the project skill/source selector if this happens. Copies avoid symlink requirements and work in committed repositories on Windows. We do not overwrite `AGENTS.md`, `CLAUDE.md`, Copilot instructions or existing custom skills.

Compatibility is based on these official discovery contracts:

- [Agent Skills specification](https://agentskills.io/specification)
- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [GitHub Copilot skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Cursor skills](https://cursor.com/docs/skills)

Other agents that discover standard `SKILL.md` folders can consume the same content. For tools without discovery, attach or ask the tool to read the relevant `SKILL.md` and its linked reference. Ordinary hosted chat clients do not gain local skills simply because you ran npm on your computer. No universal slash-command registration is claimed.

## CLI reference

```bash
npx techtalks-skills                  # Same as init
npx techtalks-skills init --dry-run   # Preview without writing
npx techtalks-skills init --skills scope,architect
npx techtalks-skills list
npx techtalks-skills doctor
npx techtalks-skills update
npx techtalks-skills remove
npx techtalks-skills init --cwd ./my-project --json
```

- `init`: install all skills unless `--skills` selects a subset.
- `update`: refresh only managed installed skills by default. It uses the package version you execute; to fetch a new published release, use `npx techtalks-skills@latest update`. Pinned dependencies should be upgraded deliberately.
- `remove`: remove only unmodified managed files, optionally restricted by `--skills`. Unrelated files and project documentation stay in place. Empty directories and the manifest are retained.
- `doctor`: report installed, missing and modified files. Returns a nonzero exit status if a managed file is missing or edited. It checks integrity, not whether a particular agent has loaded the skill.
- `--dry-run`: no writes, locks or directory creation.
- `--json`: structured output suitable for scripts. Errors go to stderr with exit status 1.

## Ownership, conflicts and updates

The installer records content hashes in `.techtalks-skills/manifest.json`. Existing untracked files are never adopted, even if identical. Modified managed files block the transaction; the installer has no destructive `--force` mode.

For a conflict, back up or rename the reported files, then retry. To retain customizations, keep your customized workflow under a different skill name and reinstall the bundled original. Do not edit the manifest to disguise ownership.

Writes are preflighted, serialized with an exclusive project lock and replaced through temporary files. Content is rechecked immediately before replacement/removal, including during rollback. On a caught write error, completed operations are rolled back; concurrent edits are preserved when detected and rollback failures are reported. This is not a crash-proof filesystem transaction or protection against hostile filesystem races. Avoid editing managed files while installation runs. After interruption, inspect `doctor` and the manifest before retrying. Remove a stale `.techtalks-skills/install.lock` only when no installer process is running. The CLI refuses symbolic links in managed destination paths.

Commit the installed project skills and manifest if your team or cloud agent needs them in its checkout. Do not commit the temporary lock. Developers pay for their own agent usage; this package makes no model calls.

## Shared project context

Each skill includes a linked project contract. Reuse equivalent existing documents; otherwise write relevant records under `docs/techtalks/`:

| Artifact | Purpose |
| --- | --- |
| `scope.md` | Requirements and stable acceptance criteria |
| `architecture.md` | Accepted/proposed decisions and contracts |
| `progress.md` | Implementation status and evidence |
| `context.md` | Observed project map, commands and constraints |
| `verification.md` | Acceptance checks, outcomes and coverage gaps |

The installer does not fabricate these documents. The agent creates them when the requested workflow needs them. Skills do not automatically monitor files, supply browsers or second models, or enforce deterministic behavior. Verification must report blocked checks; independent review must report when no second reviewer was available.

## Development and validation

```bash
npm ci --ignore-scripts
npm run check
npm test
npm pack --dry-run
```

The tests exercise the real installer and CLI in isolated temporary projects: discovery paths, idempotence, conflicts, selected skills, updates, removals, missing files, path validation, lock behavior and rollback. CI is configured for Node 22/24 on Linux, macOS and Windows. CI passing on those platforms must be confirmed after pushing; local execution is not proof of every OS.

See [behavior evaluation](docs/EVALUATION.md), [publishing](docs/PUBLISHING.md), [contributing](CONTRIBUTING.md) and [security reporting](SECURITY.md).

## License

MIT. Created by [TechTalks](https://techtalkslb.com).
