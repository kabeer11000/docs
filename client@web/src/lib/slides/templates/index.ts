import { albumLaunch } from "./album-launch";
import { allHands } from "./all-hands";
import { annualReport } from "./annual-report";
import { birthdayParty } from "./birthday-party";
import { boardUpdate } from "./board-update";
import { brandGuidelines } from "./brand-guidelines";
import { caseStudy } from "./case-study";
import { conferenceTalk } from "./conference-talk";
import { filmPitch } from "./film-pitch";
import { fundraiser } from "./fundraiser";
import { hiring } from "./hiring";
import { historyTimeline } from "./history-timeline";
import { investorUpdate } from "./investor-update";
import { languageLesson } from "./language-lesson";
import { lecture } from "./lecture";
import { marketingPlan } from "./marketing-plan";
import { minimalKeynote } from "./minimal-keynote";
import { photoPortfolio } from "./photo-portfolio";
import { pitchDeck } from "./pitch-deck";
import { portfolio } from "./portfolio";
import { productLaunch } from "./product-launch";
import { quarterlyReview } from "./quarterly-review";
import { salesKickoff } from "./sales-kickoff";
import { scienceFair } from "./science-fair";
import { startupOnePager } from "./startup-one-pager";
import { syllabus } from "./syllabus";
import { travelStory } from "./travel-story";
import type { SlideTemplate, TemplateCategory } from "./types";
import { wedding } from "./wedding";
import { workshop } from "./workshop";
import { yearInReview } from "./year-in-review";

export type { SlideTemplate, TemplateCategory } from "./types";

/** Gallery order: most striking first, categories interleaved. */
export const TEMPLATES: SlideTemplate[] = [
  pitchDeck,
  productLaunch,
  albumLaunch,
  portfolio,
  salesKickoff,
  birthdayParty,
  caseStudy,
  filmPitch,
  travelStory,
  marketingPlan,
  quarterlyReview,
  historyTimeline,
  wedding,
  photoPortfolio,
  investorUpdate,
  conferenceTalk,
  startupOnePager,
  allHands,
  fundraiser,
  brandGuidelines,
  yearInReview,
  minimalKeynote,
  scienceFair,
  boardUpdate,
  languageLesson,
  hiring,
  annualReport,
  syllabus,
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
