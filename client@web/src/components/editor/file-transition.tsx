import * as React from "react";
import type { ReactNode } from "react";

// React's <ViewTransition> ships as `unstable_ViewTransition` in the experimental build Next uses
// when `experimental.viewTransition` is on. Elsewhere this renders its child unchanged; browsers
// without the View Transitions API simply navigate without the morph.
const ViewTransition =
  (React as unknown as { unstable_ViewTransition?: React.ComponentType<{ name: string; children: ReactNode }> })
    .unstable_ViewTransition ?? React.Fragment;

/**
 * Shared element between a file's card on Home and its open page: wrap the card thumbnail and the
 * page with the same id and navigation morphs one into the other. Use once per file on a screen
 * (duplicate names cancel the transition).
 */
export function FileTransition({ id, children }: { id: string; children: ReactNode }) {
  if (ViewTransition === React.Fragment) return <>{children}</>;
  return <ViewTransition name={`file-${id}`}>{children}</ViewTransition>;
}
