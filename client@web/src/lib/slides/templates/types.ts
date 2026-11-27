import type { Deck } from "../model";

export type TemplateCategory =
  | "Business"
  | "Education"
  | "Creative"
  | "Events"
  | "Personal";

export interface SlideTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  deck: Deck;
}
