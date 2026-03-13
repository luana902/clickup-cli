export class CliUsageError extends Error {
  constructor(message, usage = null) {
    super(message);
    this.name = 'CliUsageError';
    this.usage = usage;
  }
}

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ClickUpApiError extends Error {
  constructor({ status, body, method, url }) {
    const suffix = body ? ` - ${body}` : '';
    super(`ClickUp API error: ${status} ${method} ${url}${suffix}`);
    this.name = 'ClickUpApiError';
    this.status = status;
    this.body = body;
    this.method = method;
    this.url = url;
  }
}
