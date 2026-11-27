import {
  chart,
  heading,
  icon,
  kicker,
  p,
  pc,
  shape,
  slide,
  sq,
  text,
} from "./build";
import type { SlideTemplate } from "./types";

const DEEP = "#0A2B20";
const CARD = "#14493A";
const RIVER = ["#1E6B5A", "#2C8C73", "#7FE0A8"];
const CREAM = "#EAF4EE";
const SUN = "#F5C451";

/** Layered river bands across the bottom of the slide. */
const river = (id: string, top: number) =>
  RIVER.map((c, i) =>
    shape(`${id}-${i}`, "rounded", [-10 + i * 6, top + i * 7, 120, 40], c, {
      radius: 200,
      rotation: i % 2 ? 2 : -2,
    }),
  );

const program = (
  id: string,
  x: number,
  glyph: string,
  title: string,
  body: string,
) => [
  shape(`${id}-a`, "rounded", [x, 28, 27, 62], CARD, { radius: 24 }),
  shape(`${id}-b`, "circle", [x + 2.5, 33, 7, sq(7)], "accent"),
  icon(`${id}-c`, glyph, x + 4.1, 35.8, 3.8, DEEP, { strokeWidth: 1.75 }),
  text(`${id}-d`, [x + 2.5, 52, 22, 8], p(title), { font: "title", size: 34 }),
  text(`${id}-e`, [x + 2.5, 62, 22, 26], p(body), { size: 19, opacity: 0.8 }),
];

const tier = (
  id: string,
  x: number,
  amount: string,
  body: string,
  featured = false,
) => [
  shape(`${id}-a`, "rounded", [x, 26, 27, 60], featured ? "accent" : CARD, {
    radius: 24,
  }),
  text(`${id}-b`, [x + 2.5, 32, 22, 18], p(amount), {
    font: "title",
    size: 80,
    color: featured ? DEEP : "accent",
  }),
  text(`${id}-c`, [x + 2.5, 54, 22, 28], p(body), {
    size: 22,
    color: featured ? DEEP : "fg",
  }),
];

export const fundraiser: SlideTemplate = {
  id: "nonprofit-fundraiser",
  name: "Nonprofit Fundraiser",
  category: "Events",
  description:
    "Deep green charity appeal for a fundraising evening: layered river cover, the problem, programmes, impact chart, a volunteer story, giving tiers and a progress bar.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "forest",
    transition: "fade",
    slides: [
      slide({
        id: "fund-1",
        layout: "blank",
        notes:
          "Good evening and thank you for coming. Tonight is about one river, the Tamar, and what 250 thousand pounds can do for it in a year.",
        elements: [
          shape("fund-1-a", "circle", [74, 8, 14, sq(14)], SUN),
          ...river("fund-1-r", 62),
          kicker(
            "fund-1-b",
            [7.5, 12, 50, 5],
            "TAMAR RIVERKEEPERS / ANNUAL APPEAL",
          ),
          heading("fund-1-c", [7.5, 20, 60, 34], "Bring the river back.", 100),
          text(
            "fund-1-d",
            [7.5, 50, 50, 8],
            p("Fundraising dinner, Plymouth Guildhall, 6 March 2027"),
            { size: 24, opacity: 0.85 },
          ),
        ],
      }),
      slide({
        id: "fund-2",
        layout: "big-number",
        notes:
          "This is the number that started our charity. Three quarters of the river fails the basic standard for wildlife.",
        html: {
          stat: p("73%"),
          caption: p(
            "of the Tamar's monitored stretches fail to reach good ecological health, mostly because of run-off and sewage overflows.",
          ),
        },
        elements: [
          kicker("fund-2-a", [7.5, 7, 40, 5], "THE PROBLEM"),
          icon("fund-2-b", "triangle-alert", 85, 8, 6.5, SUN, {
            strokeWidth: 1.5,
          }),
        ],
      }),
      slide({
        id: "fund-3",
        layout: "blank",
        notes:
          "Three programmes. Most of the money tonight goes into the first one, because it works fastest.",
        elements: [
          heading("fund-3-a", [7.5, 8, 85, 10], "What we do"),
          ...program(
            "fund-3-b",
            7.5,
            "tree-pine",
            "Plant the banks",
            "Native trees and hedges on farm edges catch soil and slurry before it reaches the water.",
          ),
          ...program(
            "fund-3-c",
            36.5,
            "search",
            "Test every week",
            "Two hundred volunteers sample 64 sites and publish the results the same day.",
          ),
          ...program(
            "fund-3-d",
            65.5,
            "graduation-cap",
            "Teach the next keepers",
            "River days for 3,000 schoolchildren a year, from source to estuary.",
          ),
        ],
      }),
      slide({
        id: "fund-4",
        layout: "blank",
        notes:
          "Riverbank restored per year. The dip in 2021 was lockdown, when volunteers could not go out.",
        elements: [
          kicker("fund-4-a", [7.5, 12, 36, 5], "IMPACT SO FAR"),
          text("fund-4-b", [6.5, 18, 40, 22], p("41 km"), {
            font: "title",
            size: 130,
            color: "accent",
          }),
          text(
            "fund-4-c",
            [7.5, 44, 34, 14],
            p(
              "of riverbank restored since 2019, with 96,000 trees in the ground.",
            ),
            { size: 24 },
          ),
          text(
            "fund-4-d",
            [7.5, 64, 34, 18],
            p(
              "Otters returned to the upper Tamar in 2025 for the first time in 30 years.",
            ),
            {
              size: 22,
              color: SUN,
            },
          ),
          shape("fund-4-e", "rounded", [46, 10, 47, 80], CARD, { radius: 24 }),
          chart(
            "fund-4-f",
            "bar",
            [49, 16, 41, 68],
            ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"],
            [2, 4, 2.5, 5, 6, 6.5, 7, 8],
            "accent",
          ),
        ],
      }),
      slide({
        id: "fund-5",
        layout: "quote",
        background: CARD,
        notes:
          "Doreen has tested the same site at Gunnislake every Tuesday for six years. She is here tonight, table four.",
        html: {
          quote: p(
            "Six years ago I could not see the bottom. Last summer I watched a salmon jump right where I take my samples.",
          ),
          attribution: p("Doreen Pascoe, volunteer river tester since 2020"),
        },
      }),
      slide({
        id: "fund-6",
        layout: "blank",
        notes:
          "Three ways to give tonight. The middle one is the one most guests choose; it funds a whole school river day.",
        elements: [
          heading("fund-6-a", [7.5, 8, 85, 10], "What your gift does"),
          ...tier(
            "fund-6-b",
            7.5,
            "GBP 25",
            "Plants ten native trees on a riverbank, guards included.",
          ),
          ...tier(
            "fund-6-c",
            36.5,
            "GBP 150",
            "Gives a class of 30 children a full day on the river.",
            true,
          ),
          ...tier(
            "fund-6-d",
            65.5,
            "GBP 1,000",
            "Equips a new testing site for a year, kit and lab costs.",
          ),
        ],
      }),
      slide({
        id: "fund-7",
        layout: "blank",
        notes:
          "Update this live during the evening. We will announce the total before dessert.",
        elements: [
          kicker("fund-7-a", [7.5, 16, 40, 5], "TONIGHT'S GOAL"),
          heading(
            "fund-7-b",
            [7.5, 22, 85, 14],
            "GBP 148,000 raised of GBP 250,000",
            60,
          ),
          shape("fund-7-c", "rounded", [7.5, 48, 85, 12], CARD, { radius: 40 }),
          shape("fund-7-d", "rounded", [7.5, 48, 50.3, 12], "accent", {
            radius: 40,
          }),
          text("fund-7-e", [9.5, 50.5, 20, 7], p("59%"), {
            font: "title",
            size: 40,
            color: DEEP,
          }),
          icon("fund-7-f", "flag", 88, 36, 4, SUN, { strokeWidth: 2 }),
          text(
            "fund-7-g",
            [7.5, 68, 85, 12],
            p(
              "Every gift tonight is matched pound for pound by the Duchy Water Trust, up to GBP 50,000.",
            ),
            {
              size: 26,
            },
          ),
        ],
      }),
      slide({
        id: "fund-8",
        layout: "blank",
        notes:
          "Close with how to give, and a thank you. Card readers are on every table.",
        elements: [
          ...river("fund-8-r", 70),
          heading("fund-8-a", [7.5, 12, 60, 18], "Thank you.", 104),
          text(
            "fund-8-b",
            [7.5, 36, 50, 26],
            p(
              "Tap the card reader on your table, text RIVER to 70085 to give GBP 10, or visit tamarriverkeepers.org.uk/give",
            ),
            { size: 26 },
          ),
          shape("fund-8-c", "rounded", [64, 16, 28, 40], CREAM, { radius: 24 }),
          icon("fund-8-d", "hand-heart", 73, 22, 10, DEEP, {
            strokeWidth: 1.5,
          }),
          text("fund-8-e", [64, 44, 28, 8], pc("Registered charity 1187342"), {
            size: 16,
            color: DEEP,
          }),
        ],
      }),
    ],
  },
};
