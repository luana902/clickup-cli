import { ClickUpApiError } from '../errors.mjs';

const API_BASES = {
  v2: 'https://api.clickup.com/api/v2',
  v3: 'https://api.clickup.com/api/v3',
};

function shouldSendJsonBody(body) {
  return body !== undefined && body !== null && typeof body !== 'string';
}

export class ClickUpClient {
  constructor({ token, fetchImpl }) {
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async requestV2(path, options = {}) {
    return this.#request('v2', path, options);
  }

  async requestV3(path, options = {}) {
    return this.#request('v3', path, options);
  }

  async #request(version, path, options) {
    if (typeof this.fetchImpl !== 'function') {
      throw new TypeError('A fetch implementation is required to call the ClickUp API.');
    }

    const method = options.method ?? 'GET';
    const url = `${API_BASES[version]}${path}`;
    const body = shouldSendJsonBody(options.body) ? JSON.stringify(options.body) : options.body;
    const headers = {
      Authorization: this.token,
      ...options.headers,
    };

    if (body !== undefined && body !== null && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await this.fetchImpl(url, {
      method,
      headers,
      body,
    });
    const text = await response.text();

    if (!response.ok) {
      throw new ClickUpApiError({
        status: response.status,
        body: text,
        method,
        url,
      });
    }

    if (!text) {
      return {};
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return JSON.parse(text);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
