# @discountry/clickup-cli

[中文说明](./README_zh.md)

A globally installable ClickUp CLI for tasks, comments, and docs. It repackages the repository's existing skill capabilities into a proper npm CLI package structure:

- Reads configuration directly from shell environment variables
- Covers task, comment, and doc workflows
- Keeps the codebase modular for ongoing maintenance
- Includes automated tests with `node:test`

## Installation

```bash
npm install -g @discountry/clickup-cli
```

After installation, invoke it directly:

```bash
clickup --help
```

For local development against this repository:

```bash
npm install -g .
```

## Configuration

This package does not rely on a local `.env` file. It reads from shell environment variables:

```bash
export CLICKUP_API_TOKEN=pk_your_token_here
export CLICKUP_WORKSPACE_ID=123456
export CLICKUP_USER_ID=7890
export CLICKUP_DEFAULT_LIST_ID=901111220963
```

Variables:

- `CLICKUP_API_TOKEN`: required, your ClickUp Personal API Token
- `CLICKUP_WORKSPACE_ID`: optional, recommended; if omitted the CLI falls back to the first workspace returned by the API
- `CLICKUP_TEAM_ID`: legacy alias for `CLICKUP_WORKSPACE_ID`
- `CLICKUP_USER_ID`: optional, auto-detected from the API when unset
- `CLICKUP_DEFAULT_LIST_ID`: optional, used by shorthand commands such as `clickup create "Task title"`

## Common Commands

```bash
clickup me
clickup get 86a1b2c3d --subtasks
clickup comments 86a1b2c3d
clickup comment 86a1b2c3d "Starting work"
clickup status 86a1b2c3d "in progress"
clickup create "Quick task"
clickup create 901111220963 "New feature" --assignee me --due tomorrow --description "## Scope"
clickup my-tasks
clickup search "authentication"
clickup assign 86a1b2c3d jane
clickup due 86a1b2c3d "+3d"
clickup priority 86a1b2c3d high
clickup subtask 86a1b2c3d "Write tests"
clickup move 86a1b2c3d 901111220964
clickup link 86a1b2c3d "https://github.com/org/repo/pull/123" "PR #123"
clickup checklist 86a1b2c3d "Review code"
clickup delete-comment 90110200841741
clickup watch 86a1b2c3d alex
clickup tag 86a1b2c3d "DevOps"
clickup description 86a1b2c3d "# Summary"
clickup docs
clickup docs "API"
clickup doc abc123
clickup create-doc "Project Notes" --content "# Notes"
clickup page abc123 page456
clickup create-page abc123 "New Section" --content "Hello"
clickup edit-page abc123 page456 --name "Renamed" --content "# Updated"
```

Use `--json` to print raw API responses for scripting.

## Development

```bash
pnpm install
pnpm test
npm run pack:check
```

Entrypoints:

- `bin/clickup.js`: global CLI entry
- `src/cli/`: argument parsing, command registration, and help text
- `src/services/`: task, comment, doc, and user services
- `src/http/`: ClickUp HTTP client
- `src/utils/`: ID parsing, date parsing, Markdown conversion, and output formatting
- `tests/`: automated tests
