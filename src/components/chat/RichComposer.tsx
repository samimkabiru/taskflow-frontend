"use client";

import {
  useRef,
  forwardRef,
  useImperativeHandle,
  KeyboardEvent,
  useEffect,
  useState,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Send, Check } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { markdownLiteToHtml, htmlToMarkdownLite } from "@/lib/markdownWysiwyg";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────
export interface RichComposerHandle {
  focus: () => void;
  clear: () => void;
}

interface RichComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder?: string;
  disabled?: boolean;
  shortCode?: string;
  mode?: "chat" | "description";
  submitLabel?: string;
  cancelLabel?: string;
  minHeight?: number;
  maxHeight?: number;
  autoFocus?: boolean;
  isEditing?: boolean;
  originalValue?: string;
}

// ─── Component ──────────────────────────────────────────────
const RichComposer = forwardRef<RichComposerHandle, RichComposerProps>(
  function RichComposer(
    {
      value,
      onChange,
      onSubmit,
      onCancel,
      placeholder,
      disabled = false,
      shortCode,
      mode = "chat",
      submitLabel = "Save description",
      cancelLabel = "Cancel",
      minHeight,
      maxHeight,
      autoFocus = false,
      isEditing = false,
      originalValue,
    },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastMdRef = useRef<string | null>(null);

    // Active formatting states for toolbar button highlights
    const [activeFormats, setActiveFormats] = useState({
      bold: false,
      italic: false,
      strike: false,
      code: false,
      ul: false,
      ol: false,
    });

    const updateActiveFormats = useCallback(() => {
      if (typeof document === "undefined") return;
      try {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return;

        const bold = document.queryCommandState("bold");
        const italic = document.queryCommandState("italic");
        const strike = document.queryCommandState("strikeThrough");
        const ul = document.queryCommandState("insertUnorderedList");
        const ol = document.queryCommandState("insertOrderedList");

        // Check if inside a <code> tag
        let node: Node | null = sel.anchorNode;
        let isCode = false;
        while (node && node !== editorRef.current) {
          if (node.nodeName.toLowerCase() === "code") {
            isCode = true;
            break;
          }
          node = node.parentNode;
        }

        setActiveFormats({ bold, italic, strike, code: isCode, ul, ol });
      } catch {
        // Fallback gracefully if queryCommandState is unavailable
      }
    }, []);

    // Sync external `value` prop into contentEditable DOM on mount and when value changes externally
    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;

      if (lastMdRef.current === null || value !== lastMdRef.current) {
        lastMdRef.current = value;
        const newHtml = markdownLiteToHtml(value || "");
        if (el.innerHTML !== newHtml) {
          el.innerHTML = newHtml;
        }
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      focus() {
        editorRef.current?.focus();
      },
      clear() {
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
        lastMdRef.current = "";
        onChange("");
      },
    }));

    useEffect(() => {
      if (autoFocus && editorRef.current) {
        editorRef.current.focus();
      }
    }, [autoFocus]);

    // ─── Handle DOM Input ──────────────────────────────────────
    const handleInput = () => {
      const el = editorRef.current;
      if (!el) return;
      const md = htmlToMarkdownLite(el);
      lastMdRef.current = md;
      onChange(md);
      updateActiveFormats();
    };

    // ─── Formatting Commands ───────────────────────────────────
    const formatCommand = (command: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      document.execCommand(command, false);
      handleInput();
      updateActiveFormats();
    };

    const toggleCode = () => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);

      // Check if already inside code
      let codeNode: HTMLElement | null = null;
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== el) {
        if (node.nodeName.toLowerCase() === "code") {
          codeNode = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }

      if (codeNode) {
        // Unwrap code node
        const parent = codeNode.parentNode;
        while (codeNode.firstChild) {
          parent?.insertBefore(codeNode.firstChild, codeNode);
        }
        parent?.removeChild(codeNode);
      } else {
        // Wrap selection in code
        const selectedText = range.extractContents();
        const code = document.createElement("code");
        code.className =
          "font-mono text-[12px] bg-surface-low border border-outline-variant/60 px-1.5 py-0.5 rounded-md text-primary font-medium";
        code.appendChild(selectedText);
        range.insertNode(code);

        // Move selection inside code
        range.selectNodeContents(code);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      handleInput();
      updateActiveFormats();
    };

    // Calculate if content has actually changed from original (for edit mode)
    const isDirty = originalValue !== undefined
      ? value.trim() !== originalValue.trim()
      : value.trim().length > 0;

    const canSubmit = isEditing || originalValue !== undefined
      ? isDirty && !disabled
      : value.trim().length > 0 && !disabled;

    // ─── Keyboard Shortcuts & Auto-Markdown Triggers ────────────
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      // Escape key -> Cancel editing if onCancel provided
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
        return;
      }

      // Cmd/Ctrl + B -> Bold
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        formatCommand("bold");
        return;
      }

      // Cmd/Ctrl + I -> Italic
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        formatCommand("italic");
        return;
      }

      // Cmd/Ctrl + E -> Code
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        toggleCode();
        return;
      }

      // Cmd/Ctrl + Enter -> Always Submit
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (isEditing) {
          if (isDirty) onSubmit();
        } else if (value.trim()) {
          onSubmit();
        }
        return;
      }

      // In Chat Mode: Shift + Enter sends the message
      if (mode === "chat" && e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (isEditing) {
          if (isDirty) onSubmit();
        } else if (value.trim()) {
          onSubmit();
        }
        return;
      }

      // Check if cursor is currently inside a list item (<li>)
      let activeLi: HTMLElement | null = null;
      if (typeof window !== "undefined") {
        const sel = window.getSelection();
        if (sel && sel.anchorNode && editorRef.current) {
          let node: Node | null = sel.anchorNode;
          while (node && node !== editorRef.current) {
            if (node.nodeName.toLowerCase() === "li") {
              activeLi = node as HTMLElement;
              break;
            }
            node = node.parentNode;
          }
        }
      }

      // Enter key (without Shift, without Cmd/Ctrl): creates new line / continues lists
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        if (activeLi) {
          const liText = activeLi.textContent?.trim() || "";
          if (liText === "") {
            // Empty list item -> exit list cleanly
            e.preventDefault();
            document.execCommand("outdent", false);
            handleInput();
            updateActiveFormats();
            return;
          }
          // Non-empty list item -> browser creates next <li> automatically!
          setTimeout(() => {
            handleInput();
            updateActiveFormats();
          }, 0);
          return;
        }

        // Normal paragraph/div line -> Enter creates a new line
        setTimeout(() => {
          handleInput();
          updateActiveFormats();
        }, 0);
        return;
      }

      // Backspace on empty list item -> exit list cleanly
      if (e.key === "Backspace" && activeLi) {
        const liText = activeLi.textContent?.trim() || "";
        if (liText === "") {
          e.preventDefault();
          document.execCommand("outdent", false);
          handleInput();
          updateActiveFormats();
          return;
        }
      }

      // Space Trigger: Auto-convert `- ` or `* ` or `1. ` at start of line
      if (e.key === " ") {
        const sel = window.getSelection();
        if (sel && sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE) {
          const text = sel.anchorNode.textContent || "";
          const offset = sel.anchorOffset;

          // If text before space is "-" or "*"
          if ((text.slice(0, offset) === "-" || text.slice(0, offset) === "*") && offset === 1) {
            e.preventDefault();
            sel.anchorNode.textContent = text.slice(1);
            formatCommand("insertUnorderedList");
            return;
          }

          // If text before space is "1."
          if (text.slice(0, offset) === "1." && offset === 2) {
            e.preventDefault();
            sel.anchorNode.textContent = text.slice(2);
            formatCommand("insertOrderedList");
            return;
          }
        }
      }
    };

    const effectivePlaceholder =
      placeholder ??
      (mode === "description"
        ? "Add a detailed description (*bold*, _italic_, `code`, - list)..."
        : shortCode
        ? `Message about ${shortCode}…`
        : "Write a message…");

    return (
      <div
        className={cn(
          "flex flex-col rounded-2xl border border-outline-variant/60 bg-surface-lowest shadow-sm overflow-hidden",
          "focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/10",
          "transition-all duration-200",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Scoped CSS to enforce list-style markers inside WYSIWYG editor */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .taskflow-wysiwyg-editor ul {
              list-style-type: disc !important;
              padding-left: 1.5rem !important;
              margin-top: 0.35rem !important;
              margin-bottom: 0.35rem !important;
            }
            .taskflow-wysiwyg-editor ol {
              list-style-type: decimal !important;
              padding-left: 1.5rem !important;
              margin-top: 0.35rem !important;
              margin-bottom: 0.35rem !important;
            }
            .taskflow-wysiwyg-editor li {
              display: list-item !important;
              padding-left: 0.25rem !important;
              margin-top: 0.15rem !important;
              margin-bottom: 0.15rem !important;
            }
            .taskflow-wysiwyg-editor ul > li {
              list-style-type: disc !important;
            }
            .taskflow-wysiwyg-editor ol > li {
              list-style-type: decimal !important;
            }
          `
        }} />

        {/* Formatting Toolbar */}
        <div className="flex items-center justify-between gap-1 px-2.5 pt-2 pb-1.5 border-b border-outline-variant/20 bg-surface-low/30 select-none">
          <div className="flex items-center gap-0.5 min-w-0">
            {/* Bold */}
            <SimpleTooltip content="Bold (⌘+B)">
              <button
                type="button"
                onClick={() => formatCommand("bold")}
                className={cn(
                  "p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer border border-transparent",
                  activeFormats.bold
                    ? "bg-primary/15 text-primary border-primary/30 font-bold"
                    : "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container"
                )}
                tabIndex={-1}
              >
                <Bold size={13.5} strokeWidth={2.4} />
              </button>
            </SimpleTooltip>

            {/* Italic */}
            <SimpleTooltip content="Italic (⌘+I)">
              <button
                type="button"
                onClick={() => formatCommand("italic")}
                className={cn(
                  "p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer border border-transparent",
                  activeFormats.italic
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container"
                )}
                tabIndex={-1}
              >
                <Italic size={13.5} strokeWidth={2.2} />
              </button>
            </SimpleTooltip>

            {/* Strikethrough */}
            <SimpleTooltip content="Strikethrough">
              <button
                type="button"
                onClick={() => formatCommand("strikeThrough")}
                className={cn(
                  "p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer border border-transparent",
                  activeFormats.strike
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container"
                )}
                tabIndex={-1}
              >
                <Strikethrough size={13.5} strokeWidth={2.2} />
              </button>
            </SimpleTooltip>

            {/* Inline Code */}
            <SimpleTooltip content="Inline Code (⌘+E)">
              <button
                type="button"
                onClick={toggleCode}
                className={cn(
                  "p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer border border-transparent",
                  activeFormats.code
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container"
                )}
                tabIndex={-1}
              >
                <Code size={13.5} strokeWidth={2.2} />
              </button>
            </SimpleTooltip>

            {/* Divider */}
            <div className="w-px h-4 bg-outline-variant/30 mx-1" />

            {/* Bullet List */}
            <SimpleTooltip content="Bullet list (- )">
              <button
                type="button"
                onClick={() => formatCommand("insertUnorderedList")}
                className={cn(
                  "p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer border border-transparent",
                  activeFormats.ul
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container"
                )}
                tabIndex={-1}
              >
                <List size={13.5} strokeWidth={2.2} />
              </button>
            </SimpleTooltip>

            {/* Numbered List */}
            <SimpleTooltip content="Numbered list (1. )">
              <button
                type="button"
                onClick={() => formatCommand("insertOrderedList")}
                className={cn(
                  "p-1.5 rounded-lg transition-all active:scale-90 cursor-pointer border border-transparent",
                  activeFormats.ol
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container"
                )}
                tabIndex={-1}
              >
                <ListOrdered size={13.5} strokeWidth={2.2} />
              </button>
            </SimpleTooltip>
          </div>

          {/* Shortcut hint */}
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline pr-1 hidden sm:block select-none shrink-0">
            {mode === "description" ? "⌘+Enter save" : "Shift+Enter ↵ send · Enter new line"}
          </span>
        </div>

        {/* ContentEditable WYSIWYG Area & Actions */}
        <div
          className={cn(
            "flex items-end gap-2 px-3 pb-2 pt-1.5",
            mode === "description" && "flex-col items-stretch gap-2.5 pb-3"
          )}
        >
          <div
            ref={editorRef}
            contentEditable={!disabled}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            data-placeholder={effectivePlaceholder}
            className={cn(
              "taskflow-wysiwyg-editor w-full bg-transparent border-none font-[family-name:var(--font-body)] text-[13.5px] text-on-surface focus:outline-none leading-relaxed py-1.5 overflow-y-auto custom-scrollbar",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-outline empty:before:pointer-events-none",
              "[&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_s]:line-through",
              "[&_code]:font-mono [&_code]:text-[12px] [&_code]:bg-surface-low [&_code]:border [&_code]:border-outline-variant/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-primary [&_code]:font-medium",
              mode === "description"
                ? "min-h-[100px] max-h-[360px]"
                : "min-h-[38px] max-h-[180px]"
            )}
          />

          {/* Actions */}
          {mode === "chat" ? (
            <motion.button
              type="button"
              onClick={canSubmit ? onSubmit : undefined}
              disabled={!canSubmit}
              whileTap={canSubmit ? { scale: 0.93 } : undefined}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center justify-center shrink-0 mb-0.5 cursor-pointer self-end shadow-xs disabled:pointer-events-none",
                isEditing
                  ? canSubmit
                    ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                    : "bg-surface-container text-outline opacity-40"
                  : canSubmit
                  ? "bg-primary text-on-primary hover:brightness-110"
                  : "bg-surface-container text-outline opacity-40"
              )}
              aria-label={isEditing ? "Save edited comment" : "Send message"}
            >
              {isEditing ? <Check size={15} strokeWidth={2.5} /> : <Send size={15} />}
            </motion.button>
          ) : (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-low text-on-surface text-[12px] font-medium hover:bg-surface-high transition-colors cursor-pointer border border-outline-variant/40"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={canSubmit ? onSubmit : undefined}
                disabled={!canSubmit}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-semibold transition-all shadow-xs",
                  canSubmit
                    ? "bg-primary text-on-primary hover:brightness-110 active:scale-95 cursor-pointer"
                    : "bg-surface-container text-outline opacity-40 cursor-not-allowed hover:brightness-100"
                )}
              >
                <Check size={13} />
                <span>{submitLabel}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

RichComposer.displayName = "RichComposer";
export default RichComposer;
