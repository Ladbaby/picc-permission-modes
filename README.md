# picc-permission-modes

[![npm downloads](https://img.shields.io/npm/dt/@ladbabynpm/picc-permission-modes.svg)](https://www.npmjs.com/package/@ladbabynpm/picc-permission-modes)

A Claude Code style permission-mode system for the [pi coding agent](https://pi.dev).
Part of [picc](https://github.com/Ladbaby/picc), a pi agent setup mirroring Claude Code's harness.
Mirrors upstream `PermissionMode` semantics across messages shown to the LLM, dialogs shown in the TUI, prompt strings, plan-mode flow, dangerous-path safety, and persistence.

Fork of [pi-permission-modes](https://pi.dev/packages/pi-permission-modes), where we replicate Claude Code's harness more faithfully.

## Modes

| Mode | Symbol | Behavior |
| --- | --- | --- |
| `default` | — | Ask on edits/writes. Auto-allow reads inside cwd. Ask on bash outside the read-only allowlist. |
| `acceptEdits` | ⏵⏵ | Auto-allow edits inside cwd. Ask otherwise. Auto-allow bash commands on the upstream allowlist (`mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp`, `sed`). |
| `plan` | ⏸ | Read-only intent, but **not hard-blocked**: only the plan file is auto-allowed; every other edit/write flows through the normal permission prompt (matches Claude Code). Bash and reads defer to `pi-permission-system`. Plan file at `<agentDir>/plans/<slug>.md` (global dir + random 3-word `adjective-verb-noun` slug, e.g. `~/.pi/agent/plans/gleaming-brewing-phoenix.md`). |
| `bypassPermissions` | ⏵⏵ | Auto-allow everything **except** dangerous-path safety checks (`.gitconfig`, `.bashrc`, `.git/`, `.claude/`, etc.). |
| `auto` | ⏵⏵ | Reads/search/plan/task tools are safe-allowlisted (no classifier call). Edits/writes **inside cwd** are fast-pathed like `acceptEdits` (dangerous paths excluded). Everything else goes through a separate LLM classifier that allows safe actions and blocks destructive/exfiltrating ones. If the classifier is **unavailable** (no provider, HTTP error, timeout), the call falls back to a normal user prompt instead of hard-blocking. The TUI surfaces each classifier decision inline (see below). |

## User permissions

Add a `permissions` block to `extensions/picc-permission-modes/config.json` to seed session-allow, session-deny, and session-ask rules. The format is identical to Claude Code's `permissions` block in `~/.claude/settings.json` (see [code.claude.com/docs/en/permissions](https://code.claude.com/docs/en/permissions)). Example:

```json
{
  "permissions": {
    "allow": ["Read", "Bash(go)"],
    "deny": ["Bash(rm *)"],
    "ask": []
  }
}
```

Each rule is a string like `Read`, `Bash(go)`, `Bash(git commit *)`, or `Read(//absolute/path/**)`. Bare tool names (no parens) auto-allow every call to that tool. Paren rules can carry an exact command, a wildcard, or a path glob.

**Precedence:** if the local `permissions` block in `config.json` has any entries in `allow`/`deny`/`ask`, those are used as-is. If the local block is empty (or the file is missing), the loader falls back to parsing `~/.claude/settings.json`'s `permissions` block so the same allow/deny rules you have in Claude Code apply to pi too.

**Auto-persistence:** when the loader falls back to `~/.claude/settings.json`, it also writes the parsed rules back to `config.json` so the rules show up on disk where you can inspect or edit them. The write is idempotent — re-running when the local rules already match the claude settings is a no-op. Other top-level keys in `config.json` (e.g. `autoMode`) are preserved.

Override the loader paths at runtime via env vars:

- `PI_PERMISSIONS_CONFIG_PATH=/abs/path/config.json`
- `CLAUDE_SETTINGS_PATH=/abs/path/settings.json`

Seeded rules are written to the `userSettings` source of the rule store, so they rank lower than session-dialog acceptances (matching upstream's `userSettings` -> `projectSettings` -> `session` precedence) and survive `/resume` and `/fork`.

## Auto-mode classifier decision display

In `auto` mode the classifier runs on tool calls that aren't safe-allowlisted or cwd-fast-pathed. To make its decisions visible to the user (mirroring claude-code's `UserToolSuccessMessage` / `UserToolErrorMessage`), the extension emits a dim line under each tool result:

- **Allow** — `Allowed by auto mode classifier`
- **Deny** — `Denied by auto mode classifier · /feedback if incorrect` (only shown when the classifier itself returned the block; the fallback-to-prompt path lets the user dialog convey the outcome instead)

The hint row is persisted in the session JSONL and re-rendered on `/resume` and `/fork` like any other message.

### How `auto` mode decides (Claude Code parity)

For each `tool_call` in `auto` mode:

1. **Safe-allowlist** — read/search/plan/task/coordination tools (`Read`, `Grep`, `Glob`, `LSP`, `ToolSearch`, `Task*`, `Enter/ExitPlanMode`, …) are allowed with no classifier call.
2. **cwd fast-path** — `edit`/`write` whose target is inside the working directory (and not a dangerous path) is allowed with no classifier call, mirroring Claude Code's `acceptEdits` re-check. This means in-cwd editing is fast and costs no API round-trip.
3. **Classifier** — everything else is sent to the classifier. The transcript sent to it excludes **assistant-authored prose** (only `tool_use` blocks from the assistant + user text) to avoid the model influencing its own gate, and `AGENTS.md`/`CLAUDE.md` contents are prepended as `<user_instructions>` so standing user authorization is honored. When the transcript exceeds the budget, the **oldest** turns are dropped first.
4. **Unavailable ≠ blocked** — if the classifier can't be reached (provider unconfigured, HTTP error, timeout), the call falls back to the normal user prompt (Claude Code's open "iron gate"). A response that is merely *unparseable* still blocks, fail-closed.
5. **Denial tracking** — repeated blocks trip a fallback to a manual prompt; the total counter resets when the total limit trips.

Concrete user-defined allow/deny/ask rules are enforced by the sibling **picc-permission-system** extension, not here — pi runs all `tool_call` hooks with first-block-wins, so its deny rules take precedence. This extension only owns mode gating and the classifier.

## Cycle order

`Shift+Tab` cycles through every mode in order:

- With `bypassPermissions` available: `default → acceptEdits → plan → bypassPermissions → auto → default`
- Without `bypassPermissions`: `default → acceptEdits → plan → auto → default`

`auto` is always reachable from the cycle. Plan and bypass are also reachable via the `EnterPlanMode` / `ExitPlanMode` tools and the `/plan` / `/bypassPermissions` slash commands.

## Plan-mode flow

1. LLM invokes the `EnterPlanMode` tool → user approves → mode switches to `plan`.
2. LLM explores (read-only tools + read-only bash). In plan mode, **writes are not hard-blocked** — only the plan file is auto-allowed; any other `edit`/`write` is surfaced as a normal permission prompt (mirroring Claude Code). Bash and reads defer to `pi-permission-system`.
3. LLM writes the plan to `<agentDir>/plans/<slug>.md` (global plans dir + random 3-word `adjective-verb-noun` slug, e.g. `~/.pi/agent/plans/gleaming-brewing-phoenix.md`). The slug is stable per session and survives `/resume`; `/new` clears it.
4. LLM invokes the `ExitPlanMode` tool → user picks one of six options:
   - **Yes, clear context and auto-accept edits on plan exit**
   - **Yes, auto-accept edits on plan exit**
   - **Yes, clear context and bypass permissions on plan exit**
   - **Yes, bypass permissions on plan exit** (gated behind an opt-in confirmation)
   - **No, stay in plan mode**
   - **No, and let me refine the plan** (opens an editor for notes)

In TUI mode the user sees a centered overlay (matching Claude Code's `ExitPlanModePermissionRequest`):
the plan content is rendered as Markdown in a boxed panel above the option list, so the user always sees exactly what they are approving. Keyboard shortcuts:

- `Enter` — commit the highlighted option
- `Esc` — "No, stay in plan mode"
- `Shift+Tab` — "Yes, auto-accept edits" shortcut
- `Ctrl+G` — edit the plan in `$EDITOR` (refreshes dialog content)
- `1`/`2`/`3`/`4` — jump to option N

When the plan file is empty or whitespace-only, a simplified 2-option dialog ("Yes, proceed without a plan" / "No, stay in plan mode") is shown instead. Headless (RPC/print) mode falls back to the original 3-option `ui.select()` selector.

## CLI

```bash
pi --permission-mode default          # explicit default
pi --permission-mode acceptEdits      # auto-approve edits
pi --permission-mode plan             # start in plan mode
pi --permission-mode bypassPermissions
pi --permission-mode auto             # auto-mode classifier routes every tool call
pi --permission-mode ask              # alias for default
```

## Slash commands

- `/default`, `/acceptEdits`, `/plan`, `/bypassPermissions`, `/auto`
- `/mode <name>` — set mode by alias
- `/mode` — open an interactive selector

## Install

```bash
# Drop the directory into ~/.pi/agent/extensions/picc-permission-modes
# (or install via npm/pnpm once published)
```

The extension is auto-loaded by pi on next session start.

## Test

```bash
npm install
npm test
```

## Files

| File | Purpose |
| --- | --- |
| `index.ts` | Wiring: lifecycle, mode switching, gate, footer, plan-mode attachments. |
| `types.ts` | Pure type definitions (`PermissionMode`, `PermissionResult`, `PermissionUpdate`, …). |
| `permissionContext.ts` | Rule/path matching, dangerous-path detection, `applyPermissionUpdate`. |
| `enterPlanModeTool.ts` | `EnterPlanMode` tool definition. |
| `exitPlanModeTool.ts` | `ExitPlanMode` tool — dispatches to the TUI overlay in TUI mode, falls back to `ui.select()` in headless mode. |
| `exitPlanModeDialog.ts` | TUI overlay component that renders the plan as Markdown with the option list (mirrors claude-code's `ExitPlanModePermissionRequest`). |
| `exitPlanModeDialog.test.ts` | Unit tests for the overlay component (render + keyboard handling). |
| `modeMeta.ts` | Mode metadata + change-notification strings. |
| `utils.ts` | Small helpers (read-only-command allowlist, plan-file path, shortenPath). |
| `auto-mode.ts` | Auto-mode orchestrator: safe-allowlist → classifier → denial tracking; unavailable vs blocked; transcript compaction + `<user_instructions>`. |
| `auto-mode-config.ts` | Config loader for the `autoMode` block (rule lists, provider, limits). |
| `auto-mode-prompts.ts` | Classifier system-prompt template + XML `<block>`/`<reason>` parser. |
| `auto-mode-provider.ts` | Minimal Anthropic-protocol HTTP client (retries 429/5xx, timeout). |
| `auto-mode.test.ts` | Orchestrator unit tests: unavailable/fail-closed, denial limits, transcript shape. |
| `index.test.ts` | Gate matrix, cycle, plan-mode attachment, ExitPlanMode dispatch, dangerous paths, persistence. |