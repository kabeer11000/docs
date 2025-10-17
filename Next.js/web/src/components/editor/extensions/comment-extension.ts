import type { IComment } from "@shared-types";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comments: {
      /**
       * Add a comment to the selected text
       */
      addComment: (commentId: string) => ReturnType;
      /**
       * Remove a comment
       */
      removeComment: (commentId: string) => ReturnType;
      /**
       * Highlight a comment range
       */
      highlightComment: (commentId: string) => ReturnType;
      /**
       * Remove comment highlight
       */
      removeCommentHighlight: (commentId: string) => ReturnType;
    };
  }
}

export interface CommentExtensionOptions {
  comments: IComment[];
  onCommentClick?: (
    commentId: string,
    range: { from: number; to: number },
  ) => void;
  onSelectionComment?: (
    range: { from: number; to: number },
    text: string,
  ) => void;
}

// Plugin key defined first
const commentPluginKey = new PluginKey("comments");

// Plugin to manage comment decorations - defined before use
const commentPlugin: Plugin<any> = new Plugin({
  key: commentPluginKey,
  state: {
    init() {
      return {
        decorations: DecorationSet.empty,
        highlightedComment: null,
      };
    },
    apply(tr, state) {
      const meta = tr.getMeta(commentPlugin);

      if (meta) {
        switch (meta.type) {
          case "add":
            return {
              ...state,
              decorations: meta.decorations,
            };
          case "remove":
            return {
              ...state,
              decorations: meta.decorations,
            };
          case "highlight":
            // Just track which comment is highlighted - CSS will handle the style
            return {
              ...state,
              highlightedComment: meta.commentId,
            };
          case "unhighlight":
            // Remove highlight tracking
            return {
              ...state,
              highlightedComment:
                state.highlightedComment === meta.commentId
                  ? null
                  : state.highlightedComment,
            };
        }
      }

      // Map decorations on document changes
      return {
        ...state,
        decorations: state.decorations.map(tr.mapping, tr.doc),
      };
    },
  },
  props: {
    decorations(state) {
      return commentPlugin.getState(state).decorations;
    },
  },
});

export const CommentExtension = Extension.create<CommentExtensionOptions>({
  name: "comments",

  addOptions() {
    return {
      comments: [],
      onCommentClick: undefined,
      onSelectionComment: undefined,
    };
  },

  addCommands() {
    return {
      addComment:
        (commentId: string) =>
        ({ state, dispatch }) => {
          const { from, to } = state.selection;

          if (from === to) {
            return false;
          }

          if (dispatch) {
            const decoration = Decoration.inline(from, to, {
              class: `comment-highlight comment-${commentId}`,
              "data-comment-id": commentId,
            });

            const pluginState = commentPlugin.getState(state);
            if (!pluginState) {
              console.error("Comment plugin state not found");
              return false;
            }

            const decorations = pluginState.decorations.add(state.doc, [
              decoration,
            ]);

            const tr = state.tr.setMeta(commentPlugin, {
              type: "add",
              commentId,
              from,
              to,
              decorations,
            });

            dispatch(tr);
          }

          return true;
        },

      removeComment:
        (commentId: string) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const pluginState = commentPlugin.getState(state);
            if (!pluginState) {
              return false;
            }

            const decorations = pluginState.decorations.find(
              undefined,
              undefined,
              (spec: any) => spec["data-comment-id"] === commentId,
            );

            const tr = state.tr.setMeta(commentPlugin, {
              type: "remove",
              commentId,
              decorations: pluginState.decorations.remove(decorations),
            });

            dispatch(tr);
          }

          return true;
        },

      highlightComment:
        (commentId: string) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const pluginState = commentPlugin.getState(state);
            if (!pluginState) {
              return false;
            }

            const tr = state.tr.setMeta(commentPlugin, {
              type: "highlight",
              commentId,
            });

            dispatch(tr);
          }

          return true;
        },

      removeCommentHighlight:
        (commentId: string) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const pluginState = commentPlugin.getState(state);
            if (!pluginState) {
              return false;
            }

            const tr = state.tr.setMeta(commentPlugin, {
              type: "unhighlight",
              commentId,
            });

            dispatch(tr);
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      commentPlugin,
      // Selection plugin for creating new comments
      new Plugin({
        key: new PluginKey("commentSelection"),
        props: {
          handleDOMEvents: {
            mouseup: (view, _event) => {
              const { state } = view;
              const { from, to } = state.selection;

              // Check if there's a selection and we're not already in a comment
              if (from !== to && this.options.onSelectionComment) {
                const selectedText = state.doc.textBetween(from, to, " ");

                // Add a small delay to allow for double-click selection completion
                setTimeout(() => {
                  const currentSelection = view.state.selection;
                  if (currentSelection.from !== currentSelection.to) {
                    this.options.onSelectionComment?.(
                      { from: currentSelection.from, to: currentSelection.to },
                      selectedText,
                    );
                  }
                }, 10);
              }

              return false;
            },
            click: (view, event) => {
              const target = event.target as HTMLElement;
              const commentId = target.getAttribute("data-comment-id");

              if (commentId && this.options.onCommentClick) {
                // Find the comment range
                const pluginState = commentPlugin.getState(view.state);
                if (!pluginState) return false;

                try {
                  const decorations = pluginState.decorations.find(
                    undefined,
                    undefined,
                    (spec: any) => spec["data-comment-id"] === commentId,
                  );

                  if (decorations?.[0]) {
                    this.options.onCommentClick(commentId, {
                      from: decorations[0].from,
                      to: decorations[0].to,
                    });
                  }
                } catch (error) {
                  console.error("Error finding comment decoration:", error);
                }
              }

              return false;
            },
          },
        },
      }),
    ];
  },

  // Don't initialize decorations on create - let them be added manually
  onCreate() {
    // Comments will be added via editor commands when needed
  },

  onUpdate() {
    // Don't auto-sync decorations - this causes issues with ProseMirror state
    // Decorations are managed manually via commands
  },
});
