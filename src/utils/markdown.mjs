import { unified } from 'unified';
import remarkParse from 'remark-parse';

export function markdownToClickUp(markdown) {
  const tree = unified().use(remarkParse).parse(markdown);
  const comment = [];

  processNode(tree, comment, {});

  while (
    comment.length > 0 &&
    comment[comment.length - 1].text === '\n' &&
    !comment[comment.length - 1].attributes?.list
  ) {
    comment.pop();
  }

  return comment;
}

function processNode(node, comment, context) {
  switch (node.type) {
    case 'root':
      node.children.forEach((child) => processNode(child, comment, context));
      break;
    case 'paragraph':
      node.children.forEach((child) => processNode(child, comment, context));
      comment.push({ text: '\n', attributes: {} });
      break;
    case 'heading':
      comment.push({ text: '\n', attributes: {} });
      node.children.forEach((child) =>
        processNode(child, comment, { ...context, bold: true })
      );
      comment.push({ text: '\n', attributes: {} });
      break;
    case 'list': {
      const nextIndent = (context.indent ?? -1) + 1;
      node.children.forEach((child) =>
        processNode(child, comment, {
          ...context,
          listType: node.ordered ? 'ordered' : 'bullet',
          indent: nextIndent,
        })
      );
      break;
    }
    case 'listItem': {
      const listAttributes = { list: { list: context.listType } };
      if (context.indent > 0) {
        listAttributes.indent = context.indent;
      }

      let nestedListSeen = false;
      node.children.forEach((child) => {
        if (child.type === 'paragraph') {
          child.children.forEach((grandchild) => processNode(grandchild, comment, context));
          return;
        }

        if (child.type === 'list') {
          comment.push({ text: '\n', attributes: listAttributes });
          processNode(child, comment, context);
          nestedListSeen = true;
          return;
        }

        processNode(child, comment, context);
      });

      if (!nestedListSeen) {
        comment.push({ text: '\n', attributes: listAttributes });
      }
      break;
    }
    case 'text': {
      const attributes = {};
      if (context.bold) {
        attributes.bold = true;
      }
      if (context.italic) {
        attributes.italic = true;
      }
      if (context.code) {
        attributes.code = true;
      }
      if (context.link) {
        attributes.link = context.link;
      }
      comment.push({ text: node.value, attributes });
      break;
    }
    case 'strong':
      node.children.forEach((child) =>
        processNode(child, comment, { ...context, bold: true })
      );
      break;
    case 'emphasis':
      node.children.forEach((child) =>
        processNode(child, comment, { ...context, italic: true })
      );
      break;
    case 'inlineCode':
      comment.push({ text: node.value, attributes: { code: true } });
      break;
    case 'code':
      comment.push({ text: node.value, attributes: { 'code-block': true } });
      comment.push({ text: '\n', attributes: {} });
      break;
    case 'link':
      node.children.forEach((child) =>
        processNode(child, comment, { ...context, link: node.url })
      );
      break;
    case 'break':
      comment.push({ text: '\n', attributes: {} });
      break;
    case 'thematicBreak':
      comment.push({ text: '---', attributes: {} });
      comment.push({ text: '\n', attributes: {} });
      break;
    default:
      if (node.children) {
        node.children.forEach((child) => processNode(child, comment, context));
      } else if (node.value) {
        comment.push({ text: node.value, attributes: {} });
      }
  }
}

export function clickUpToMarkdown(commentArray) {
  if (!commentArray) {
    return '';
  }

  if (typeof commentArray === 'string') {
    return commentArray;
  }

  if (!Array.isArray(commentArray)) {
    return '';
  }

  let result = '';
  let pendingListMeta = null;
  const listCounters = {};

  function resetCounters() {
    Object.keys(listCounters).forEach((key) => {
      delete listCounters[key];
    });
  }

  function findNextListMeta(startIndex) {
    for (let lookahead = startIndex + 1; lookahead < commentArray.length; lookahead += 1) {
      const upcoming = commentArray[lookahead];
      if (upcoming.text === '\n') {
        if (upcoming.attributes?.list) {
          return {
            listType: upcoming.attributes.list.list,
            indent: upcoming.attributes.indent || 0,
          };
        }
        return null;
      }
    }

    return null;
  }

  function buildListPrefix(meta, { leadingNewline }) {
    const indent = meta.indent || 0;
    const indentText = '  '.repeat(indent);

    if (!listCounters[indent]) {
      listCounters[indent] = 0;
    }
    listCounters[indent] += 1;

    Object.keys(listCounters).forEach((key) => {
      if (Number(key) > indent) {
        delete listCounters[key];
      }
    });

    const bullet =
      meta.listType === 'ordered'
        ? `${listCounters[indent]}. `
        : '- ';

    return `${leadingNewline ? '\n' : ''}${indentText}${bullet}`;
  }

  for (let index = 0; index < commentArray.length; index += 1) {
    const item = commentArray[index];
    const text = item.text || '';
    const attributes = item.attributes || {};

    if (attributes['code-block']) {
      result += `\`\`\`\n${text}\n\`\`\``;
      pendingListMeta = null;
      continue;
    }

    if (text === '\n' && attributes.list) {
      pendingListMeta = {
        listType: attributes.list.list,
        indent: attributes.indent || 0,
      };
      continue;
    }

    if (text === '\n') {
      resetCounters();
      pendingListMeta = null;
      result += '\n';
      continue;
    }

    let formatted = text;
    if (attributes.code) {
      formatted = `\`${formatted}\``;
    }
    if (attributes.bold && attributes.italic) {
      formatted = `***${formatted}***`;
    } else if (attributes.bold) {
      formatted = `**${formatted}**`;
    } else if (attributes.italic) {
      formatted = `*${formatted}*`;
    }
    if (attributes.link) {
      formatted = `[${formatted}](${attributes.link})`;
    }

    const ownListMeta = findNextListMeta(index);
    if (pendingListMeta) {
      result += buildListPrefix(ownListMeta || pendingListMeta, {
        leadingNewline: true,
      });
      pendingListMeta = null;
    } else if ((result === '' || result.endsWith('\n')) && ownListMeta) {
      result += buildListPrefix(ownListMeta, {
        leadingNewline: false,
      });
    }

    result += formatted;
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}
