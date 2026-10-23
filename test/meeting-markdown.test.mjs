import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/features/teams/server/markdown.mjs';
test('회의록 Markdown은 기본 서식을 유지한다', () => {
  const html = renderMarkdown('# 결정\n\n**중요**\n\n- 작업\n\n```js\nalert(1)\n```\n\n[문서](https://example.com)');
  assert.match(html, /<h1>결정<\/h1>/); assert.match(html, /<strong>중요<\/strong>/); assert.match(html, /<pre><code>/); assert.match(html, /href="https:\/\/example.com"/);
});
test('회의록 Markdown에서 실행 가능한 HTML과 위험 URL을 제거한다', () => {
  const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(2)><svg onload=alert(3)></svg><iframe src="https://evil.test"></iframe><a href="javascript:alert(4)" onclick="alert(5)">링크</a><a href="//evil.test">상대</a><p style="color:red">본문</p>');
  assert.doesNotMatch(html, /script|onerror|onload|onclick|javascript:|iframe|<svg|<img|style=|href="\/\//i);
  assert.match(html, /본문/);
});

test('Mermaid 블록만 식별하며 여러 블록과 일반 코드를 보존한다', () => {
  const html = renderMarkdown('```mermaid\nflowchart LR\n A[한글] --> B[완료]\n```\n\n```js\nconsole.log("일반 코드");\n```\n\n```mermaid\nsequenceDiagram\n A->>B: 요청\n```');
  assert.equal((html.match(/class="language-mermaid"/g) ?? []).length, 2);
  assert.match(html, /A\[한글\] --&gt; B\[완료\]/);
  assert.match(html, /<pre><code>console.log/);
  assert.match(html, /sequenceDiagram/);
});

test('Mermaid 원문은 HTML이 아닌 텍스트로 유지하고 임의 속성을 제거한다', () => {
  const html = renderMarkdown('```mermaid\nflowchart LR\n A["<img src=x onerror=alert(1)>"] --> B["&lt;확인&gt;"]\n```\n\n<code class="language-mermaid evil" onclick="alert(2)" style="color:red">잘못된 Mermaid 문법</code>');
  assert.match(html, /&lt;img/);
  assert.match(html, /&amp;lt;확인&amp;gt;/);
  assert.match(html, /잘못된 Mermaid 문법/);
  assert.doesNotMatch(html, /<img|<svg|class="[^"]*evil|onclick=|style=/);
});
