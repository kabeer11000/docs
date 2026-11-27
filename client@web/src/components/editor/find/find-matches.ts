import type { Node as PMNode } from "@tiptap/pm/model";

export interface FindOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface Match {
  from: number;
  to: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every occurrence of `query` inside a textblock (matches never span blocks). */
export function findMatches(doc: PMNode, query: string, { caseSensitive, wholeWord }: FindOptions): Match[] {
  if (!query) return [];
  const body = wholeWord ? `(?<![\\p{L}\\p{N}_])${escape(query)}(?![\\p{L}\\p{N}_])` : escape(query);
  const re = new RegExp(body, caseSensitive ? "gu" : "giu");
  const matches: Match[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // One character per document position, so a string index maps straight back to a position.
    let text = "";
    node.forEach((child) => {
      text += child.isText ? child.text : "\ufffc".repeat(child.nodeSize);
    });
    for (const m of text.matchAll(re)) {
      const from = pos + 1 + (m.index ?? 0);
      matches.push({ from, to: from + m[0].length });
    }
    return false;
  });
  return matches;
}
