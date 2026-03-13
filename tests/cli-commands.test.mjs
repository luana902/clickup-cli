import test from 'node:test';
import assert from 'node:assert/strict';

import { COMMAND_DEFINITIONS } from '../src/cli/commands.mjs';
import { createHandlers } from '../src/cli/handlers.mjs';
import { runCli } from '../src/index.mjs';
import { createBufferStream } from './helpers/io.mjs';

const USER = {
  id: 'user-1',
  username: 'jane',
  email: 'jane@example.com',
  timezone: 'UTC',
};

const TASK = {
  id: 'task-1',
  name: 'Ship CLI',
  status: { status: 'to do' },
  priority: null,
  assignees: [{ username: 'jane' }],
  due_date: null,
  date_created: null,
  url: 'https://app.clickup.com/t/task-1',
};

const DOC = {
  id: 'doc-1',
  name: 'Project Notes',
  workspace_id: 'workspace-1',
};

const PAGE = {
  id: 'page-1',
  name: 'Overview',
  content: 'plain text',
};

const SERVICE_METHODS = {
  userService: [
    'getCurrentUser',
    'getCurrentUserId',
  ],
  commentService: [
    'getComments',
    'postComment',
    'deleteComment',
  ],
  taskService: [
    'getTask',
    'getAvailableStatuses',
    'updateTaskStatus',
    'getTasksInList',
    'buildCreateTaskPayload',
    'createTask',
    'getMyTasks',
    'searchTasks',
    'resolveAssigneeId',
    'assignTask',
    'setDueDate',
    'setPriority',
    'createSubtask',
    'moveTask',
    'addExternalLink',
    'addChecklistItemToTask',
    'addWatcher',
    'addTag',
    'updateDescription',
  ],
  docService: [
    'searchDocs',
    'getDoc',
    'getDocPageListing',
    'createDoc',
    'getPage',
    'createPage',
    'editPage',
  ],
};

function baseEnv(overrides = {}) {
  return {
    CLICKUP_API_TOKEN: 'pk_test',
    CLICKUP_WORKSPACE_ID: 'workspace-1',
    ...overrides,
  };
}

function createStubApp(overrides = {}) {
  const calls = [];
  const app = {};

  for (const [serviceName, methodNames] of Object.entries(SERVICE_METHODS)) {
    const serviceOverrides = overrides[serviceName] ?? {};
    app[serviceName] = {};

    for (const methodName of methodNames) {
      app[serviceName][methodName] = async (...args) => {
        calls.push({ serviceName, methodName, args });
        const implementation = serviceOverrides[methodName];
        if (!implementation) {
          throw new Error(`Unexpected call: ${serviceName}.${methodName}`);
        }
        return implementation(...args);
      };
    }
  }

  return {
    app,
    calls,
  };
}

async function runCliWithStubApp({ argv, overrides }) {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const { app, calls } = createStubApp(overrides);
  let createApplicationCalls = 0;

  const exitCode = await runCli({
    argv,
    env: baseEnv(),
    stdout,
    stderr,
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    },
    createApplicationImpl: ({ env, fetchImpl, now }) => {
      createApplicationCalls += 1;
      assert.equal(env.CLICKUP_API_TOKEN, 'pk_test');
      assert.equal(typeof fetchImpl, 'function');
      assert.equal(typeof now, 'function');
      return app;
    },
  });

  return {
    exitCode,
    stdout: stdout.toString(),
    stderr: stderr.toString(),
    calls,
    createApplicationCalls,
  };
}

function assertSuccessfulResult(result, expectedOutput) {
  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.createApplicationCalls, 1);

  for (const expectation of expectedOutput) {
    if (expectation instanceof RegExp) {
      assert.match(result.stdout, expectation);
      continue;
    }
    assert.match(result.stdout, new RegExp(expectation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
}

const commandCases = [
  {
    command: 'get',
    argv: ['get', 'https://app.clickup.com/t/86a1b2c3d', '--subtasks'],
    overrides: {
      taskService: {
        async getTask(taskId, options) {
          assert.equal(taskId, '86a1b2c3d');
          assert.deepEqual(options, { includeSubtasks: true });
          return {
            ...TASK,
            subtasks: [{ name: 'Write tests', status: { status: 'done' } }],
            tags: [{ name: 'cli' }],
          };
        },
      },
    },
    expectedOutput: ['Task: Ship CLI', 'Subtasks (1):', 'Tags: cli'],
  },
  {
    command: 'comments',
    argv: ['comments', 'task-1'],
    overrides: {
      commentService: {
        async getComments(taskId) {
          assert.equal(taskId, 'task-1');
          return [{ user: USER, comment_text: 'Looks good', date: null }];
        },
      },
    },
    expectedOutput: ['Looks good', 'jane'],
  },
  {
    command: 'comment',
    argv: ['comment', 'task-1', 'Ship it'],
    overrides: {
      commentService: {
        async postComment(taskId, message) {
          assert.equal(taskId, 'task-1');
          assert.equal(message, 'Ship it');
          return { id: 'comment-1' };
        },
      },
    },
    expectedOutput: ['Comment posted successfully (ID: comment-1)'],
  },
  {
    command: 'status',
    argv: ['status', 'task-1', 'progress'],
    overrides: {
      taskService: {
        async updateTaskStatus(taskId, status) {
          assert.equal(taskId, 'task-1');
          assert.equal(status, 'progress');
          return {
            task: { ...TASK, status: { status: 'In Progress' } },
            matchedStatus: { status: 'In Progress', type: 'custom' },
          };
        },
      },
    },
    expectedOutput: ['Status updated to "In Progress"'],
  },
  {
    command: 'tasks',
    argv: ['tasks', 'https://app.clickup.com/123/v/li/456', '--me'],
    overrides: {
      userService: {
        async getCurrentUserId() {
          return USER.id;
        },
      },
      taskService: {
        async getTasksInList(listId, options) {
          assert.equal(listId, '456');
          assert.deepEqual(options, { assigneeId: USER.id });
          return [TASK];
        },
      },
    },
    expectedOutput: ['Ship CLI', 'Total: 1 task(s)'],
  },
  {
    command: 'me',
    argv: ['me'],
    overrides: {
      userService: {
        async getCurrentUser() {
          return USER;
        },
      },
    },
    expectedOutput: ['User: jane', 'Timezone: UTC'],
  },
  {
    command: 'create',
    argv: ['create', '456', 'Ship CLI', '--description', '## Scope', '--due', 'tomorrow', '--assignee', 'me'],
    overrides: {
      taskService: {
        async buildCreateTaskPayload(input) {
          assert.deepEqual(input, {
            listId: '456',
            title: 'Ship CLI',
            description: '## Scope',
            due: 'tomorrow',
            assignee: 'me',
          });
          return {
            listId: '456',
            payload: {
              markdown_description: '## Scope',
              due_date: 1741824000000,
              assignees: [USER.id],
            },
          };
        },
        async createTask(listId, title, payload) {
          assert.equal(listId, '456');
          assert.equal(title, 'Ship CLI');
          assert.deepEqual(payload, {
            markdown_description: '## Scope',
            due_date: 1741824000000,
            assignees: [USER.id],
          });
          return TASK;
        },
      },
    },
    expectedOutput: ['Task created: Ship CLI', 'ID: task-1'],
  },
  {
    command: 'my-tasks',
    argv: ['my-tasks'],
    overrides: {
      taskService: {
        async getMyTasks() {
          return [TASK];
        },
      },
    },
    expectedOutput: ['Ship CLI', 'Total: 1 task(s)'],
  },
  {
    command: 'search',
    argv: ['search', 'deploy'],
    overrides: {
      taskService: {
        async searchTasks(query) {
          assert.equal(query, 'deploy');
          return [{ ...TASK, id: 'task-2', name: 'Deploy CLI', url: 'https://app.clickup.com/t/task-2' }];
        },
      },
    },
    expectedOutput: ['Deploy CLI', 'Total: 1 task(s)'],
  },
  {
    command: 'assign',
    argv: ['assign', 'task-1', 'alex'],
    overrides: {
      taskService: {
        async resolveAssigneeId(userQuery) {
          assert.equal(userQuery, 'alex');
          return 'user-2';
        },
        async assignTask(taskId, assigneeIds) {
          assert.equal(taskId, 'task-1');
          assert.deepEqual(assigneeIds, ['user-2']);
          return TASK;
        },
      },
    },
    expectedOutput: ['Task assigned to alex'],
  },
  {
    command: 'due',
    argv: ['due', 'task-1', 'clear'],
    overrides: {
      taskService: {
        async setDueDate(taskId, dueInput) {
          assert.equal(taskId, 'task-1');
          assert.equal(dueInput, 'clear');
          return { ...TASK, due_date: null };
        },
      },
    },
    expectedOutput: ['Due date set to: cleared'],
  },
  {
    command: 'priority',
    argv: ['priority', 'task-1', 'high'],
    overrides: {
      taskService: {
        async setPriority(taskId, level) {
          assert.equal(taskId, 'task-1');
          assert.equal(level, 'high');
          return { task: TASK, priority: 'high' };
        },
      },
    },
    expectedOutput: ['Priority set to: high'],
  },
  {
    command: 'subtask',
    argv: ['subtask', 'task-1', 'Write docs'],
    overrides: {
      taskService: {
        async createSubtask(taskId, title) {
          assert.equal(taskId, 'task-1');
          assert.equal(title, 'Write docs');
          return {
            id: 'subtask-1',
            name: 'Write docs',
            url: 'https://app.clickup.com/t/subtask-1',
          };
        },
      },
    },
    expectedOutput: ['Subtask created: Write docs', 'ID: subtask-1'],
  },
  {
    command: 'move',
    argv: ['move', 'task-1', '456'],
    overrides: {
      taskService: {
        async moveTask(taskId, targetListId) {
          assert.equal(taskId, 'task-1');
          assert.equal(targetListId, '456');
          return { ...TASK, url: 'https://app.clickup.com/t/task-1' };
        },
      },
    },
    expectedOutput: ['Task moved successfully', 'https://app.clickup.com/t/task-1'],
  },
  {
    command: 'link',
    argv: ['link', 'task-1', 'https://example.com/spec', 'Spec'],
    overrides: {
      taskService: {
        async addExternalLink(taskId, url, description) {
          assert.equal(taskId, 'task-1');
          assert.equal(url, 'https://example.com/spec');
          assert.equal(description, 'Spec');
          return { id: 'comment-3' };
        },
      },
    },
    expectedOutput: ['Link added as comment (ID: comment-3)'],
  },
  {
    command: 'checklist',
    argv: ['checklist', 'task-1', 'Review code'],
    overrides: {
      taskService: {
        async addChecklistItemToTask(taskId, itemName) {
          assert.equal(taskId, 'task-1');
          assert.equal(itemName, 'Review code');
          return {
            checklist: { id: 'checklist-1', name: 'Checklist' },
            item: { id: 'item-1', name: 'Review code' },
          };
        },
      },
    },
    expectedOutput: ['Added to checklist "Checklist"'],
  },
  {
    command: 'delete-comment',
    argv: ['delete-comment', 'comment-1'],
    overrides: {
      commentService: {
        async deleteComment(commentId) {
          assert.equal(commentId, 'comment-1');
          return {};
        },
      },
    },
    expectedOutput: ['Comment comment-1 deleted'],
  },
  {
    command: 'watch',
    argv: ['watch', 'task-1', 'alex'],
    overrides: {
      taskService: {
        async addWatcher(taskId, userQuery) {
          assert.equal(taskId, 'task-1');
          assert.equal(userQuery, 'alex');
          return {
            user: { id: 'user-2', username: 'alex' },
            result: { id: 'comment-4' },
            mode: 'mention-comment',
          };
        },
      },
    },
    expectedOutput: ['Notified alex', 'ClickUp API does not support adding watchers directly'],
  },
  {
    command: 'tag',
    argv: ['tag', 'task-1', 'backend'],
    overrides: {
      taskService: {
        async addTag(taskId, tagName) {
          assert.equal(taskId, 'task-1');
          assert.equal(tagName, 'backend');
          return {};
        },
      },
    },
    expectedOutput: ['Tag "backend" added to task'],
  },
  {
    command: 'description',
    argv: ['description', 'task-1', '# Summary'],
    overrides: {
      taskService: {
        async updateDescription(taskId, text) {
          assert.equal(taskId, 'task-1');
          assert.equal(text, '# Summary');
          return TASK;
        },
      },
    },
    expectedOutput: ['Task description updated', 'https://app.clickup.com/t/task-1'],
  },
  {
    command: 'docs',
    argv: [
      'docs',
      'Sprint',
      '--id',
      'doc-9',
      '--creator',
      'user-2',
      '--deleted',
      '--archived',
      '--parent-id',
      'parent-1',
      '--parent-type',
      'FOLDER',
      '--limit',
      '10',
    ],
    overrides: {
      docService: {
        async searchDocs(options) {
          assert.deepEqual(options, {
            query: 'Sprint',
            id: 'doc-9',
            creator: 'user-2',
            deleted: true,
            archived: true,
            parentId: 'parent-1',
            parentType: 'FOLDER',
            limit: '10',
          });
          return [{ id: 'doc-9', name: 'Sprint Planning' }];
        },
      },
    },
    expectedOutput: ['Sprint Planning', 'Total: 1 doc(s)'],
  },
  {
    command: 'doc',
    argv: ['doc', 'doc-1', '--max-page-depth', '2'],
    overrides: {
      docService: {
        async getDoc(docId) {
          assert.equal(docId, 'doc-1');
          return DOC;
        },
        async getDocPageListing(docId, options) {
          assert.equal(docId, 'doc-1');
          assert.deepEqual(options, { maxPageDepth: '2' });
          return [{ id: 'page-1', name: 'Overview' }];
        },
      },
    },
    expectedOutput: ['Doc: Project Notes', 'Overview'],
  },
  {
    command: 'create-doc',
    argv: ['create-doc', 'Project Notes', '--content', '# Seed'],
    overrides: {
      docService: {
        async createDoc(title, options) {
          assert.equal(title, 'Project Notes');
          assert.deepEqual(options, { content: '# Seed' });
          return { ...DOC, firstPageId: 'page-1' };
        },
      },
    },
    expectedOutput: ['Doc created: Project Notes', 'First page populated with content.'],
  },
  {
    command: 'page',
    argv: ['page', 'doc-1', 'page-1', '--content-format', 'text/plain'],
    overrides: {
      docService: {
        async getPage(docId, pageId, contentFormat) {
          assert.equal(docId, 'doc-1');
          assert.equal(pageId, 'page-1');
          assert.equal(contentFormat, 'text/plain');
          return PAGE;
        },
      },
    },
    expectedOutput: ['Page: Overview', 'plain text'],
  },
  {
    command: 'create-page',
    argv: [
      'create-page',
      'doc-1',
      'Overview',
      '--content',
      '# Hello',
      '--sub-title',
      'Subheading',
      '--parent-page-id',
      'page-0',
      '--content-format',
      'text/plain',
    ],
    overrides: {
      docService: {
        async createPage(docId, title, options) {
          assert.equal(docId, 'doc-1');
          assert.equal(title, 'Overview');
          assert.deepEqual(options, {
            content: '# Hello',
            contentFormat: 'text/plain',
            parentPageId: 'page-0',
            subTitle: 'Subheading',
          });
          return { id: 'page-1', name: 'Overview' };
        },
      },
    },
    expectedOutput: ['Page created: Overview', 'ID: page-1'],
  },
  {
    command: 'edit-page',
    argv: [
      'edit-page',
      'doc-1',
      'page-1',
      '--name',
      'Overview v2',
      '--content',
      'delta',
      '--sub-title',
      'Refined',
      '--content-edit-mode',
      'append',
      '--content-format',
      'text/plain',
    ],
    overrides: {
      docService: {
        async editPage(docId, pageId, updates) {
          assert.equal(docId, 'doc-1');
          assert.equal(pageId, 'page-1');
          assert.deepEqual(updates, {
            content: 'delta',
            name: 'Overview v2',
            subTitle: 'Refined',
            contentEditMode: 'append',
            contentFormat: 'text/plain',
          });
          return { id: 'page-1' };
        },
      },
    },
    expectedOutput: ['Page updated successfully', 'ID: page-1'],
  },
];

test('documented commands match implemented handlers', () => {
  const handlers = createHandlers(() => ({
    userService: {},
    commentService: {},
    taskService: {},
    docService: {},
  }));

  assert.deepEqual(
    Object.keys(handlers).sort(),
    COMMAND_DEFINITIONS.map((command) => command.name).sort()
  );
});

test('cli success matrix covers every documented command', () => {
  assert.deepEqual(
    [...new Set(commandCases.map((commandCase) => commandCase.command))].sort(),
    COMMAND_DEFINITIONS.map((command) => command.name).sort()
  );
});

test('runCli executes every documented command successfully', async (t) => {
  for (const commandCase of commandCases) {
    await t.test(commandCase.command, async () => {
      const result = await runCliWithStubApp({
        argv: commandCase.argv,
        overrides: commandCase.overrides,
      });

      assertSuccessfulResult(result, commandCase.expectedOutput);
    });
  }
});

test('runCli lists available statuses when no new status is provided', async () => {
  const result = await runCliWithStubApp({
    argv: ['status', 'task-1'],
    overrides: {
      taskService: {
        async getAvailableStatuses(taskId) {
          assert.equal(taskId, 'task-1');
          return [
            { status: 'To Do', type: 'open' },
            { status: 'In Progress', type: 'custom' },
          ];
        },
      },
    },
  });

  assertSuccessfulResult(result, ['Available statuses:', '"To Do" (open)', '"In Progress" (custom)']);
});
