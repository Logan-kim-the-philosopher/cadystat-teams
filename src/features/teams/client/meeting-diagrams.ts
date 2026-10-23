import type { Mermaid } from 'mermaid';

let renderer: Promise<Mermaid> | undefined;

function loadRenderer() {
  return renderer ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      theme: 'default',
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      maxTextSize: 50000,
      maxEdges: 500,
      suppressErrorRendering: true,
      // Diagram directives/frontmatter must not weaken the site's policy.
      secure: ['secure', 'securityLevel', 'startOnLoad', 'htmlLabels', 'theme', 'themeCSS',
        'themeVariables', 'fontFamily', 'maxTextSize', 'maxEdges', 'suppressErrorRendering']
    });
    return mermaid;
  });
}

export async function renderMeetingDiagrams(root: ParentNode = document) {
  const blocks = root.querySelectorAll<HTMLElement>('[data-meeting-markdown] pre > code.language-mermaid');
  if (!blocks.length) return;

  for (const [index, code] of [...blocks].entries()) {
    const pre = code.parentElement;
    if (!pre || pre.closest('.meeting-diagram')) continue;
    const source = code.textContent ?? '';
    const figure = document.createElement('figure');
    figure.className = 'meeting-diagram';
    figure.dataset.state = 'loading';
    const status = document.createElement('p');
    status.className = 'meeting-diagram-status';
    status.setAttribute('role', 'status');
    status.textContent = '다이어그램을 불러오는 중입니다.';
    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = '다이어그램 원문 보기';
    details.append(summary);
    pre.replaceWith(figure);
    details.append(pre);
    figure.append(status, details);

    // Mermaid measures text in the DOM. Keep temporary drawing out of view
    // and always remove it, including after a parse/render failure.
    const scratch = document.createElement('div');
    scratch.className = 'meeting-diagram-scratch';
    scratch.setAttribute('aria-hidden', 'true');
    document.body.append(scratch);
    try {
      const mermaid = await loadRenderer();
      await document.fonts.ready;
      const { svg } = await mermaid.render(`meeting-diagram-${crypto.randomUUID()}`, source, scratch);
      const image = new Image();
      image.className = 'meeting-diagram-image';
      image.alt = `회의록 다이어그램 ${index + 1}`;
      const svgRoot = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
      const width = Number(svgRoot.getAttribute('viewBox')?.split(/[\s,]+/)[2]);
      if (Number.isFinite(width) && width > 0) image.style.maxWidth = `${Math.ceil(width)}px`;
      // An SVG image is inert: no diagram scripts, event bindings, or links
      // enter the meeting page's DOM. No external renderer receives the text.
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await image.decode();
      const preview = document.createElement('div');
      preview.className = 'meeting-diagram-preview';
      preview.append(image);
      figure.insertBefore(preview, details);
      details.open = false;
      status.remove();
      figure.dataset.state = 'ready';
    } catch {
      status.textContent = '다이어그램을 표시하지 못했습니다. 아래 원문을 확인해 주세요.';
      figure.dataset.state = 'error';
    } finally {
      scratch.remove();
    }
  }
}
