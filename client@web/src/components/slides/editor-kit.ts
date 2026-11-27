import { type AnyExtension, generateJSON, getHTMLFromFragment, getSchema } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON } from "@tiptap/y-tiptap";
import type * as Y from "yjs";
import { field, readStructure } from "@/lib/slides/deck-doc";
import { type Deck, LAYOUTS } from "@/lib/slides/model";

/** Schema shared by every slide region and the notes (editing-only extensions are added by the editor). */
export const slideExtensions: AnyExtension[] = [
  StarterKit.configure({
    heading: false,
    undoRedo: false,
    codeBlock: false,
    horizontalRule: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
  }),
  TextStyle,
  Color,
  TextAlign.configure({ types: ["paragraph"], alignments: ["left", "center", "right"] }),
  Image.configure({ allowBase64: true }),
];

let schema: ReturnType<typeof getSchema> | null = null;
const slideSchema = () => (schema ??= getSchema(slideExtensions));

export function htmlToFragment(html: string, fragment: Y.XmlFragment) {
  prosemirrorJSONToYXmlFragment(slideSchema(), generateJSON(html, slideExtensions), fragment);
}

function fragmentDoc(fragment: Y.XmlFragment): PMNode | null {
  if (!fragment.length) return null;
  try {
    return PMNode.fromJSON(slideSchema(), yXmlFragmentToProsemirrorJSON(fragment));
  } catch {
    return null;
  }
}

const isBlank = (doc: PMNode) => doc.childCount === 1 && doc.firstChild?.type.name === "paragraph" && doc.firstChild.childCount === 0;

function fragmentHtml(fragment: Y.XmlFragment): string {
  const doc = fragmentDoc(fragment);
  return doc && !isBlank(doc) ? getHTMLFromFragment(doc.content, slideSchema()) : "";
}

function fragmentText(fragment: Y.XmlFragment): string {
  const doc = fragmentDoc(fragment);
  return doc ? doc.textBetween(0, doc.content.size, "\n", "\n") : "";
}

type YType = Y.AbstractType<unknown> & { _item: { parent: unknown } | null };
const rootOf = (t: YType): YType => {
  let type = t;
  while (type._item) type = type._item.parent as YType;
  return type;
};

/**
 * Reads the Y.Doc as a stored Deck. Region HTML is cached per fragment and only rebuilt for fragments a
 * transaction touched, so typing on one slide does not re-render the whole deck.
 */
export function createSnapshotter(doc: Y.Doc) {
  const cache = new Map<Y.XmlFragment, string>();
  const onTransaction = (tr: Y.Transaction) => {
    for (const type of tr.changed.keys()) cache.delete(rootOf(type as YType) as unknown as Y.XmlFragment);
  };

  const read = (id: string, region: string, text = false) => {
    const fragment = doc.getXmlFragment(field(id, region));
    let value = cache.get(fragment);
    if (value === undefined) {
      value = text ? fragmentText(fragment) : fragmentHtml(fragment);
      cache.set(fragment, value);
    }
    return value;
  };

  return {
    snapshot(): Deck {
      const { theme, slides } = readStructure(doc);
      return {
        version: 1,
        aspect: "16:9",
        theme,
        slides: slides.map(({ id, layout }) => ({
          id,
          layout,
          notes: read(id, "notes", true),
          html: Object.fromEntries(LAYOUTS[layout].regions.map((r) => [r, read(id, r)]).filter(([, h]) => h)),
        })),
      };
    },
    /** Starts tracking changes; returns the cleanup. */
    attach() {
      cache.clear();
      doc.on("afterTransaction", onTransaction);
      return () => doc.off("afterTransaction", onTransaction);
    },
  };
}
