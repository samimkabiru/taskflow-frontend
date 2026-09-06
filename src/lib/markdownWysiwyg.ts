/**
 * Bidirectional conversion between Taskflow Markdown Lite and WYSIWYG HTML.
 * Supports: *bold*, _italic_, ~strike~, `code`, - bullet lists, 1. numbered lists.
 */

export function markdownLiteToHtml(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const htmlLines: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Check for bullet list: - text or * text
    const bulletMatch = rawLine.match(/^(\s*)[-*]\s+(.*)$/);
    // Check for numbered list: 1. text
    const numMatch = rawLine.match(/^(\s*)\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (inOl) {
        htmlLines.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        htmlLines.push('<ul class="list-disc pl-5 my-1.5 space-y-0.5">');
        inUl = true;
      }
      htmlLines.push(`<li class="list-item pl-1">${formatInline(bulletMatch[2])}</li>`);
      continue;
    } else if (numMatch) {
      if (inUl) {
        htmlLines.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        htmlLines.push('<ol class="list-decimal pl-5 my-1.5 space-y-0.5">');
        inOl = true;
      }
      htmlLines.push(`<li class="list-item pl-1">${formatInline(numMatch[2])}</li>`);
      continue;
    } else {
      if (inUl) {
        htmlLines.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        htmlLines.push("</ol>");
        inOl = false;
      }

      if (!rawLine.trim()) {
        htmlLines.push("<div><br></div>");
      } else {
        htmlLines.push(`<div>${formatInline(rawLine)}</div>`);
      }
    }
  }

  if (inUl) htmlLines.push("</ul>");
  if (inOl) htmlLines.push("</ol>");

  return htmlLines.join("");
}

function formatInline(text: string): string {
  // Escape angle brackets first to prevent XSS / unwanted DOM injection
  let s = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code: `code`
  s = s.replace(/`([^`]+)`/g, '<code class="font-mono text-[12px] bg-surface-low border border-outline-variant/60 px-1.5 py-0.5 rounded-md text-primary font-medium">$1</code>');

  // Bold: *bold* or **bold**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");

  // Italic: _italic_
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Strikethrough: ~strike~ or ~~strike~~
  s = s.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  s = s.replace(/~([^~\n]+)~/g, "<s>$1</s>");

  return s;
}

export function htmlToMarkdownLite(container: HTMLElement): string {
  if (!container) return "";

  const lines: string[] = [];

  function parseNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Check formatting styles or tags
    const isBold =
      tag === "strong" ||
      tag === "b" ||
      el.style.fontWeight === "bold" ||
      parseInt(el.style.fontWeight, 10) >= 600;

    const isItalic =
      tag === "em" ||
      tag === "i" ||
      el.style.fontStyle === "italic";

    const isStrike =
      tag === "s" ||
      tag === "strike" ||
      tag === "del" ||
      el.style.textDecoration.includes("line-through");

    const isCode = tag === "code";

    let innerText = "";
    for (let i = 0; i < el.childNodes.length; i++) {
      innerText += parseNode(el.childNodes[i]);
    }

    if (isCode) {
      return `\`${innerText}\``;
    }
    if (isBold) {
      innerText = `*${innerText}*`;
    }
    if (isItalic) {
      innerText = `_${innerText}_`;
    }
    if (isStrike) {
      innerText = `~${innerText}~`;
    }

    if (tag === "br") {
      return "\n";
    }

    return innerText;
  }

  function processBlock(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.textContent || "";
      if (txt.trim()) lines.push(txt);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "ul") {
      const lis = el.querySelectorAll(":scope > li");
      lis.forEach(li => {
        let itemText = "";
        li.childNodes.forEach(c => { itemText += parseNode(c); });
        lines.push(`- ${itemText.trim()}`);
      });
      return;
    }

    if (tag === "ol") {
      const lis = el.querySelectorAll(":scope > li");
      lis.forEach((li, idx) => {
        let itemText = "";
        li.childNodes.forEach(c => { itemText += parseNode(c); });
        lines.push(`${idx + 1}. ${itemText.trim()}`);
      });
      return;
    }

    if (tag === "li") {
      let itemText = "";
      el.childNodes.forEach(c => { itemText += parseNode(c); });
      lines.push(`- ${itemText.trim()}`);
      return;
    }

    // Paragraph or div block
    if (tag === "div" || tag === "p") {
      // If contains only <br>, it's an empty line
      if (el.innerHTML === "<br>" || el.innerHTML === "") {
        lines.push("");
        return;
      }
      let blockText = "";
      el.childNodes.forEach(c => { blockText += parseNode(c); });
      lines.push(blockText);
      return;
    }

    // Default inline or unhandled
    let text = parseNode(el);
    if (text) lines.push(text);
  }

  // Iterate top-level child elements of the contentEditable container
  if (container.childNodes.length === 0) {
    return container.textContent || "";
  }

  for (let i = 0; i < container.childNodes.length; i++) {
    processBlock(container.childNodes[i]);
  }

  // Join lines and clean up excessive trailing empty lines
  let result = lines.join("\n");
  // Clean up duplicate asterisks/underscores if any (e.g. ** -> *)
  result = result.replace(/\*{3,}/g, "*").replace(/_{3,}/g, "_").replace(/~{3,}/g, "~");

  return result;
}
