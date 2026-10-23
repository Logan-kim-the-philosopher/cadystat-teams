import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/** @param {string} markdown */
export function renderMarkdown(markdown) {
  return sanitizeHtml(marked.parse(markdown, { async: false, gfm: true }), {
    allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'del', 'blockquote', 'pre', 'code', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: { a: ['href', 'title'], code: ['class'] },
    allowedClasses: { code: ['language-mermaid'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false
  });
}
