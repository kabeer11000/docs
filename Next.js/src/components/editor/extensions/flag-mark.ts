import { Mark, mergeAttributes } from "@tiptap/core";

export interface FlagOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    flag: {
      setRedFlag: (attributes: {
        reason: string;
        severity: string;
        recommendation?: string;
      }) => ReturnType;
      setGreenFlag: (attributes: {
        reason: string;
        severity: string;
      }) => ReturnType;
      unsetFlag: () => ReturnType;
    };
  }
}

export const RedFlag = Mark.create<FlagOptions>({
  name: "redFlag",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      reason: {
        default: null,
      },
      severity: {
        default: "medium",
      },
      recommendation: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-red-flag]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-red-flag": "true",
        "data-reason": HTMLAttributes.reason || "",
        "data-severity": HTMLAttributes.severity || "",
        "data-recommendation": HTMLAttributes.recommendation || "",
        class: "red-flag-underline",
        title: `${HTMLAttributes.reason || ""}${HTMLAttributes.recommendation ? `\n\nRecommendation: ${HTMLAttributes.recommendation}` : ""}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setRedFlag:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetFlag:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export const GreenFlag = Mark.create<FlagOptions>({
  name: "greenFlag",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      reason: {
        default: null,
      },
      severity: {
        default: "medium",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-green-flag]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-green-flag": "true",
        "data-reason": HTMLAttributes.reason || "",
        "data-severity": HTMLAttributes.severity || "",
        class: "green-flag-underline",
        title: HTMLAttributes.reason || "",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setGreenFlag:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetFlag:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
