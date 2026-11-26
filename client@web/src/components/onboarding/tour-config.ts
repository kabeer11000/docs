import type { DriveStep } from "driver.js";

export type TourName = "home" | "editor";

export const STEPS: Record<TourName, DriveStep[]> = {
  home: [
    {
      element: '[data-tour="new-document"]',
      popover: {
        title: "Start a document",
        description: "Create a blank document, or open the menu to start from a template or upload a file.",
      },
    },
    {
      element: '[data-tour="search"]',
      popover: {
        title: "Find anything",
        description: "Search documents, folders and templates. Press Ctrl+K from anywhere.",
      },
    },
    {
      element: '[data-tour="nav-vault"]',
      popover: {
        title: "Your vault",
        description: "Everything you own lives here, organised in folders. Shared with me lists what others have shared.",
      },
    },
    {
      element: '[data-tour="starred"]',
      popover: {
        title: "Keep favourites close",
        description: "Star a document or folder and it shows up here for one-click access.",
      },
    },
    {
      element: '[data-tour="account-menu"]',
      popover: {
        title: "Make it yours",
        description: "Switch between light and dark, open settings, or replay this tour.",
      },
    },
  ],
  editor: [
    {
      element: '[data-tour="editor-toolbar"]',
      popover: {
        title: "Format as you write",
        description: "Headings, fonts, lists, tables and alignment. Most actions also have keyboard shortcuts.",
      },
    },
    {
      element: '[data-tour="editor-ai"]',
      popover: {
        title: "Ask AI",
        description: "Summarise, rewrite or draft with the assistant without leaving the page.",
      },
    },
    {
      element: '[data-tour="share-button"]',
      popover: {
        title: "Work together",
        description: "Invite people to view, comment or edit. Everyone sees changes live.",
      },
    },
  ],
};

export const seenKey = (tour: TourName, userId: string) => `docs.tour.${tour}.v1.${userId}`;

export function tourForPath(pathname: string): TourName | null {
  if (pathname === "/home") return "home";
  if (/^\/document\/[^/]+\/?$/.test(pathname)) return "editor";
  return null;
}

