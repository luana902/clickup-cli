import test from 'node:test';
import assert from 'node:assert/strict';

import { clickUpToMarkdown, markdownToClickUp } from '../src/utils/markdown.mjs';

test('markdownToClickUp keeps inline formatting attributes', () => {
  const comment = markdownToClickUp('**Bold** and [docs](https://example.com)');
  assert.deepEqual(comment[0], {
    text: 'Bold',
    attributes: { bold: true },
  });
  assert.deepEqual(comment[2], {
    text: 'docs',
    attributes: { link: 'https://example.com' },
  });
});

test('clickUpToMarkdown preserves list prefixes on roundtrip', () => {
  const markdown = '- one\n- two\n  - nested';
  assert.equal(clickUpToMarkdown(markdownToClickUp(markdown)), markdown);
});

test('clickUpToMarkdown renders code blocks', () => {
  const markdown = clickUpToMarkdown([
    { text: 'const answer = 42;', attributes: { 'code-block': true } },
  ]);
  assert.equal(markdown, '```\nconst answer = 42;\n```');
});
