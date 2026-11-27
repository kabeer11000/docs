import type { Element, ElementContent, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { unified } from "unified";
import { replaceMath } from "./rich-nodes";

// HTML (editor output) <-> GitHub-flavoured Markdown.

const PAGE_BREAK_MD = '\n\n<div data-page-break="true"></div>\n\n';

/** Indent a list item's body under its marker; tight items (one paragraph) lose blank lines. */
function listBody(content: string, node: Node, indent: number) {
  const el = node as HTMLElement;
  const paragraphs = Array.from(el.childNodes).filter(
    (c) => c.nodeName === "P" || (c.nodeName === "DIV" && Array.from(c.childNodes).filter((g) => g.nodeName === "P").length > 1),
  ).length;
  let body = content.replace(/^\n+/, "").replace(/\n+$/, "");
  if (paragraphs <= 1) body = body.replace(/\n{2,}/g, "\n");
  body = body.replace(/\n(?=[^\n])/g, `\n${" ".repeat(indent)}`);
  return `${body}${node.nextSibling ? "\n" : ""}`;
}

function createTurndown() {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    hr: "---",
    // Empty elements hit the blank rule before any custom rule; keep manual page breaks.
    blankReplacement: (_content, node) =>
      (node as HTMLElement).getAttribute?.("data-page-break") != null
        ? PAGE_BREAK_MD
        : (node as { isBlock?: boolean }).isBlock
          ? "\n\n"
          : "",
  });
  // Math arrives filled with its LaTeX (see htmlToMarkdown); read it raw so it is not escaped.
  td.addRule("math", {
    filter: (node) => /^(inline|block)-math$/.test(node.getAttribute("data-type") ?? ""),
    replacement: (_content, node) => {
      const latex = node.textContent ?? "";
      return (node as HTMLElement).getAttribute("data-type") === "block-math" ? `\n\n$$\n${latex}\n$$\n\n` : `$${latex}$`;
    },
  });
  td.use(gfm);
  td.keep(["sub", "sup"]);
  td.addRule("highlight", {
    filter: "mark",
    replacement: (content) => (content ? `==${content}==` : ""),
  });
  // GitHub alert syntax: > [!NOTE]
  td.addRule("callout", {
    filter: (node) => node.nodeName === "DIV" && node.hasAttribute("data-callout"),
    replacement: (content, node) => {
      const tone = ((node as HTMLElement).getAttribute("data-callout") || "note").toUpperCase();
      const body = content.replace(/^\n+|\n+$/g, "").replace(/^/gm, "> ");
      return `\n\n> [!${tone}]\n${body}\n\n`;
    },
  });
  // Rules added later win (turndown checks them first).
  td.addRule("listItem", {
    filter: "li",
    replacement: (content, node) => {
      const parent = node.parentNode as HTMLElement;
      let prefix = "- ";
      if (parent.nodeName === "OL") {
        const start = Number(parent.getAttribute("start") || 1);
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      return prefix + listBody(content, node, prefix.length);
    },
  });
  td.addRule("strike", {
    filter: ["del", "s", "strike" as keyof HTMLElementTagNameMap],
    replacement: (content) => `~~${content}~~`,
  });
  // Editor table cells wrap text in <p>; GFM cells must stay on one line.
  td.addRule("cellParagraph", {
    filter: (node) => node.nodeName === "P" && /^(TD|TH)$/.test(node.parentNode?.nodeName ?? ""),
    replacement: (content, node) => (node.nextSibling ? `${content}<br>` : content),
  });
  td.addRule("taskLabel", {
    filter: (node) => node.nodeName === "LABEL" && (node.parentNode as HTMLElement | null)?.getAttribute?.("data-type") === "taskItem",
    replacement: () => "",
  });
  td.addRule("taskItem", {
    filter: (node) => node.nodeName === "LI" && node.getAttribute("data-type") === "taskItem",
    replacement: (content, node) => {
      const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
      return `- [${checked ? "x" : " "}] ${listBody(content, node, 2)}`;
    },
  });
  return td;
}

let turndown: TurndownService | null = null;

export function htmlToMarkdown(html: string): string {
  turndown ??= createTurndown();
  const filled = replaceMath(html, (latex) => latex.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string));
  return `${turndown.turndown(filled).replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

const cls = (el: Element) => {
  const c = el.properties?.className;
  return Array.isArray(c) ? c.map(String) : typeof c === "string" ? c.split(" ") : [];
};

/** GFM task lists -> the editor's taskList/taskItem markup. */
function toEditorTaskLists(node: Root | Element) {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    toEditorTaskLists(child);
    if (child.tagName === "ul" && cls(child).includes("contains-task-list")) {
      child.properties = { dataType: "taskList" };
    }
    if (child.tagName === "li" && cls(child).includes("task-list-item")) {
      let checked = false;
      const strip = (list: ElementContent[]): ElementContent[] =>
        list.filter((c) => {
          if (c.type === "element" && c.tagName === "input") {
            checked = !!c.properties?.checked;
            return false;
          }
          if (c.type === "element" && c.tagName === "p") c.children = strip(c.children);
          return true;
        });
      child.children = strip(child.children);
      // Drop the space GFM leaves after the checkbox.
      const first = child.children[0];
      const firstText = first?.type === "text" ? first : first?.type === "element" && first.children[0]?.type === "text" ? first.children[0] : null;
      if (firstText && firstText.type === "text") firstText.value = firstText.value.replace(/^\s+/, "");
      child.properties = { dataType: "taskItem", dataChecked: checked ? "true" : "false" };
    }
  }
}

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);

/** Raw HTML in the Markdown is dropped (remark-rehype default), so the output is safe to load. */
export function markdownToHtml(md: string): string {
  const tree = processor.runSync(processor.parse(md)) as Root;
  toEditorTaskLists(tree);
  return toHtml(tree).replace(/>\n</g, "><");
}
