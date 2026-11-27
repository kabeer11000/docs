import { annualReport } from "./annual-report";
import { caseStudy } from "./case-study";
import { lecture } from "./lecture";
import { minimalKeynote } from "./minimal-keynote";
import { pitchDeck } from "./pitch-deck";
import { portfolio } from "./portfolio";
import { productLaunch } from "./product-launch";
import { quarterlyReview } from "./quarterly-review";
import { startupOnePager } from "./startup-one-pager";
import { travelStory } from "./travel-story";
import type { SlideTemplate, TemplateCategory } from "./types";
import { wedding } from "./wedding";
import { workshop } from "./workshop";

export type { SlideTemplate, TemplateCategory } from "./types";

/** Gallery order: most striking first. */
export const TEMPLATES: SlideTemplate[] = [
  pitchDeck,
  productLaunch,
  portfolio,
  caseStudy,
  travelStory,
  quarterlyReview,
  wedding,
  startupOnePager,
  minimalKeynote,
  annualReport,
  lecture,
  workshop,
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Business",
  "Creative",
  "Education",
  "Events",
  "Personal",
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
