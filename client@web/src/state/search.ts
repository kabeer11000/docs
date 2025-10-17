import { atom } from "nanostores";

export type SearchResultType =
  | "file"
  | "folder"
  | "template"
  | "client"
  | "action";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: SearchResultType;
  icon?: string;
  path?: string;
  tags?: string[];
  category?: string;
  onClick: () => void;
}

export interface SearchState {
  open: boolean;
  query: string;
  results: SearchResult[];
  currentPage: string;
  isSearching: boolean;
}

export const $searchOpen = atom<boolean>(false);
export const $searchQuery = atom<string>("");
export const $searchResults = atom<SearchResult[]>([]);
export const $currentPage = atom<string>("home");
export const $isSearching = atom<boolean>(false);

export const searchActions = {
  open: () => $searchOpen.set(true),
  close: () => {
    $searchOpen.set(false);
    $searchQuery.set("");
    $searchResults.set([]);
    $isSearching.set(false);
  },
  setQuery: (query: string) => {
    $searchQuery.set(query);
    $isSearching.set(query.length > 0);
  },
  setResults: (results: SearchResult[]) => $searchResults.set(results),
  setCurrentPage: (page: string) => $currentPage.set(page),
  setIsSearching: (searching: boolean) => $isSearching.set(searching),
};
