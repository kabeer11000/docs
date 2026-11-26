import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { type BlockBox, computeBreaks } from "@/lib/paper/paginate";

export interface PaginationOptions {
  /** Read on every layout pass so paper changes apply without recreating the editor. */
  getLayout: () => { contentHeight: number; between: number };
  onPageCount: (pages: number) => void;
}

const key = new PluginKey<DecorationSet>("paperPagination");
const schedulers = new WeakMap<EditorView, () => void>();

/** Re-run layout, e.g. after the paper size or margins changed. */
export function repaginate(view: EditorView | undefined | null) {
  if (view) schedulers.get(view)?.();
}

function spacer(height: number, pullUp: number) {
  const el = document.createElement("div");
  el.className = "pg-break";
  el.contentEditable = "false";
  el.setAttribute("aria-hidden", "true");
  el.style.height = `${height}px`;
  if (pullUp) el.style.marginTop = `${-pullUp}px`;
  return el;
}

export const Pagination = Extension.create<PaginationOptions>({
  name: "paperPagination",

  addOptions() {
    return {
      getLayout: () => ({ contentHeight: 864, between: 216 }),
      onPageCount: () => {},
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const next = tr.getMeta(key) as DecorationSet | undefined;
            return next ?? set.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations: (state) => key.getState(state),
        },
        view(view) {
          let raf = 0;
          let lastPages = 0;

          const measure = () => {
            raf = 0;
            if (view.isDestroyed) return;
            const { contentHeight, between } = options.getLayout();
            const blocks: BlockBox[] = [];
            const positions: number[] = [];
            view.state.doc.forEach((node, offset) => {
              const el = view.nodeDOM(offset);
              positions.push(offset);
              if (!(el instanceof HTMLElement)) {
                blocks.push({ height: 0, marginTop: 0, marginBottom: 0 });
                return;
              }
              const cs = getComputedStyle(el);
              blocks.push({
                height: el.getBoundingClientRect().height,
                marginTop: Number.parseFloat(cs.marginTop) || 0,
                marginBottom: Number.parseFloat(cs.marginBottom) || 0,
                breakAfter: node.type.name === "pageBreak",
              });
            });
            // 1px of slack so rounding never pushes a line past the printed page.
            const { breaks, pages } = computeBreaks(blocks, contentHeight - 1, between + 1);
            const decos = breaks.map((b) => {
              const h = Math.round(b.height * 100) / 100;
              return Decoration.widget(positions[b.index], () => spacer(h, b.pullUp), {
                side: -1,
                ignoreSelection: true,
                key: `pg-${h}-${b.pullUp}`,
              });
            });
            const current = key.getState(view.state);
            const sig = (d: Decoration[]) => d.map((x) => `${x.from}:${x.spec.key}`).join(",");
            if (current && sig(current.find()) !== sig(decos)) {
              view.dispatch(
                view.state.tr.setMeta(key, DecorationSet.create(view.state.doc, decos)).setMeta("addToHistory", false),
              );
            }
            if (pages !== lastPages) {
              lastPages = pages;
              options.onPageCount(pages);
            }
          };

          const schedule = () => {
            if (!raf) raf = requestAnimationFrame(measure);
          };
          schedulers.set(view, schedule);
          const ro = new ResizeObserver(schedule);
          ro.observe(view.dom);
          document.fonts?.ready.then(schedule);
          schedule();

          return {
            update(v, prev) {
              if (v.state.doc !== prev.doc) schedule();
            },
            destroy() {
              ro.disconnect();
              if (raf) cancelAnimationFrame(raf);
              schedulers.delete(view);
            },
          };
        },
      }),
    ];
  },
});
