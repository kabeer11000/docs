import { $documents } from "@/state/cloudstore-data";

// Set by <LinkedFrom /> so the editor extension can use the app router and the current document.
export const docLinkActions = {
  currentId: "",
  navigate: (href: string) => window.location.assign(href),
  create: async (_input: { id: string; title: string }): Promise<boolean> => false,
};

export const liveTitle = (id: string, fallback: string) => $documents.get().find((d) => d.id === id)?.title || fallback;
