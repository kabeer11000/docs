// Block-level page layout. Pure so it can be tested without a browser.
// The editor lays blocks out in a flex column (no margin collapsing), so block positions follow from
// heights and margins alone. A block that does not fit on the current page gets a spacer before it
// that fills the rest of the page, the bottom margin, the gap and the next page's top margin.

export interface BlockBox {
  height: number;
  marginTop: number;
  marginBottom: number;
  /** Next block must start on a new page (manual page break). */
  breakAfter?: boolean;
}

export interface PageBreakSpec {
  /** Index of the block that starts the new page. */
  index: number;
  /** Spacer height in px. */
  height: number;
  /** Spacer is pulled up by the previous block's bottom margin so it starts at its border edge. */
  pullUp: number;
}

/**
 * @param contentHeight usable height per page (sheet minus top and bottom margins)
 * @param between distance from the end of one page's content box to the start of the next
 *                (bottom margin + gap + top margin)
 */
export function computeBreaks(
  blocks: BlockBox[],
  contentHeight: number,
  between: number,
): { breaks: PageBreakSpec[]; pages: number } {
  const pitch = contentHeight + between;
  const breaks: PageBreakSpec[] = [];
  let page = 0;
  let y = 0; // bottom border edge of the last block, in flow coordinates
  let prevMb = 0;
  let atStart = true;
  let forceNext = false;

  blocks.forEach((b, index) => {
    const pageEnd = page * pitch + contentHeight;
    let top = atStart ? y : y + prevMb + b.marginTop;
    if (!atStart && (forceNext || top + b.height > pageEnd + 0.5)) {
      // Never break before a block that would not fit on an empty page either, unless forced.
      const nextStart = (page + 1) * pitch;
      breaks.push({ index, height: Math.max(0, nextStart - y), pullUp: prevMb });
      page += 1;
      top = nextStart;
    }
    y = top + b.height;
    prevMb = b.marginBottom;
    atStart = false;
    forceNext = !!b.breakAfter;
    // ponytail: a block taller than a page (huge table, very long paragraph) runs across the gap;
    // splitting inside blocks needs line-level layout.
    while (y > page * pitch + contentHeight + 0.5) page += 1;
  });

  return { breaks, pages: page + 1 };
}
