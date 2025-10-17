import { map } from "nanostores";

export interface DocumentPage {
  id: string;
  content: any; // Quill Delta format
  format: "A4" | "Letter" | "Legal" | "Tabloid";
  pageNumber: number;
}

export interface LegalDocument {
  id: string;
  title: string;
  pages: DocumentPage[];
  currentPage: number;
  wordCount: number;
  lastSaved: Date;
}

export const $documentStore = map<LegalDocument>({
  id: Date.now().toString(),
  title: "Untitled Document",
  pages: [
    {
      id: "page-1",
      content: { ops: [] },
      format: "A4",
      pageNumber: 1,
    },
  ],
  currentPage: 0,
  wordCount: 0,
  lastSaved: new Date(),
});

// Actions
export function addPage(format: "A4" | "Letter" | "Legal" | "Tabloid" = "A4") {
  const state = $documentStore.get();
  const newPage: DocumentPage = {
    id: `page-${Date.now()}`,
    content: { ops: [] },
    format: format,
    pageNumber: state.pages.length + 1,
  };

  $documentStore.setKey("pages", [...state.pages, newPage]);
}

export function updatePageContent(pageId: string, content: any) {
  const state = $documentStore.get();
  const updatedPages = state.pages.map((page) =>
    page.id === pageId ? { ...page, content } : page,
  );

  $documentStore.setKey("pages", updatedPages);
}
export function switchPage(pageIndex: number) {
  $documentStore.setKey("currentPage", pageIndex);
}
