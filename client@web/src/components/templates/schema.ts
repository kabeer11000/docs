import { getSchema } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import {
  DOMSerializer,
  DOMParser as PMDOMParser,
  type Node as PMNode,
  type Schema,
} from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import {
  TableCellPlus,
  TableHeaderPlus,
  TablePlus,
  TableRowPlus,
} from "tiptap-pagination-plus";
import { Callout } from "@/components/editor/extensions/callout";
import { CodeBlock } from "@/components/editor/extensions/code-block";
import { CustomHeading } from "@/components/editor/extensions/custom-heading";
import { FontFamily } from "@/components/editor/extensions/font-family";

/**
 * The content-bearing part of the editor's extension list (editor.tsx): the nodes and marks a
 * template can use, without the editing machinery. Keep in step with the editor.
 */
export const templateExtensions = [
  StarterKit.configure({ heading: false, undoRedo: false, codeBlock: false }),
  CodeBlock,
  Highlight,
  Subscript,
  Superscript,
  Callout,
  CustomHeading.configure({ levels: [1, 2, 3] }),
  TextStyle,
  FontSize,
  FontFamily,
  Color,
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right", "justify"],
    defaultAlignment: "left",
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Image.configure({ allowBase64: true }),
  TablePlus,
  TableRowPlus,
  TableCellPlus,
  TableHeaderPlus,
];

let schema: Schema | null = null;
export const templateSchema = () => {
  schema ??= getSchema(templateExtensions);
  return schema;
};

/** Template HTML parsed through the editor schema, as the editor would hold it. */
export function parseTemplate(html: string, document: Document): PMNode {
  const host = document.createElement("div");
  host.innerHTML = html;
  return PMDOMParser.fromSchema(templateSchema()).parse(host);
}

/**
 * Template HTML as the editor renders it (task checkboxes, table column widths), for static
 * previews. Templates are our own trusted content; the schema drops anything it does not know.
 */
export function templateMarkup(html: string, document: Document): string {
  const out = document.createElement("div");
  out.appendChild(
    DOMSerializer.fromSchema(templateSchema()).serializeFragment(
      parseTemplate(html, document).content,
      { document },
    ),
  );
  return out.innerHTML;
}
