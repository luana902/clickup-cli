# Repository Guidelines

## Structure

- `package.json`: package metadata.
- `bin/clickup.js`: global CLI entry.
- `src/cli/`: argument parsing, command registration, help output, handlers.
- `src/services/`: task, comment, doc, user workflows.
- `src/http/`: ClickUp HTTP client.
- `src/utils/`: parsers, Markdown conversion, formatters.
- `tests/`: automated tests.
- `skills/clickup/`: skill docs for the global `clickup` binary.

## Commands

- `pnpm install`: install dependencies.
- `node bin/clickup.js --help`: verify CLI wiring.
- `node bin/clickup.js me`: verify auth and current user lookup.
- `node bin/clickup.js get <task-id>`: verify task lookup.
- `pnpm test`: run tests.
- `npm run pack:check`: inspect the publish payload.

## Style

- Use ES modules (`.mjs`).
- Use 2-space indentation, semicolons, and single quotes.
- Keep command handlers in `src/cli/`.
- Keep API workflows in `src/services/` and `src/http/`.
- Keep pure helpers in `src/utils/`.
- Use descriptive verb-based names such as `getTask`, `createPage`, `formatTaskList`.

## Testing

- Add tests under `tests/` with `*.test.mjs`.
- Validate CLI changes with focused commands and `--json` output when useful.

## Pull Requests

- Use a short imperative subject, for example `clickup: add doc page rename support`.
- Include the problem, the approach, verification commands, and any command or env var changes.

## Security

- Do not read, print, or commit `.env` files or secrets.
- Configure the CLI with shell environment variables such as `CLICKUP_API_TOKEN`, `CLICKUP_WORKSPACE_ID`, `CLICKUP_USER_ID`, and `CLICKUP_DEFAULT_LIST_ID`.
- Redact task URLs, IDs, and tokens in logs and screenshots.
