import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true
});

export function renderMarkdown(body: string) {
  return marked.parse(body) as string;
}
