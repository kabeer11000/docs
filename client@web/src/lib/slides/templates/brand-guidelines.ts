import {
  heading,
  icon,
  kicker,
  p,
  pc,
  shape,
  slide,
  sq,
  table,
  text,
} from "./build";
import type { SlideTemplate } from "./types";

const CLAY = "#C65D3B";
const CHAR = "#22201E";
const BONE = "#F2EDE4";
const SAGE = "#8FA58A";
const GLAZE = "#2F5D8A";
const WHITE = "#FFFFFF";

/** The Kiln mark: a clay arch over a charcoal base. `s` is the width in percent. */
const mark = (id: string, x: number, y: number, s: number) => [
  shape(`${id}-a`, "circle", [x, y, s, sq(s)], CLAY),
  shape(`${id}-b`, "rect", [x, y + sq(s) / 2, s, sq(s) / 2], CHAR),
  shape(
    `${id}-c`,
    "circle",
    [x + s * 0.3, y + sq(s) * 0.3, s * 0.4, sq(s * 0.4)],
    BONE,
  ),
];

const swatch = (
  id: string,
  x: number,
  w: number,
  fill: string,
  name: string,
  hex: string,
  fg: string,
) => [
  shape(`${id}-a`, "rect", [x, 24, w, 66], fill),
  text(`${id}-b`, [x + 1.5, 70, w - 3, 7], p(`<strong>${name}</strong>`), {
    size: 24,
    color: fg,
  }),
  text(`${id}-c`, [x + 1.5, 78, w - 3, 8], p(hex), {
    font: "mono",
    size: 18,
    color: fg,
  }),
];

const value = (
  id: string,
  x: number,
  glyph: string,
  name: string,
  body: string,
) => [
  shape(`${id}-a`, "circle", [x, 34, 7, sq(7)], BONE),
  icon(`${id}-b`, glyph, x + 1.6, 36.8, 3.8, CLAY, { strokeWidth: 1.75 }),
  text(`${id}-c`, [x, 56, 25, 8], p(`<strong>${name}</strong>`), { size: 28 }),
  text(`${id}-d`, [x, 65, 25, 24], p(body), { size: 20, opacity: 0.7 }),
];

export const brandGuidelines: SlideTemplate = {
  id: "brand-guidelines",
  name: "Brand Guidelines",
  category: "Business",
  description:
    "A complete brand book in nine slides: logo built from shapes, clear space, colour swatches, type specimen, voice table and applications.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "paper",
    transition: "fade",
    slides: [
      slide({
        id: "brand-1",
        layout: "blank",
        background: BONE,
        notes:
          "These guidelines cover everything a partner or freelancer needs. If something is not in here, ask the studio before improvising.",
        elements: [
          ...mark("brand-1-m", 64, 22, 24),
          kicker("brand-1-a", [7.5, 12, 40, 5], "KILN CERAMICS STUDIO", CLAY),
          heading("brand-1-b", [7.5, 26, 50, 30], "Brand guidelines", 96, {
            color: CHAR,
          }),
          text(
            "brand-1-c",
            [7.5, 62, 44, 12],
            p("Version 2.0. How we look, sound and show up."),
            {
              size: 26,
              color: CHAR,
              opacity: 0.75,
            },
          ),
          text("brand-1-d", [7.5, 86, 40, 5], p("Updated November 2026"), {
            font: "mono",
            size: 16,
            color: CHAR,
            opacity: 0.6,
          }),
        ],
      }),
      slide({
        id: "brand-2",
        layout: "blank",
        notes:
          "Everything else in this book follows from these three values. When in doubt, ask which option is most honest to the material.",
        elements: [
          kicker("brand-2-a", [7.5, 10, 40, 5], "01 / WHAT WE STAND FOR", CLAY),
          heading(
            "brand-2-b",
            [7.5, 15, 85, 12],
            "Made by hand, built to last, never precious",
          ),
          ...value(
            "brand-2-c",
            7.5,
            "hand-heart",
            "Handmade",
            "Every piece is thrown, trimmed and glazed by one of our six potters in Bristol.",
          ),
          ...value(
            "brand-2-d",
            37.5,
            "infinity",
            "Durable",
            "We design for daily use. Dishwasher safe, chip resistant, made to be handed down.",
          ),
          ...value(
            "brand-2-e",
            67.5,
            "smile",
            "Unfussy",
            "Pottery is for cereal and coffee, not glass cabinets. We keep the tone warm and plain.",
          ),
        ],
      }),
      slide({
        id: "brand-3",
        layout: "blank",
        notes:
          "Clear space is the height of the inner circle on every side. Minimum size is 24 pixels on screen, 10 millimetres in print.",
        elements: [
          kicker("brand-3-a", [7.5, 10, 40, 5], "02 / LOGO", CLAY),
          heading("brand-3-b", [7.5, 15, 40, 10], "The mark"),
          shape("brand-3-c", "rect", [10, 32, 32, sq(32) - 2], "none", {
            stroke: CLAY,
            strokeWidth: 2,
            opacity: 0.6,
          }),
          ...mark("brand-3-m", 16, 38, 20),
          text("brand-3-d", [10, 28, 32, 4], pc("clear space = inner circle"), {
            font: "mono",
            size: 14,
            color: CLAY,
          }),
          text("brand-3-e", [52, 32, 40, 8], p("<strong>Do</strong>"), {
            size: 26,
          }),
          text(
            "brand-3-f",
            [52, 39, 40, 18],
            p(
              "Use on Bone, White or Charcoal. Keep the arch on top. Scale proportionally.",
            ),
            { size: 21, opacity: 0.8 },
          ),
          text("brand-3-g", [52, 60, 40, 8], p("<strong>Do not</strong>"), {
            size: 26,
            color: CLAY,
          }),
          text(
            "brand-3-h",
            [52, 67, 40, 22],
            p(
              "Rotate it, outline it, add shadows, or place it on photos without a Bone panel behind.",
            ),
            { size: 21, opacity: 0.8 },
          ),
        ],
      }),
      slide({
        id: "brand-4",
        layout: "blank",
        notes:
          "Clay leads. Use it for one thing per layout: a headline, a button, a sticker. Charcoal and Bone do the heavy lifting.",
        elements: [
          kicker("brand-4-a", [7.5, 8, 40, 5], "03 / COLOUR", CLAY),
          heading(
            "brand-4-b",
            [7.5, 12, 85, 10],
            "Five colours from the studio floor",
            44,
          ),
          ...swatch("brand-4-c", 0, 28, CLAY, "Clay", "#C65D3B", WHITE),
          ...swatch("brand-4-d", 28, 18, CHAR, "Charcoal", "#22201E", WHITE),
          ...swatch("brand-4-e", 46, 18, BONE, "Bone", "#F2EDE4", CHAR),
          ...swatch("brand-4-f", 64, 18, SAGE, "Sage", "#8FA58A", CHAR),
          ...swatch("brand-4-g", 82, 18, GLAZE, "Glaze", "#2F5D8A", WHITE),
        ],
      }),
      slide({
        id: "brand-5",
        layout: "blank",
        notes:
          "One display face, one text face. Headlines are always sentence case. Mono is only for prices, glaze codes and dates.",
        elements: [
          kicker("brand-5-a", [7.5, 10, 40, 5], "04 / TYPE", CLAY),
          text("brand-5-b", [6, 16, 38, 60], p("Aa"), {
            font: "display",
            size: 300,
            color: CHAR,
          }),
          text(
            "brand-5-c",
            [7.5, 80, 36, 6],
            p("Display: Bricolage Grotesque, 700"),
            {
              font: "mono",
              size: 16,
              opacity: 0.6,
            },
          ),
          shape("brand-5-d", "rect", [48, 16, 0.3, 72], CHAR, { opacity: 0.2 }),
          text(
            "brand-5-e",
            [53, 18, 40, 14],
            p("Speckled stoneware, glazed by hand."),
            {
              font: "display",
              size: 44,
            },
          ),
          text(
            "brand-5-f",
            [53, 40, 40, 20],
            p(
              "Body copy is set in Figtree at 16 to 18 pixels on screen. Keep lines under 70 characters and paragraphs short.",
            ),
            { font: "sans", size: 22, opacity: 0.8 },
          ),
          text(
            "brand-5-g",
            [53, 66, 40, 6],
            p("GLAZE K-14 / GBP 38.00 / 03.2027"),
            {
              font: "mono",
              size: 20,
              color: CLAY,
            },
          ),
        ],
      }),
      slide({
        id: "brand-6",
        layout: "blank",
        notes:
          "Read the right column out loud. These are real lines we have cut from past newsletters.",
        elements: [
          kicker("brand-6-a", [7.5, 10, 40, 5], "05 / VOICE", CLAY),
          heading(
            "brand-6-b",
            [7.5, 15, 85, 10],
            "We sound like a potter, not a brand",
          ),
          ...table(
            "brand-6-c",
            [7.5, 30, 85],
            [2, 4, 4],
            [
              ["WE ARE", "WE SAY", "WE NEVER SAY"],
              [
                "Plain",
                "This mug holds a proper pint of tea.",
                "Elevate your daily ritual.",
              ],
              [
                "Warm",
                "Chipped it? Send it back, we will fix it.",
                "Per our returns policy...",
              ],
              [
                "Specific",
                "Fired at 1,260 degrees for 11 hours.",
                "Crafted with passion.",
              ],
            ],
            { rowH: 14, size: 22, band: BONE, head: CLAY },
          ),
        ],
      }),
      slide({
        id: "brand-7",
        layout: "blank",
        notes:
          "Two applications to show the system working together: the business card and a social tile. Templates for both are on the shared drive.",
        elements: [
          kicker("brand-7-a", [7.5, 10, 40, 5], "06 / IN USE", CLAY),
          heading("brand-7-b", [7.5, 15, 85, 10], "Applications"),
          shape("brand-7-c", "rounded", [7.5, 34, 40, 46], CHAR, {
            radius: 16,
            rotation: -4,
          }),
          ...mark("brand-7-m", 11, 40, 6),
          text(
            "brand-7-d",
            [11, 60, 32, 16],
            p("<strong>Nell Hardy</strong>", "Head potter, Kiln Bristol"),
            { size: 20, color: BONE, rotation: -4 },
          ),
          shape("brand-7-e", "rounded", [56, 28, 34, sq(34) - 4], CLAY, {
            radius: 16,
            rotation: 3,
          }),
          text(
            "brand-7-f",
            [59, 36, 28, 30],
            p("New glaze drop: Harbour Blue"),
            {
              font: "display",
              size: 46,
              color: WHITE,
              rotation: 3,
            },
          ),
          shape("brand-7-g", "circle", [78, 70, 9, sq(9)], GLAZE),
        ],
      }),
      slide({
        id: "brand-8",
        layout: "blank",
        background: CHAR,
        notes:
          "Point people to the asset folder and to Nell for anything unusual, like co-branding or packaging.",
        elements: [
          ...mark("brand-8-m", 7.5, 22, 14),
          heading(
            "brand-8-a",
            [32, 24, 60, 18],
            "Questions about the brand?",
            64,
            { color: BONE },
          ),
          text(
            "brand-8-b",
            [32, 50, 56, 20],
            p(
              "Logos, templates and fonts live in the Brand folder on the studio drive. For anything else, write to brand@kilnstudio.co.uk.",
            ),
            { size: 24, color: BONE, opacity: 0.8 },
          ),
        ],
      }),
    ],
  },
};
