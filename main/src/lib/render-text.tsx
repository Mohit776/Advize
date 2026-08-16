import React from 'react';

/**
 * Inline text renderer supporting:
 *  - **bold** or *bold*  → <strong>
 *  - https://... links   → <a target="_blank">
 *
 * Order of precedence: double-asterisk bold → single-asterisk bold → URL
 */

// Single regex with named capture groups — order matters
const INLINE_REGEX = /(\*\*(.+?)\*\*|\*([^*\n]+?)\*|(https?:\/\/[^\s]+))/g;

export function renderInlineText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset before use
  INLINE_REGEX.lastIndex = 0;

  while ((match = INLINE_REGEX.exec(text)) !== null) {
    const [full, , doubleBoldContent, singleBoldContent, url] = match;

    // Push plain text before this match
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`plain-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    if (doubleBoldContent) {
      // **bold**
      nodes.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-foreground">
          {doubleBoldContent}
        </strong>
      );
    } else if (singleBoldContent) {
      // *bold*
      nodes.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-foreground">
          {singleBoldContent}
        </strong>
      );
    } else if (url) {
      // URL
      nodes.push(
        <a
          key={`url-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary underline underline-offset-2 hover:text-primary/80 break-all transition-colors"
        >
          {url}
        </a>
      );
    }

    lastIndex = match.index + full.length;
  }

  // Remaining plain text after last match
  if (lastIndex < text.length) {
    nodes.push(<span key={`plain-end`}>{text.slice(lastIndex)}</span>);
  }

  return nodes;
}
