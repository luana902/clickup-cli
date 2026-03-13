import test from 'node:test';
import assert from 'node:assert/strict';

import { createTaskService, findMatchingStatus } from '../src/services/task-service.mjs';

function createTaskServiceFixture({
  requestV2,
  commentService = {
    postComment: async () => ({ id: 'comment-1' }),
  },
  userService = {
    getWorkspaceId: async () => 'workspace-1',
    getCurrentUserId: async () => 'user-1',
    findUser: async () => ({ id: 'user-2', username: 'alex' }),
  },
  config = {
    defaultListId: 'list-default',
  },
  now = () => new Date(2026, 2, 13, 10, 30, 0, 0),
} = {}) {
  return createTaskService({
    client: {
      requestV2,
    },
    commentService,
    userService,
    config,
    now,
  });
}

test('findMatchingStatus prefers exact and then partial matches', () => {
  const statuses = [
    { status: 'To Do' },
    { status: 'In Progress' },
    { status: 'Done' },
  ];

  assert.deepEqual(findMatchingStatus(statuses, 'done'), { status: 'Done' });
  assert.deepEqual(findMatchingStatus(statuses, 'progress'), { status: 'In Progress' });
  assert.equal(findMatchingStatus(statuses, 'missing'), null);
});

test('buildCreateTaskPayload uses default list and resolves assignee', async () => {
  const service = createTaskServiceFixture({
    requestV2: async () => {
      throw new Error('requestV2 should not be called for payload generation');
    },
  });

  const result = await service.buildCreateTaskPayload({
    listId: null,
    title: 'Ship CLI',
    description: '## Scope',
    due: 'tomorrow',
    assignee: 'me',
  });

  assert.equal(result.listId, 'list-default');
  assert.deepEqual(result.payload.assignees, ['user-1']);
  assert.equal(result.payload.markdown_description, '## Scope');
  assert.equal(typeof result.payload.due_date, 'number');
});

test('addChecklistItemToTask creates a checklist when one is missing', async () => {
  const calls = [];
  const service = createTaskServiceFixture({
    requestV2: async (path, options = {}) => {
      calls.push({ path, options });

      if (path === '/task/task-1' && (!options.method || options.method === 'GET')) {
        return { checklists: [] };
      }
      if (path === '/task/task-1/checklist') {
        return { checklist: { id: 'checklist-1', name: 'Checklist' } };
      }
      if (path === '/checklist/checklist-1/checklist_item') {
        return { id: 'item-1', name: 'Review code' };
      }

      throw new Error(`Unexpected path: ${path}`);
    },
  });

  const result = await service.addChecklistItemToTask('task-1', 'Review code');
  assert.equal(result.checklist.id, 'checklist-1');
  assert.equal(result.item.id, 'item-1');
  assert.deepEqual(
    calls.map((call) => call.path),
    ['/task/task-1', '/task/task-1/checklist', '/checklist/checklist-1/checklist_item']
  );
});

test('addWatcher falls back to an @mention comment', async () => {
  const service = createTaskServiceFixture({
    requestV2: async () => ({}),
    commentService: {
      postComment: async (taskId, text) => {
        assert.equal(taskId, 'task-1');
        assert.equal(text, '@alex has been added as a watcher on this task.');
        return { id: 'comment-9' };
      },
    },
  });

  const result = await service.addWatcher('task-1', 'alex');
  assert.equal(result.mode, 'mention-comment');
  assert.equal(result.result.id, 'comment-9');
});
