import type { IQuickAccessCollections } from "@shared-types";
import { atom } from "nanostores";

export const $quickAccessCollections = atom<
  IQuickAccessCollections & { loaded: boolean }
>({
  title: "",
  items: [],
  loaded: false,
});

export const $documentCreatorState = atom<
  {
    items: Array<{
      id: string;
      title: string;
      description: string;
      category: string;
      tags: string[];
    }>;
  } & { loaded: boolean }
>({
  loaded: false,
  items: [],
});
