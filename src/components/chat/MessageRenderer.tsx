"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Inline formatter ──────────────────────────────────────
// Applies *bold* / **bold**, _italic_, ~strike~ / ~~strike~~, `code`, ```mono``` in one regex pass.
function renderInline(text: string, isOwn: boolean): React.ReactNode {
  // Order matters: code blocks first, inline code, bold, italic, strikethrough
  const re = /```([\s\S]*?)```|`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|~~([^~\n]+)~~|~([^~\n]+)~/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    // plain text before match
    if (m.index > last) {
      nodes.push(<React.Fragment key={key++}>{text.slice(last, m.index)}</React.Fragment>);
    }

    if (m[1] !== undefined) {
      // ```mono block inline```
      nodes.push(
        <code key={key++} className={cn(
          "font-[family-name:var(--font-mono)] text-[12px] rounded-md px-1.5 py-0.5 mx-0.5 align-baseline font-medium",
          isOwn ? "bg-white/20 text-white/95" : "bg-surface-high border border-outline-variant/60 text-primary"
        )}>
          {m[1]}
        </code>
      );
    } else if (m[2] !== undefined) {
      // `inline code`
      nodes.push(
        <code key={key++} className={cn(
          "font-[family-name:var(--font-mono)] text-[12px] rounded-md px-1.5 py-0.5 mx-0.5 align-baseline font-medium",
          isOwn ? "bg-white/20 text-white/95" : "bg-surface-high border border-outline-variant/60 text-primary"
        )}>
          {m[2]}
        </code>
      );
    } else if (m[3] !== undefined || m[4] !== undefined) {
      // **bold** or *bold*
      const boldText = m[3] !== undefined ? m[3] : m[4];
      nodes.push(<strong key={key++} className="font-bold">{boldText}</strong>);
    } else if (m[5] !== undefined) {
      // _italic_
      nodes.push(<em key={key++} className="italic">{m[5]}</em>);
    } else if (m[6] !== undefined || m[7] !== undefined) {
      // ~~strikethrough~~ or ~strikethrough~
      const strikeText = m[6] !== undefined ? m[6] : m[7];
      nodes.push(
        <del key={key++} className={cn("line-through", isOwn ? "opacity-75" : "opacity-60")}>
          {strikeText}
        </del>
      );
    }

    last = m.index + m[0].length;
  }

  if (last < text.length) {
    nodes.push(<React.Fragment key={key++}>{text.slice(last)}</React.Fragment>);
  }

  return nodes.length ? <>{nodes}</> : text;
}

// ─── Block + inline renderer ───────────────────────────────
export interface MessageRendererProps {
  text: string;
  /** True when this is the current user's own message (adjusts colours) */
  isOwn?: boolean;
  className?: string;
  maxCollapsedLength?: number;
  maxCollapsedLines?: number;
  enableReadMore?: boolean;
  /** Optional max height when expanded (e.g. "max-h-[240px]") to make long text scrollable */
  maxExpandedHeight?: string;
}

const DEFAULT_CHAR_LIMIT = 360;
const DEFAULT_LINE_LIMIT = 5;

export default function MessageRenderer({
  text = "",
  isOwn = false,
  className,
  maxCollapsedLength = DEFAULT_CHAR_LIMIT,
  maxCollapsedLines = DEFAULT_LINE_LIMIT,
  enableReadMore = true,
  maxExpandedHeight,
}: MessageRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const safeText = typeof text === "string" ? text : "";
  const allLines = safeText.split("\n");

  const isLong = enableReadMore && (safeText.length > maxCollapsedLength || allLines.length > maxCollapsedLines);

  let displayedText = safeText;
  if (isLong && !isExpanded) {
    if (allLines.length > maxCollapsedLines) {
      displayedText = allLines.slice(0, maxCollapsedLines).join("\n");
      if (displayedText.length > maxCollapsedLength) {
        displayedText = displayedText.slice(0, maxCollapsedLength).trimEnd();
      }
    } else if (safeText.length > maxCollapsedLength) {
      displayedText = safeText.slice(0, maxCollapsedLength).trimEnd();
    }
  }

  const lines = displayedText.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block  ``` ... ```
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <pre
          key={key++}
          className={cn(
            "font-[family-name:var(--font-mono)] text-[11.5px] rounded-xl px-3 py-2.5 mt-1.5 mb-1 overflow-x-auto whitespace-pre-wrap leading-relaxed border",
            isOwn ? "bg-white/15 border-white/20 text-white/95" : "bg-surface-high border-outline-variant/60 text-on-surface"
          )}
        >
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    // ── Blockquote  > ...
    if (line.trimStart().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <div
          key={key++}
          className={cn(
            "my-1.5 pl-2.5 py-1 border-l-2 rounded-r-md text-[12.5px] italic leading-relaxed",
            isOwn
              ? "border-white/80 bg-white/10 text-white/90"
              : "border-primary/70 bg-primary/5 text-on-surface-variant"
          )}
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className="leading-snug">{renderInline(ql, isOwn)}</p>
          ))}
        </div>
      );
      continue;
    }

    // ── Bullet list  - or * or •
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="mt-0.5 mb-1 space-y-1 pl-0">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 leading-snug">
              <span
                className={cn(
                  "mt-[6px] w-1.5 h-1.5 rounded-full shrink-0",
                  isOwn ? "bg-white/80" : "bg-primary"
                )}
              />
              <span className="font-[family-name:var(--font-body)] text-[13.5px]">
                {renderInline(item, isOwn)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Numbered list  1. 2. 3.
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="mt-0.5 mb-1 space-y-1 pl-0">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 leading-snug">
              <span
                className={cn(
                  "font-[family-name:var(--font-mono)] text-[11px] shrink-0 mt-0.5 min-w-[18px] text-right font-semibold",
                  isOwn ? "text-white/70" : "text-primary"
                )}
              >
                {j + 1}.
              </span>
              <span className="font-[family-name:var(--font-body)] text-[13.5px]">
                {renderInline(item, isOwn)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Empty line → small spacer
    if (line.trim() === "") {
      blocks.push(<div key={key++} className="h-1.5" />);
      i++;
      continue;
    }

    // ── Regular paragraph
    blocks.push(
      <p key={key++} className="font-[family-name:var(--font-body)] text-[13.5px] leading-relaxed">
        {renderInline(line, isOwn)}
      </p>
    );
    i++;
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className={cn(
        "flex flex-col gap-0.5",
        isExpanded && maxExpandedHeight && `${maxExpandedHeight} overflow-y-auto custom-scrollbar pr-1`
      )}>
        {blocks}
      </div>

      {isLong && (
        <div className="pt-0.5">
          {!isExpanded ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className={cn(
                "font-[family-name:var(--font-body)] text-[12px] font-semibold transition-all hover:underline cursor-pointer inline-flex items-center gap-1",
                isOwn
                  ? "text-white/95 hover:text-white underline underline-offset-2"
                  : "text-primary hover:text-primary-variant"
              )}
            >
              ... Read more
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className={cn(
                "font-[family-name:var(--font-body)] text-[11.5px] font-semibold transition-all hover:underline cursor-pointer inline-flex items-center gap-1 mt-1",
                isOwn
                  ? "text-white/80 hover:text-white underline underline-offset-2"
                  : "text-outline hover:text-on-surface"
              )}
            >
              Read less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
