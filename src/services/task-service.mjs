import { parseDateInput } from '../utils/date-input.mjs';

const PRIORITY_MAP = {
  urgent: 1,
  1: 1,
  high: 2,
  2: 2,
  normal: 3,
  3: 3,
  low: 4,
  4: 4,
  none: null,
  clear: null,
};

function normalizePriorityInput(priorityInput) {
  const normalized = priorityInput.toLowerCase().trim();
  if (!(normalized in PRIORITY_MAP)) {
    throw new Error(
      `Invalid priority "${priorityInput}". Use: urgent, high, normal, low, or none`
    );
  }

  return PRIORITY_MAP[normalized];
}

export function findMatchingStatus(statuses, input) {
  const normalized = input.toLowerCase().trim();
  const exactMatch = statuses.find((status) => status.status.toLowerCase() === normalized);
  if (exactMatch) {
    return exactMatch;
  }

  return statuses.find((status) => status.status.toLowerCase().includes(normalized)) ?? null;
}

export function createTaskService({ client, commentService, userService, config, now = () => new Date() }) {
  async function getTask(taskId, { includeSubtasks = false } = {}) {
    const params = includeSubtasks ? '?subtasks=true' : '';
    return client.requestV2(`/task/${taskId}${params}`);
  }

  async function getTasksInList(listId, { assigneeId = null } = {}) {
    const params = new URLSearchParams();
    if (assigneeId) {
      params.append('assignees[]', assigneeId);
    }
    const query = params.toString();
    const endpoint = `/list/${listId}/task${query ? `?${query}` : ''}`;
    const response = await client.requestV2(endpoint);
    return response.tasks ?? [];
  }

  async function updateTask(taskId, updates) {
    return client.requestV2(`/task/${taskId}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async function getList(listId) {
    return client.requestV2(`/list/${listId}`);
  }

  async function getAvailableStatuses(taskId) {
    const task = await getTask(taskId);
    const listId = task.list?.id;
    if (!listId) {
      throw new Error('Could not determine list ID from task.');
    }

    const list = await getList(listId);
    return list.statuses ?? [];
  }

  async function updateTaskStatus(taskId, statusInput) {
    const statuses = await getAvailableStatuses(taskId);
    const matchedStatus = findMatchingStatus(statuses, statusInput);
    if (!matchedStatus) {
      const available = statuses.map((status) => `"${status.status}"`).join(', ');
      throw new Error(`Invalid status "${statusInput}". Available: ${available}`);
    }

    const task = await updateTask(taskId, { status: matchedStatus.status });
    return { task, matchedStatus };
  }

  async function createTask(listId, name, options = {}) {
    return client.requestV2(`/list/${listId}/task`, {
      method: 'POST',
      body: {
        name,
        ...options,
      },
    });
  }

  async function createSubtask(parentTaskId, name, options = {}) {
    const parentTask = await getTask(parentTaskId);
    const listId = parentTask.list?.id;
    if (!listId) {
      throw new Error('Could not determine list ID from parent task.');
    }

    return createTask(listId, name, {
      parent: parentTaskId,
      ...options,
    });
  }

  async function searchTasks(query, options = {}) {
    const workspaceId = await userService.getWorkspaceId();
    const params = new URLSearchParams();
    if (options.assigneeId) {
      params.append('assignees[]', options.assigneeId);
    }
    const queryString = params.toString();
    const response = await client.requestV2(
      `/team/${workspaceId}/task${queryString ? `?${queryString}` : ''}`
    );
    const tasks = response.tasks ?? [];

    if (!query) {
      return tasks;
    }

    const normalized = query.toLowerCase();
    return tasks.filter((task) => {
      const name = task.name?.toLowerCase() ?? '';
      const description = task.description?.toLowerCase() ?? '';
      return name.includes(normalized) || description.includes(normalized);
    });
  }

  async function getMyTasks() {
    const [workspaceId, userId] = await Promise.all([
      userService.getWorkspaceId(),
      userService.getCurrentUserId(),
    ]);
    const params = new URLSearchParams({
      subtasks: 'true',
    });
    params.append('assignees[]', userId);
    const response = await client.requestV2(`/team/${workspaceId}/task?${params.toString()}`);
    return response.tasks ?? [];
  }

  async function resolveAssigneeId(query) {
    if (query.toLowerCase() === 'me') {
      return userService.getCurrentUserId();
    }

    const user = await userService.findUser(query);
    if (!user) {
      throw new Error(`User "${query}" not found in workspace.`);
    }

    return String(user.id);
  }

  async function assignTask(taskId, assigneeIds, { remove = false } = {}) {
    return updateTask(taskId, {
      assignees: remove ? { rem: assigneeIds } : { add: assigneeIds },
    });
  }

  async function setDueDate(taskId, dueInput) {
    const dueDate = parseDateInput(dueInput, now);
    return updateTask(taskId, {
      due_date: dueDate ? dueDate.getTime() : null,
    });
  }

  async function setPriority(taskId, priorityInput) {
    const priority = normalizePriorityInput(priorityInput);
    const task = await updateTask(taskId, { priority });
    return { task, priority: priorityInput };
  }

  async function moveTask(taskId, targetListId) {
    return client.requestV2(`/list/${targetListId}/task/${taskId}`, {
      method: 'POST',
    });
  }

  async function addTag(taskId, tagName) {
    return client.requestV2(`/task/${taskId}/tag/${encodeURIComponent(tagName)}`, {
      method: 'POST',
    });
  }

  async function updateDescription(taskId, markdownDescription) {
    return updateTask(taskId, {
      markdown_description: markdownDescription,
    });
  }

  async function addExternalLink(taskId, url, description = null) {
    const text = description ? `Reference: [${description}](${url})` : `Reference: ${url}`;
    return commentService.postComment(taskId, text);
  }

  async function getChecklists(taskId) {
    const task = await getTask(taskId);
    return task.checklists ?? [];
  }

  async function createChecklist(taskId, name) {
    return client.requestV2(`/task/${taskId}/checklist`, {
      method: 'POST',
      body: { name },
    });
  }

  async function addChecklistItem(checklistId, name, options = {}) {
    return client.requestV2(`/checklist/${checklistId}/checklist_item`, {
      method: 'POST',
      body: {
        name,
        ...options,
      },
    });
  }

  async function addChecklistItemToTask(taskId, itemName, checklistName = 'Checklist') {
    let checklists = await getChecklists(taskId);
    if (checklists.length === 0) {
      const created = await createChecklist(taskId, checklistName);
      checklists = [created.checklist];
    }

    const checklist = checklists[0];
    const item = await addChecklistItem(checklist.id, itemName);
    return { checklist, item };
  }

  async function addWatcher(taskId, userQuery) {
    const user = await userService.findUser(userQuery);
    if (!user) {
      throw new Error(`User "${userQuery}" not found in workspace.`);
    }

    const mentionTarget = user.username || user.email || user.id;
    const result = await commentService.postComment(
      taskId,
      `@${mentionTarget} has been added as a watcher on this task.`
    );

    return {
      user,
      result,
      mode: 'mention-comment',
    };
  }

  async function buildCreateTaskPayload({
    listId,
    title,
    description,
    due,
    assignee,
  }) {
    const targetListId = listId || config.defaultListId;
    if (!targetListId) {
      throw new Error(
        'No list ID provided and CLICKUP_DEFAULT_LIST_ID is not set.'
      );
    }

    const payload = {};
    if (description) {
      payload.markdown_description = description;
    }
    if (due) {
      payload.due_date = parseDateInput(due, now)?.getTime() ?? null;
    }
    if (assignee) {
      payload.assignees = [await resolveAssigneeId(assignee)];
    }

    return {
      listId: targetListId,
      title,
      payload,
    };
  }

  return {
    getTask,
    getTasksInList,
    updateTask,
    getAvailableStatuses,
    updateTaskStatus,
    createTask,
    createSubtask,
    searchTasks,
    getMyTasks,
    resolveAssigneeId,
    assignTask,
    setDueDate,
    setPriority,
    moveTask,
    addTag,
    updateDescription,
    addExternalLink,
    getChecklists,
    addChecklistItemToTask,
    addWatcher,
    buildCreateTaskPayload,
  };
}
