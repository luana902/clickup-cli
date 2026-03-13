import { assertConfig, loadConfig } from './config.mjs';
import { ClickUpClient } from './http/clickup-client.mjs';
import { createCommentService } from './services/comment-service.mjs';
import { createDocService } from './services/doc-service.mjs';
import { createTaskService } from './services/task-service.mjs';
import { createUserService } from './services/user-service.mjs';

export function createApplication({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  const config = loadConfig(env);
  assertConfig(config);

  const client = new ClickUpClient({
    token: config.apiToken,
    fetchImpl,
  });
  const userService = createUserService({ client, config });
  const commentService = createCommentService({ client });
  const taskService = createTaskService({
    client,
    commentService,
    userService,
    config,
    now,
  });
  const docService = createDocService({
    client,
    userService,
  });

  return {
    config,
    client,
    userService,
    commentService,
    taskService,
    docService,
  };
}
