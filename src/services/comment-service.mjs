import { markdownToClickUp } from '../utils/markdown.mjs';

export function createCommentService({ client }) {
  async function getComments(taskId) {
    const response = await client.requestV2(`/task/${taskId}/comment`);
    return response.comments ?? [];
  }

  async function postComment(taskId, text, { useMarkdown = true } = {}) {
    const body = useMarkdown
      ? { comment: markdownToClickUp(text) }
      : { comment_text: text };
    return client.requestV2(`/task/${taskId}/comment`, {
      method: 'POST',
      body,
    });
  }

  async function deleteComment(commentId) {
    return client.requestV2(`/comment/${commentId}`, {
      method: 'DELETE',
    });
  }

  return {
    getComments,
    postComment,
    deleteComment,
  };
}
