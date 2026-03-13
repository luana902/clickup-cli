import { COMMAND_DEFINITIONS, OPTION_DEFINITIONS } from './commands.mjs';

export function renderHelp(binaryName = 'clickup') {
  const sections = new Map();
  for (const command of COMMAND_DEFINITIONS) {
    if (!sections.has(command.section)) {
      sections.set(command.section, []);
    }
    sections.get(command.section).push(command);
  }

  const lines = [
    `Usage: ${binaryName} <command> [options]`,
    '',
  ];

  for (const [section, commands] of sections.entries()) {
    lines.push(`${section}:`);
    for (const command of commands) {
      lines.push(`  ${command.usage.padEnd(34)} ${command.description}`);
    }
    lines.push('');
  }

  lines.push('Options:');
  for (const option of OPTION_DEFINITIONS) {
    lines.push(`  ${option.names.join(', ').padEnd(24)} ${option.description}`);
  }
  lines.push('');
  lines.push('Configuration:');
  lines.push('  CLICKUP_API_TOKEN          Required personal API token');
  lines.push('  CLICKUP_WORKSPACE_ID       Optional workspace ID (falls back to CLICKUP_TEAM_ID)');
  lines.push('  CLICKUP_TEAM_ID            Backward-compatible alias for workspace ID');
  lines.push('  CLICKUP_USER_ID            Optional current user ID');
  lines.push('  CLICKUP_DEFAULT_LIST_ID    Optional default list for `create`');
  lines.push('');
  lines.push('Examples:');
  lines.push(`  ${binaryName} get 86a1b2c3d --subtasks`);
  lines.push(`  ${binaryName} create "Quick task"`);
  lines.push(`  ${binaryName} create 901111220963 "New feature" --assignee me --due tomorrow`);
  lines.push(`  ${binaryName} docs "API"`);
  lines.push(`  ${binaryName} edit-page abc123 page456 --name "Renamed" --content "# Updated"`);

  return lines.join('\n');
}
