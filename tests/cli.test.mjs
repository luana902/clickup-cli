import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/index.mjs';
import { createBufferStream } from './helpers/io.mjs';

function baseEnv(overrides = {}) {
  return {
    CLICKUP_API_TOKEN: 'pk_test',
    CLICKUP_WORKSPACE_ID: 'workspace-1',
    ...overrides,
  };
}

test('runCli prints help without requiring configuration', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['--help'],
    stdout,
    stderr,
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Usage: clickup <command> \[options\]/);
  assert.equal(stderr.toString(), '');
});

test('runCli creates tasks using the default list id', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const calls = [];

  const exitCode = await runCli({
    argv: ['create', 'Quick task', '--assignee', 'me'],
    env: baseEnv({
      CLICKUP_DEFAULT_LIST_ID: 'list-123',
    }),
    stdout,
    stderr,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });

      if (url.endsWith('/api/v2/user')) {
        return new Response(JSON.stringify({
          user: {
            id: 'user-1',
            username: 'jane',
            email: 'jane@example.com',
          },
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.endsWith('/api/v2/list/list-123/task')) {
        const body = JSON.parse(options.body);
        assert.equal(body.name, 'Quick task');
        assert.deepEqual(body.assignees, ['user-1']);

        return new Response(JSON.stringify({
          id: 'task-1',
          name: 'Quick task',
          assignees: [{ username: 'jane' }],
          url: 'https://app.clickup.com/t/task-1',
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Task created: Quick task/);
  assert.equal(stderr.toString(), '');
  assert.deepEqual(
    calls.map((call) => call.url),
    [
      'https://api.clickup.com/api/v2/user',
      'https://api.clickup.com/api/v2/list/list-123/task',
    ]
  );
});

test('runCli returns command usage errors cleanly', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['edit-page', 'doc-1', 'page-1'],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(stdout.toString(), '');
  assert.match(stderr.toString(), /At least --content or --name is required/);
  assert.match(stderr.toString(), /Usage: clickup edit-page <doc_id> <page_id>/);
});

test('runCli rejects extra positional arguments cleanly', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['get', 'task-1', '--wat'],
    stdout,
    stderr,
  });

  assert.equal(exitCode, 1);
  assert.equal(stdout.toString(), '');
  assert.match(stderr.toString(), /Too many arguments/);
});

test('runCli allows dash-prefixed comment text as a positional argument', async () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();

  const exitCode = await runCli({
    argv: ['comment', 'task-1', '- first line'],
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async (url, options = {}) => {
      assert.equal(url, 'https://api.clickup.com/api/v2/task/task-1/comment');
      const body = JSON.parse(options.body);
      assert.ok(Array.isArray(body.comment));
      return new Response(JSON.stringify({ id: 'comment-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /Comment posted successfully/);
  assert.equal(stderr.toString(), '');
});
