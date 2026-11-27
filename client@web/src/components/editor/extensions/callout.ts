import { mergeAttributes, Node } from "@tiptap/core";

export const CALLOUT_TONES = ["note", "tip", "warning"] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: { setCallout: (tone?: CalloutTone) => ReturnType };
  }
}

const toTone = (v: string | null): CalloutTone => (CALLOUT_TONES.includes(v as CalloutTone) ? (v as CalloutTone) : "note");

/** Tinted box with a left rule around ordinary blocks. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "note",
        parseHTML: (el) => toTone(el.getAttribute("data-callout")),
        renderHTML: (attrs) => ({ "data-callout": toTone(attrs.tone) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "callout" }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (tone = "note") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tone }),
    };
  },
});
