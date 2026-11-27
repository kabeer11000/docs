// Page operations on the model. Pure: each returns a new PdfData (or the same one when nothing changes).
import { normRotation } from "./geometry";
import { type Annotation, newId, type PageRef, type PdfData } from "./model";

export type PageOp =
  | { type: "rotate"; ids: string[]; delta: number }
  | { type: "delete"; ids: string[] }
  | { type: "duplicate"; ids: string[] }
  | { type: "move"; id: string; to: number }
  | { type: "insertBlank"; index: number; size: [number, number] }
  | { type: "insert"; index: number; srcs: number[] };

export function applyPageOp(
  data: PdfData,
  op: PageOp,
  makeId: () => string = newId,
): PdfData {
  const { pages } = data;
  switch (op.type) {
    case "rotate": {
      if (!op.ids.length) return data;
      const ids = new Set(op.ids);
      return {
        ...data,
        pages: pages.map((p) =>
          ids.has(p.id)
            ? { ...p, rotation: normRotation(p.rotation + op.delta) }
            : p,
        ),
      };
    }
    case "delete": {
      const ids = new Set(op.ids);
      const kept = pages.filter((p) => !ids.has(p.id));
      // A file always keeps at least one page.
      if (!kept.length || kept.length === pages.length) return data;
      return {
        ...data,
        pages: kept,
        annotations: data.annotations.filter((a) => !ids.has(a.pageId)),
      };
    }
    case "duplicate": {
      const ids = new Set(op.ids);
      if (!pages.some((p) => ids.has(p.id))) return data;
      const out: PageRef[] = [];
      const copies: Annotation[] = [];
      for (const p of pages) {
        out.push(p);
        if (!ids.has(p.id)) continue;
        const copy = { ...p, id: makeId() };
        out.push(copy);
        for (const a of data.annotations)
          if (a.pageId === p.id)
            copies.push({
              ...structuredClone(a),
              id: makeId(),
              pageId: copy.id,
            });
      }
      return {
        ...data,
        pages: out,
        annotations: [...data.annotations, ...copies],
      };
    }
    case "move": {
      const from = pages.findIndex((p) => p.id === op.id);
      const to = Math.max(0, Math.min(pages.length - 1, op.to));
      if (from < 0 || from === to) return data;
      const out = [...pages];
      const [moved] = out.splice(from, 1);
      out.splice(to, 0, moved);
      return { ...data, pages: out };
    }
    case "insertBlank": {
      const at = Math.max(0, Math.min(pages.length, op.index));
      const blank: PageRef = {
        id: makeId(),
        src: -1,
        rotation: 0,
        size: op.size,
      };
      return {
        ...data,
        pages: [...pages.slice(0, at), blank, ...pages.slice(at)],
      };
    }
    case "insert": {
      if (!op.srcs.length) return data;
      const at = Math.max(0, Math.min(pages.length, op.index));
      const added: PageRef[] = op.srcs.map((src) => ({
        id: makeId(),
        src,
        rotation: 0,
      }));
      return {
        ...data,
        pages: [...pages.slice(0, at), ...added, ...pages.slice(at)],
      };
    }
  }
}
