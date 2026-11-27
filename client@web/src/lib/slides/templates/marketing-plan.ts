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
  table,
  text,
  ul,
} from "./build";
import type { SlideTemplate } from "./types";

const INK = "#121418";
const BLUE = "#3B5BFD";
const CREAM = "#FFF6C7";
const WHITE = "#FFFFFF";

const goal = (id: string, x: number, value: string, label: string) => [
  text(`${id}-a`, [x, 30, 27, 20], p(value), {
    font: "title",
    size: 110,
    color: "accent",
  }),
  shape(`${id}-b`, "rect", [x, 54, 27, 0.6], INK),
  text(`${id}-c`, [x, 58, 25, 22], p(label), { size: 24 }),
];

const stage = (
  id: string,
  y: number,
  w: number,
  name: string,
  value: string,
  fill: string,
  fg: string,
) => [
  shape(`${id}-a`, "rounded", [50 - w / 2, y, w, 13], fill, { radius: 14 }),
  text(
    `${id}-b`,
    [50 - w / 2 + 2, y + 3.5, w / 2, 7],
    p(`<strong>${name}</strong>`),
    {
      size: 24,
      color: fg,
    },
  ),
  text(`${id}-c`, [50, y + 3.5, w / 2 - 2, 7], p(value), {
    size: 24,
    align: "right",
    color: fg,
  }),
];

const milestone = (
  id: string,
  x: number,
  month: string,
  label: string,
  up: boolean,
) => [
  shape(`${id}-a`, "circle", [x - 1.4, 52.5, 2.8, sq(2.8)], up ? BLUE : INK),
  text(`${id}-b`, [x - 8, up ? 28 : 64, 16, 6], pc(month), {
    font: "mono",
    size: 18,
    color: "accent",
  }),
  text(`${id}-c`, [x - 8, up ? 34 : 70, 16, 14], pc(label), { size: 20 }),
];

export const marketingPlan: SlideTemplate = {
  id: "marketing-plan",
  name: "Marketing Plan",
  category: "Business",
  description:
    "Loud lemon campaign plan: goals as giant numbers, personas, a funnel, channel mix, a launch timeline and the budget.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "lemon",
    transition: "slide",
    slides: [
      slide({
        id: "mkt-1",
        layout: "blank",
        notes:
          "This is the plan for the spring launch of Grainhouse Barista. One product, one city first, then national.",
        elements: [
          shape("mkt-1-a", "circle", [60, 8, 44, sq(44)], BLUE),
          shape("mkt-1-b", "circle", [52, 52, 20, sq(20)], WHITE),
          icon("mkt-1-c", "coffee", 75, 30, 14, WHITE, { strokeWidth: 1.25 }),
          kicker("mkt-1-d", [7.5, 12, 40, 5], "GRAINHOUSE / SPRING 2027"),
          heading(
            "mkt-1-e",
            [7, 22, 56, 42],
            "Marketing plan: Barista launch",
            92,
          ),
          text(
            "mkt-1-f",
            [7.5, 74, 44, 12],
            p(
              "From zero to the oat milk every Manchester cafe asks for by name.",
            ),
            { size: 26 },
          ),
        ],
      }),
      slide({
        id: "mkt-2",
        layout: "blank",
        notes:
          "Three goals, all measurable by the end of June. Cafe listings is the one that matters most: shoppers follow baristas.",
        elements: [
          kicker("mkt-2-a", [7.5, 10, 40, 5], "GOALS BY 30 JUNE"),
          heading("mkt-2-b", [7.5, 15, 85, 10], "What success looks like"),
          ...goal(
            "mkt-2-c",
            7.5,
            "400",
            "independent cafes pouring Barista in Greater Manchester",
          ),
          ...goal(
            "mkt-2-d",
            37,
            "12%",
            "aided brand awareness among 25 to 40 year olds in the North West",
          ),
          ...goal(
            "mkt-2-e",
            66.5,
            "35k",
            "retail units a month through Co-op and Booths",
          ),
        ],
      }),
      slide({
        id: "mkt-3",
        layout: "blank",
        notes:
          "Two people we design every touchpoint for. Theo buys it, Amira recommends it.",
        elements: [
          heading("mkt-3-a", [7.5, 8, 85, 10], "Who we are talking to"),
          shape("mkt-3-b", "rounded", [7.5, 24, 41, 66], CREAM, { radius: 24 }),
          shape("mkt-3-c", "rounded", [51.5, 24, 41, 66], INK, { radius: 24 }),
          shape("mkt-3-d", "circle", [11, 30, 8, sq(8)], BLUE),
          shape("mkt-3-e", "circle", [55, 30, 8, sq(8)], "accent"),
          text("mkt-3-f", [11, 34.5, 8, 6], pc("TH"), {
            font: "title",
            size: 30,
            color: WHITE,
          }),
          text("mkt-3-g", [55, 34.5, 8, 6], pc("AM"), {
            font: "title",
            size: 30,
            color: WHITE,
          }),
          text(
            "mkt-3-h",
            [21, 31, 26, 12],
            p("<strong>Theo, 31</strong>", "The flat white regular"),
            {
              size: 22,
            },
          ),
          text(
            "mkt-3-i",
            [65, 31, 26, 12],
            p("<strong>Amira, 27</strong>", "Head barista, Northern Quarter"),
            { size: 22, color: WHITE },
          ),
          text(
            "mkt-3-j",
            [11, 50, 34, 38],
            ul(
              "Buys coffee out five days a week",
              "Switched to oat for taste, not ethics",
              "Notices what the cafe uses and buys it for home",
            ),
            { size: 20 },
          ),
          text(
            "mkt-3-k",
            [55, 50, 34, 38],
            ul(
              "Judges milk on microfoam and latte art",
              "Hates splitting and flat texture",
              "Trusted voice for 6k followers in the scene",
            ),
            { size: 20, color: WHITE },
          ),
        ],
      }),
      slide({
        id: "mkt-4",
        layout: "blank",
        notes:
          "Planning funnel for the 12 weeks. Repeat purchase is the number finance will watch, so is the one we report weekly.",
        elements: [
          heading("mkt-4-a", [7.5, 8, 85, 10], "The funnel we are buying"),
          ...stage("mkt-4-b", 24, 84, "Reach", "2.4M people", INK, WHITE),
          ...stage("mkt-4-c", 40, 66, "Sample a cup", "180,000", BLUE, WHITE),
          ...stage("mkt-4-d", 56, 48, "First purchase", "52,000", WHITE, INK),
          ...stage("mkt-4-e", 72, 32, "Repeat", "21,000", CREAM, INK),
        ],
      }),
      slide({
        id: "mkt-5",
        layout: "blank",
        notes:
          "Over half of the budget goes into cafes and sampling. Paid social is there to amplify what baristas post, not to carry the launch.",
        elements: [
          kicker("mkt-5-a", [7.5, 12, 40, 5], "CHANNEL MIX"),
          heading(
            "mkt-5-b",
            [7.5, 18, 38, 22],
            "Cafes first, screens second",
            52,
          ),
          text(
            "mkt-5-c",
            [7.5, 46, 36, 40],
            ul(
              "Barista kits and training in 400 cafes",
              "Street sampling at 30 commuter stops",
              "Creator partnerships with 25 baristas",
              "Paid social retargeting on sampled postcodes",
            ),
            { size: 22 },
          ),
          shape("mkt-5-d", "rounded", [50, 10, 43, 80], WHITE, { radius: 28 }),
          chart(
            "mkt-5-e",
            "pie",
            [52, 16, 39, 68],
            [
              "Cafe programme",
              "Sampling",
              "Creators",
              "Paid social",
              "Out of home",
            ],
            [34, 22, 16, 18, 10],
            "accent",
          ),
        ],
      }),
      slide({
        id: "mkt-6",
        layout: "blank",
        notes:
          "Twelve weeks, five beats. The cafe programme starts a month before anything consumer-facing so the product is there when people look for it.",
        elements: [
          heading("mkt-6-a", [7.5, 8, 85, 10], "Twelve weeks, five beats"),
          shape("mkt-6-b", "rect", [7.5, 53.6, 85, 0.6], INK),
          ...milestone(
            "mkt-6-c",
            14,
            "FEB 3",
            "Cafe kits ship to the first 150",
            true,
          ),
          ...milestone(
            "mkt-6-d",
            32,
            "MAR 2",
            "Barista creator content goes live",
            false,
          ),
          ...milestone(
            "mkt-6-e",
            50,
            "MAR 16",
            "Street sampling, 30 stops",
            true,
          ),
          ...milestone(
            "mkt-6-f",
            68,
            "APR 6",
            "Retail launch in Co-op and Booths",
            false,
          ),
          ...milestone(
            "mkt-6-g",
            86,
            "MAY 18",
            "Latte art throwdown finale",
            true,
          ),
        ],
      }),
      slide({
        id: "mkt-7",
        layout: "blank",
        notes:
          "Total ask is 640k. Sampling is the most expensive line per head but converts at three times paid social.",
        elements: [
          heading("mkt-7-a", [7.5, 8, 60, 10], "Budget"),
          text("mkt-7-b", [62, 6, 31, 12], p("GBP 640k"), {
            font: "title",
            size: 64,
            color: "accent",
            align: "right",
          }),
          ...table(
            "mkt-7-c",
            [7.5, 24, 85],
            [4, 2, 2, 3],
            [
              ["LINE", "GBP", "SHARE", "KPI"],
              ["Cafe programme", "218k", "34%", "400 listings"],
              ["Street sampling", "141k", "22%", "180k cups"],
              ["Creator partnerships", "102k", "16%", "9M views"],
              ["Paid social", "115k", "18%", "GBP 4 per trial"],
              ["Out of home", "64k", "10%", "1.1M reach"],
            ],
            { rowH: 10.5, size: 22, band: CREAM },
          ),
        ],
      }),
      slide({
        id: "mkt-8",
        layout: "blank",
        background: BLUE,
        notes:
          "This is the campaign line. Everything, from cafe chalkboards to the bus stops, ends on it.",
        elements: [
          kicker("mkt-8-a", [7.5, 12, 40, 5], "THE BIG IDEA", "#FFE45C"),
          heading("mkt-8-b", [7, 22, 86, 40], "Pour it on.", 210, {
            color: WHITE,
          }),
          text(
            "mkt-8-c",
            [7.5, 70, 60, 14],
            p(
              "Oat milk that foams like the real thing, made for the people who pour it all day.",
            ),
            { size: 28, color: WHITE },
          ),
          shape("mkt-8-d", "star", [80, 64, 12, sq(12)], "#FFE45C", {
            rotation: 12,
          }),
        ],
      }),
      slide({
        id: "mkt-9",
        layout: "blank",
        notes:
          "Sign-off needed on the budget this week so the cafe kits can go to print.",
        elements: [
          heading("mkt-9-a", [7.5, 10, 50, 22], "Next steps", 72),
          text(
            "mkt-9-b",
            [7.5, 36, 46, 50],
            ul(
              "Budget sign-off, Friday 12 December",
              "Kit design to print, 5 January",
              "Creator contracts signed, 19 January",
              "Weekly dashboard live from launch day",
            ),
            { size: 26 },
          ),
          shape("mkt-9-c", "rounded", [60, 14, 33, 72], INK, { radius: 28 }),
          icon("mkt-9-d", "mail", 64, 22, 6, "#FFE45C", { strokeWidth: 1.5 }),
          text(
            "mkt-9-e",
            [64, 40, 26, 30],
            p(
              "<strong>Questions?</strong>",
              "Hollie Grant, Brand Lead",
              "hollie@grainhouse.co.uk",
            ),
            { size: 22, color: WHITE },
          ),
        ],
      }),
    ],
  },
};
