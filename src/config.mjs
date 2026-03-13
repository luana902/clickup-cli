import { ConfigError } from './errors.mjs';

function cleanEnvValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function loadConfig(env = process.env) {
  return {
    apiToken: cleanEnvValue(env.CLICKUP_API_TOKEN),
    workspaceId: cleanEnvValue(env.CLICKUP_WORKSPACE_ID ?? env.CLICKUP_TEAM_ID),
    userId: cleanEnvValue(env.CLICKUP_USER_ID),
    defaultListId: cleanEnvValue(env.CLICKUP_DEFAULT_LIST_ID),
  };
}

export function assertConfig(config) {
  if (!config.apiToken) {
    throw new ConfigError(
      'CLICKUP_API_TOKEN is required. Export it in your shell before running `clickup`.'
    );
  }
}
