import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './TruncatedText.module.css';

interface TruncatedTextProps {
  text: string | null | undefined;
  /** Max line count before truncation. Default: 2. */
  lines?: number;
  /** Element shown when text is empty. Default: nothing. */
  placeholder?: ReactNode;
  /** Optional className applied to the visible (truncated) wrapper. */
  className?: string;
}

/**
 * Renders text clamped to N lines. When the text would overflow, hovering or
 * focusing the element shows a portal-rendered tooltip with the full content.
 * The tooltip escapes any `overflow: hidden` ancestor by living in document.body.
 */
export default function TruncatedText({
  text,
  lines = 2,
  placeholder = null,
  className,
}: TruncatedTextProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const textStr = typeof text === 'string' ? text : '';
  const trimmed = textStr.trim();

  // Detect overflow whenever text or layout changes
  useLayoutEffect(() => {
    if (!trimmed) {
      setIsTruncated(false);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    // Both vertical (line-clamp) and horizontal (single line wrap) check
    const truncated = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    setIsTruncated(truncated);
  }, [trimmed, lines]);

  useLayoutEffect(() => {
    if (!open || !isTruncated) {
      setPos(null);
      return;
    }
    function updatePos() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 6;
      const tooltipMaxWidth = Math.min(420, window.innerWidth - 16);
      // Width of the tooltip: clamp to viewport
      const width = Math.min(tooltipMaxWidth, Math.max(rect.width, 240));
      // Default: aligned with trigger left, just below
      let left = rect.left;
      let top = rect.bottom + margin;
      // Keep within viewport horizontally
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      // If would clip vertically, flip above
      const estimatedHeight = 200; // tolerable upper bound for clipping detection
      if (top + estimatedHeight > window.innerHeight - 8 && rect.top > estimatedHeight) {
        top = rect.top - margin;
        // We'll translateY(-100%) on the tooltip via inline style
        setPos({ top, left, width: -width });
        return;
      }
      setPos({ top, left, width });
    }
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, isTruncated, trimmed]);

  if (!trimmed) {
    return <>{placeholder}</>;
  }

  // Negative width sentinel signals "flip above"
  const flipAbove = pos !== null && pos.width < 0;
  const tooltipWidth = pos ? Math.abs(pos.width) : 0;

  return (
    <span
      ref={triggerRef}
      className={`${styles.truncated} ${className ?? ''}`}
      style={{
        WebkitLineClamp: lines,
        // Fallback: ensure cursor/help signals interactivity
        cursor: isTruncated ? 'help' : 'default',
      }}
      onMouseEnter={() => isTruncated && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => isTruncated && setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={isTruncated ? 0 : -1}
      // The browser's default title attribute provides a fallback if portal fails
      title={isTruncated ? trimmed : undefined}
    >
      {trimmed}
      {open && isTruncated && pos && createPortal(
        <div
          className={styles.tooltip}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: tooltipWidth,
            transform: flipAbove ? 'translateY(-100%)' : undefined,
          }}
        >
          {trimmed}
        </div>,
        document.body,
      )}
    </span>
  );
}
