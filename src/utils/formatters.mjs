import { clickUpToMarkdown } from './markdown.mjs';

function formatWithIntl(date, options) {
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function formatDate(timestamp) {
  if (!timestamp) {
    return 'Not set';
  }

  return formatWithIntl(new Date(Number(timestamp)), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp) {
  if (!timestamp) {
    return 'Unknown';
  }

  return formatWithIntl(new Date(Number(timestamp)), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPriority(priority) {
  const value = typeof priority === 'object' ? priority.priority : priority;
  if (!value) {
    return 'None';
  }

  const labels = {
    1: 'Urgent',
    2: 'High',
    3: 'Normal',
    4: 'Low',
  };
  return labels[value] ?? String(value);
}

export function formatTask(task) {
  const lines = [
    `Task: ${task.name}`,
    `Status: ${task.status?.status ?? 'Unknown'}`,
    `Priority: ${formatPriority(task.priority)}`,
  ];

  if (task.assignees?.length > 0) {
    lines.push(`Assignees: ${task.assignees.map((assignee) => assignee.username || assignee.email).join(', ')}`);
  }

  lines.push(`Due: ${formatDate(task.due_date)}`);
  lines.push(`Created: ${formatDate(task.date_created)}`);
  lines.push(`URL: ${task.url}`);

  if (task.description) {
    lines.push('', 'Description:', task.description);
  }

  if (task.subtasks?.length > 0) {
    lines.push('', `Subtasks (${task.subtasks.length}):`);
    for (const subtask of task.subtasks) {
      lines.push(`  - [${subtask.status?.status ?? 'unknown'}] ${subtask.name}`);
    }
  }

  if (task.tags?.length > 0) {
    lines.push('', `Tags: ${task.tags.map((tag) => tag.name).join(', ')}`);
  }

  return lines.join('\n');
}

export function formatTaskList(tasks) {
  if (tasks.length === 0) {
    return 'No tasks found.';
  }

  const lines = [];
  for (const task of tasks) {
    const assignees =
      task.assignees?.map((assignee) => assignee.username || assignee.initials || assignee.email).join(', ') ||
      'Unassigned';
    const due = task.due_date ? ` | Due: ${formatDate(task.due_date)}` : '';
    lines.push(`[${task.status?.status ?? '?'}] ${task.name}`);
    lines.push(`  ID: ${task.id} | Priority: ${formatPriority(task.priority)} | Assignees: ${assignees}${due}`);
    lines.push(`  ${task.url}`);
    lines.push('');
  }

  lines.push(`Total: ${tasks.length} task(s)`);
  return lines.join('\n');
}

export function formatComments(comments) {
  if (comments.length === 0) {
    return 'No comments on this task.';
  }

  const lines = [];
  for (const comment of comments) {
    const author = comment.user?.username || comment.user?.email || 'Unknown';
    const content = Array.isArray(comment.comment)
      ? clickUpToMarkdown(comment.comment)
      : comment.comment_text || '';
    lines.push(`[${formatDateTime(comment.date)}] ${author}:`);
    lines.push(`  ${content.split('\n').join('\n  ')}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function formatUser(user) {
  return [
    `User: ${user.username}`,
    `Email: ${user.email}`,
    `ID: ${user.id}`,
    `Timezone: ${user.timezone || 'Not set'}`,
  ].join('\n');
}

export function formatDoc(doc) {
  const lines = [
    `Doc: ${doc.name}`,
    `ID: ${doc.id}`,
  ];

  if (doc.date_created) {
    lines.push(`Created: ${formatDateTime(doc.date_created)}`);
  }
  if (doc.date_updated) {
    lines.push(`Updated: ${formatDateTime(doc.date_updated)}`);
  }
  if (doc.creator) {
    lines.push(`Creator: ${doc.creator.username || doc.creator.email || doc.creator.id}`);
  }
  if (doc.workspace_id) {
    lines.push(`Workspace: ${doc.workspace_id}`);
  }

  return lines.join('\n');
}

export function formatDocList(docs) {
  if (docs.length === 0) {
    return 'No docs found.';
  }

  const lines = [];
  for (const doc of docs) {
    const updated = doc.date_updated ? ` | Updated: ${formatDate(doc.date_updated)}` : '';
    lines.push(doc.name);
    lines.push(`  ID: ${doc.id}${updated}`);
    lines.push('');
  }

  lines.push(`Total: ${docs.length} doc(s)`);
  return lines.join('\n');
}

export function formatPage(page) {
  const lines = [
    `Page: ${page.name}`,
    `ID: ${page.id}`,
  ];

  if (page.sub_title) {
    lines.push(`Subtitle: ${page.sub_title}`);
  }
  if (page.date_created) {
    lines.push(`Created: ${formatDateTime(page.date_created)}`);
  }
  if (page.date_updated) {
    lines.push(`Updated: ${formatDateTime(page.date_updated)}`);
  }
  if (page.content) {
    lines.push('', 'Content:', '---', page.content, '---');
  }

  return lines.join('\n');
}

export function formatPageList(pages, indent = 0) {
  if (pages.length === 0) {
    return 'No pages found.';
  }

  const prefix = '  '.repeat(indent);
  const lines = [];
  for (const page of pages) {
    lines.push(`${prefix}${page.name}`);
    lines.push(`${prefix}  ID: ${page.id}`);
    if (page.pages?.length > 0) {
      lines.push(formatPageList(page.pages, indent + 1));
    }
    lines.push('');
  }

  if (indent === 0) {
    lines.push(`Total: ${pages.length} page(s)`);
  }

  return lines.join('\n');
}
