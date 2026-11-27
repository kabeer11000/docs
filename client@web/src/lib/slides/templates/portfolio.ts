import { chart, icon, p, pc, shape, slide, sq, text } from "./build";
import type { SlideTemplate } from "./types";

const PLUM = "#3A0F22";
const BLUSH = "#FFE9E2";
const WHITE = "#FFFFFF";

const client = (
  id: string,
  x: number,
  y: number,
  name: string,
  fill: string,
  ink: string,
) => [
  shape(`${id}-a`, "rounded", [x, y, 26, 24], fill, { radius: 18 }),
  text(`${id}-b`, [x, y + 8, 26, 8], pc(`<strong>${name}</strong>`), {
    font: "title",
    size: 30,
    color: ink,
  }),
];

export const portfolio: SlideTemplate = {
  id: "portfolio",
  name: "Designer Portfolio",
  category: "Creative",
  description:
    "Warm blush portfolio with a monogram cover, client wall, project case pages with drawn device mockups and a contact close.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "blush",
    transition: "slide",
    slides: [
      slide({
        id: "folio-1",
        layout: "blank",
        notes:
          "Introduce yourself in one sentence, then move on. The work should do the talking.",
        elements: [
          shape("folio-1-a", "circle", [-12, 16, 46, sq(46)], "accent"),
          text("folio-1-b", [-4, 45.5, 30, 22], p("MO"), {
            font: "title",
            size: 150,
            align: "center",
            color: BLUSH,
          }),
          text("folio-1-c", [44, 18, 40, 5], p("PORTFOLIO 2026"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("folio-1-d", [44, 26, 50, 28], p("Mira", "Okafor"), {
            font: "title",
            size: 88,
          }),
          shape("folio-1-e", "rect", [44, 60, 8, 0.8], "accent"),
          text(
            "folio-1-f",
            [44, 65, 46, 18],
            p(
              "Product designer in Lisbon. Seven years making complicated tools feel calm.",
            ),
            {
              size: 26,
            },
          ),
          shape("folio-1-g", "star", [88, 6, 6, sq(6)], "accent", {
            rotation: 14,
          }),
        ],
      }),
      slide({
        id: "folio-2",
        layout: "title-body",
        notes:
          "Keep this personal. Mention the move from architecture, it explains the systems thinking.",
        html: {
          title: p("Hello, I am Mira"),
          body: p(
            "I trained as an architect, then fell for software at a fintech start-up in Lagos. Since then I have designed banking apps, clinical dashboards and a map editor used by 2 million people.",
            "I care about <strong>clarity over cleverness</strong>, writing as a design tool, and shipping small things often.",
          ),
        },
        elements: [
          shape("folio-2-a", "star", [86, 8, 7, sq(7)], "accent", {
            rotation: -8,
          }),
        ],
      }),
      slide({
        id: "folio-3",
        layout: "blank",
        background: "pat-dots",
        notes:
          "A quick wall of clients. Point to the two projects we are about to look at: Tessel and Vela.",
        elements: [
          text("folio-3-a", [7.5, 8, 60, 10], p("Selected clients"), {
            font: "title",
            size: 52,
          }),
          ...client("folio-3-b", 7.5, 28, "Tessel Bank", "accent", WHITE),
          ...client("folio-3-c", 37, 28, "Fernway", PLUM, BLUSH),
          ...client("folio-3-d", 66.5, 28, "Kiln Studio", WHITE, PLUM),
          ...client("folio-3-e", 7.5, 58, "Parcelo", WHITE, PLUM),
          ...client("folio-3-f", 37, 58, "Vela Health", "accent", WHITE),
          ...client("folio-3-g", 66.5, 58, "Atlas Maps", PLUM, BLUSH),
        ],
      }),
      slide({
        id: "folio-4",
        layout: "blank",
        background: PLUM,
        notes:
          "Project one. A full redesign of onboarding for a challenger bank. Eight months, team of four.",
        elements: [
          text("folio-4-a", [7.5, 10, 50, 40], p("01"), {
            font: "title",
            size: 240,
            color: "accent",
          }),
          text("folio-4-b", [7.5, 56, 70, 12], p("Tessel Bank mobile app"), {
            font: "title",
            size: 60,
            color: BLUSH,
          }),
          text(
            "folio-4-c",
            [7.5, 70, 60, 10],
            p(
              "Lead designer. Onboarding, payments and card controls. 2024 to 2025.",
            ),
            {
              size: 24,
              color: BLUSH,
              opacity: 0.75,
            },
          ),
          shape("folio-4-d", "circle", [76, 50, 40, sq(40)], "accent", {
            opacity: 0.25,
          }),
        ],
      }),
      slide({
        id: "folio-5",
        layout: "blank",
        notes:
          "The headline result. We cut onboarding from 14 screens to 5 by moving identity checks to after the first deposit. Completion went from 18% to 58%.",
        elements: [
          text("folio-5-a", [7.5, 14, 40, 5], p("RESULT"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("folio-5-b", [7.5, 20, 46, 30], p("3.2x"), {
            font: "title",
            size: 200,
            color: "accent",
          }),
          text(
            "folio-5-c",
            [7.5, 56, 46, 30],
            p(
              "more customers finished onboarding after we cut the flow from <strong>14 screens to 5</strong>.",
            ),
            { size: 30 },
          ),
          shape("folio-5-d", "rounded", [66, 8, 19, 84], PLUM, { radius: 36 }),
          shape("folio-5-e", "rounded", [67.3, 11, 16.4, 78], WHITE, {
            radius: 26,
          }),
          shape("folio-5-f", "rounded", [69, 16, 13, 10], "accent", {
            radius: 10,
          }),
          shape("folio-5-g", "rounded", [69, 30, 13, 3], "#F4D6CC", {
            radius: 6,
          }),
          shape("folio-5-h", "rounded", [69, 36, 9, 3], "#F4D6CC", {
            radius: 6,
          }),
          shape("folio-5-i", "rounded", [69, 46, 13, 14], "#FBEDE8", {
            radius: 10,
          }),
          icon("folio-5-j", "circle-check", 73, 48.5, 5, "accent"),
          shape("folio-5-k", "rounded", [69, 76, 13, 7], PLUM, { radius: 20 }),
        ],
      }),
      slide({
        id: "folio-6",
        layout: "three-column",
        notes:
          "How I work, in three verbs. Give one concrete example for each from the Tessel project.",
        html: {
          title: p("How I work"),
          left: p(
            "<strong>Listen</strong>",
            "Twenty customer calls before the first sketch. I write the problem down until the team agrees on one sentence.",
          ),
          middle: p(
            "<strong>Shape</strong>",
            "Paper first, then clickable prototypes tested every Thursday with five real users.",
          ),
          right: p(
            "<strong>Ship</strong>",
            "I pair with engineers on the details and stay through launch, then measure what actually changed.",
          ),
        },
      }),
      slide({
        id: "folio-7",
        layout: "blank",
        notes:
          "Project two. Clinicians were juggling four systems during ward rounds. We built one screen that answers: who needs me next? Average round time dropped by 11 minutes.",
        elements: [
          text("folio-7-a", [7.5, 14, 30, 5], p("02 / VELA HEALTH"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text(
            "folio-7-b",
            [7.5, 21, 34, 30],
            p("One screen for the whole ward round."),
            { font: "title", size: 48 },
          ),
          text(
            "folio-7-c",
            [7.5, 56, 32, 30],
            p(
              "Clinician dashboard for 14 hospitals. Round times fell by 11 minutes per shift.",
            ),
            {
              size: 24,
            },
          ),
          shape("folio-7-d", "rounded", [46, 14, 47, 72], WHITE, {
            radius: 20,
          }),
          shape("folio-7-e", "rect", [46, 14, 47, 7], PLUM),
          shape("folio-7-f", "circle", [48, 15.8, 1.2, sq(1.2)], "accent"),
          shape("folio-7-g", "circle", [50, 15.8, 1.2, sq(1.2)], BLUSH),
          shape("folio-7-h", "rounded", [48, 25, 13, 57], "#FBEDE8", {
            radius: 10,
          }),
          shape("folio-7-i", "rounded", [49.5, 29, 10, 4], "accent", {
            radius: 6,
          }),
          shape("folio-7-j", "rounded", [49.5, 37, 8, 3], "#F4D6CC", {
            radius: 6,
          }),
          shape("folio-7-k", "rounded", [49.5, 43, 9, 3], "#F4D6CC", {
            radius: 6,
          }),
          shape("folio-7-l", "rounded", [49.5, 49, 7, 3], "#F4D6CC", {
            radius: 6,
          }),
          chart(
            "folio-7-m",
            "bar",
            [63, 25, 28, 57],
            ["Mon", "Tue", "Wed", "Thu", "Fri"],
            [42, 38, 35, 31, 29],
            "accent",
          ),
        ],
      }),
      slide({
        id: "folio-8",
        layout: "quote",
        notes:
          "Let the quote land. Tomas was the product lead at Tessel; he is happy to be a reference.",
        html: {
          quote: p(
            "Mira has a rare gift for making the hard parts of a product feel obvious in hindsight.",
          ),
          attribution: p("Tomas Lindqvist, VP Product, Tessel Bank"),
        },
      }),
      slide({
        id: "folio-9",
        layout: "blank",
        background: "grad-peach",
        notes:
          "Close with availability: open to full-time product roles from February 2027, remote or Lisbon.",
        elements: [
          shape("folio-9-a", "circle", [70, -30, 50, sq(50)], "accent"),
          shape("folio-9-b", "circle", [62, 60, 16, sq(16)], PLUM),
          text(
            "folio-9-c",
            [7.5, 24, 60, 30],
            p("Let us make something calm."),
            { font: "title", size: 72 },
          ),
          text("folio-9-d", [7.5, 64, 50, 6], p("mira@okafor.design"), {
            font: "mono",
            size: 28,
            color: "accent",
          }),
          text(
            "folio-9-e",
            [7.5, 72, 50, 6],
            p("Lisbon. Available from February 2027."),
            { size: 24 },
          ),
        ],
      }),
    ],
  },
};
