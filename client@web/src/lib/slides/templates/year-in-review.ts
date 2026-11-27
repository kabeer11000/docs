import {
  chart,
  heading,
  icon,
  kicker,
  ol,
  p,
  pc,
  shape,
  slide,
  sq,
  text,
} from "./build";
import type { SlideTemplate } from "./types";

const RUST = "#B4532A";
const INK = "#2A2118";
const PARCH = "#E8DCC6";
const OLIVE = "#6B7A3A";
const CREAM = "#F2EBDD";
const TILE = ["#B4532A", "#6B7A3A", "#2F5D8A", "#D9A441", "#2A2118", "#C47A8A"];

const tile = (
  id: string,
  i: number,
  glyph: string,
  value: string,
  label: string,
) => {
  const x = 7.5 + (i % 3) * 29;
  const y = 24 + Math.floor(i / 3) * 34;
  return [
    shape(`${id}-a`, "rounded", [x, y, 27, 30], TILE[i], { radius: 20 }),
    icon(`${id}-b`, glyph, x + 2, y + 4, 3, CREAM, { strokeWidth: 1.75 }),
    text(`${id}-c`, [x + 2, y + 10, 23, 12], p(value), {
      font: "title",
      size: 60,
      color: CREAM,
    }),
    text(`${id}-d`, [x + 2, y + 22, 23, 6], p(label), {
      size: 19,
      color: CREAM,
    }),
  ];
};

const month = (id: string, i: number, name: string, note: string) => {
  const x = 6 + i * 8;
  const up = i % 2 === 0;
  return [
    shape(
      `${id}-a`,
      "circle",
      [x + 2.6, 50.2, 2.4, sq(2.4)],
      note ? RUST : PARCH,
    ),
    text(`${id}-b`, [x, up ? 40 : 56, 8, 5], pc(name), {
      font: "mono",
      size: 15,
      color: "accent",
    }),
    ...(note
      ? [text(`${id}-c`, [x - 2, up ? 22 : 62, 12, 16], pc(note), { size: 15 })]
      : []),
  ];
};

const lesson = (
  id: string,
  x: number,
  n: string,
  title: string,
  body: string,
) => [
  text(`${id}-a`, [x, 26, 27, 16], p(n), {
    font: "title",
    size: 96,
    color: "accent",
  }),
  text(`${id}-b`, [x, 48, 27, 8], p(title), { font: "title", size: 34 }),
  text(`${id}-c`, [x, 58, 26, 30], p(body), { size: 20, opacity: 0.8 }),
];

export const yearInReview: SlideTemplate = {
  id: "year-in-review",
  name: "Year in Review",
  category: "Personal",
  description:
    "A warm personal recap of the year: big-year cover, numbers as colour tiles, a month-by-month timeline, favourites, a running chart, lessons and next year's goals.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "sand",
    transition: "fade",
    slides: [
      slide({
        id: "yir-1",
        layout: "blank",
        notes:
          "My year, for the family dinner on New Year's Eve. Ten minutes, then you all have to share yours.",
        elements: [
          text("yir-1-a", [4, 8, 92, 60], p("2026"), {
            font: "title",
            size: 330,
            color: "accent",
          }),
          shape("yir-1-b", "rect", [7.5, 70, 85, 0.4], INK),
          text("yir-1-c", [7.5, 74, 50, 10], p("A year in review"), {
            font: "title",
            size: 48,
          }),
          text("yir-1-d", [62, 76, 30.5, 6], p("by Sam Okoro"), {
            size: 26,
            align: "right",
            opacity: 0.7,
          }),
        ],
      }),
      slide({
        id: "yir-2",
        layout: "blank",
        notes:
          "The headline numbers. The half marathon is the one I am proudest of.",
        elements: [
          heading("yir-2-a", [7.5, 8, 85, 10], "The year in numbers"),
          ...tile("yir-2-b", 0, "book-open", "31", "books finished"),
          ...tile(
            "yir-2-c",
            1,
            "activity",
            "1,204 km",
            "run, including one half marathon",
          ),
          ...tile("yir-2-d", 2, "plane", "6", "new cities, 3 new countries"),
          ...tile(
            "yir-2-e",
            3,
            "utensils",
            "52",
            "Sunday dinners cooked from scratch",
          ),
          ...tile(
            "yir-2-f",
            4,
            "camera",
            "4,890",
            "photos, about 40 good ones",
          ),
          ...tile("yir-2-g", 5, "heart", "1", "niece, born in September"),
        ],
      }),
      slide({
        id: "yir-3",
        layout: "blank",
        notes:
          "Month by month. Not every month had a headline, and that is fine.",
        elements: [
          heading("yir-3-a", [7.5, 8, 85, 10], "Month by month"),
          shape("yir-3-b", "rect", [5, 51.2, 90, 0.4], INK, { opacity: 0.5 }),
          ...[
            ["JAN", "Started the couch to 5k"],
            ["FEB", ""],
            ["MAR", "Moved into the new flat"],
            ["APR", "Lisbon with Ade"],
            ["MAY", "Promoted to team lead"],
            ["JUN", ""],
            ["JUL", "Two weeks in Japan"],
            ["AUG", "Learned to make bread"],
            ["SEP", "Became an auntie"],
            ["OCT", "Half marathon, 2h 04m"],
            ["NOV", ""],
            ["DEC", "Home for Christmas"],
          ].flatMap(([m, note], i) => month(`yir-3-m${i}`, i, m, note)),
        ],
      }),
      slide({
        id: "yir-4",
        layout: "blank",
        notes: "Favourites. Happy to lend any of the books.",
        elements: [
          kicker("yir-4-a", [7.5, 10, 40, 5], "FAVOURITES"),
          heading(
            "yir-4-b",
            [7.5, 15, 85, 10],
            "The best things I read and heard",
          ),
          icon("yir-4-c", "book", 7.5, 32, 3.5, "accent", {
            strokeWidth: 1.75,
          }),
          icon("yir-4-d", "headphones", 52, 32, 3.5, "accent", {
            strokeWidth: 1.75,
          }),
          text("yir-4-e", [13, 32.5, 34, 6], p("<strong>Books</strong>"), {
            size: 28,
          }),
          text("yir-4-f", [57.5, 32.5, 34, 6], p("<strong>Albums</strong>"), {
            size: 28,
          }),
          text(
            "yir-4-g",
            [7.5, 44, 40, 46],
            ol(
              "Tomorrow, and Tomorrow, and Tomorrow",
              "The Ministry of Time",
              "Small Things Like These",
              "Braiding Sweetgrass",
              "James",
            ),
            { size: 22 },
          ),
          text(
            "yir-4-h",
            [52, 44, 40, 46],
            ol(
              "Mira Vale, Static Bloom",
              "Little Simz, Lotus",
              "Nala Sinephro, Endlessness",
              "Fontaines D.C., Romance",
              "Ezra Collective, Dance, No One's Watching",
            ),
            {
              size: 22,
            },
          ),
        ],
      }),
      slide({
        id: "yir-5",
        layout: "blank",
        notes:
          "Running by month. You can see exactly when I started training for the half, and the week after it.",
        elements: [
          kicker("yir-5-a", [7.5, 12, 36, 5], "ON THE ROAD"),
          heading(
            "yir-5-b",
            [7.5, 18, 34, 30],
            "From 5k to a half marathon",
            52,
          ),
          text(
            "yir-5-c",
            [7.5, 52, 32, 30],
            p(
              "Kilometres run each month. October was race month, November was mostly the sofa.",
            ),
            {
              size: 22,
              opacity: 0.8,
            },
          ),
          shape("yir-5-d", "rounded", [44, 10, 49, 80], PARCH, { radius: 24 }),
          chart(
            "yir-5-e",
            "bar",
            [47, 16, 43, 68],
            ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
            [32, 48, 60, 74, 90, 102, 96, 130, 158, 176, 54, 84],
            RUST,
          ),
        ],
      }),
      slide({
        id: "yir-6",
        layout: "blank",
        background: OLIVE,
        notes: "The best day of the year, no contest.",
        elements: [
          kicker("yir-6-a", [7.5, 14, 40, 5], "THE BEST DAY", CREAM),
          heading(
            "yir-6-b",
            [7.5, 24, 70, 36],
            "14 September. Meeting Ifeoma for the first time.",
            76,
            { color: CREAM },
          ),
          text(
            "yir-6-c",
            [7.5, 68, 60, 14],
            p(
              "Three point two kilograms of opinions. She already runs the family group chat.",
            ),
            {
              size: 26,
              color: CREAM,
            },
          ),
          icon("yir-6-d", "heart", 82, 66, 10, CREAM, { strokeWidth: 1.25 }),
        ],
      }),
      slide({
        id: "yir-7",
        layout: "blank",
        notes:
          "Three things the year taught me. The second one took the longest.",
        elements: [
          heading("yir-7-a", [7.5, 8, 85, 10], "What I learned"),
          ...lesson(
            "yir-7-b",
            7.5,
            "01",
            "Small and often",
            "Ten minutes a day got me further than any big plan ever did.",
          ),
          ...lesson(
            "yir-7-c",
            36.5,
            "02",
            "Say no sooner",
            "Every yes to something I did not want was a no to a Sunday dinner.",
          ),
          ...lesson(
            "yir-7-d",
            65.5,
            "03",
            "Write it down",
            "I kept a one-line diary all year. This deck would not exist without it.",
          ),
        ],
      }),
      slide({
        id: "yir-8",
        layout: "blank",
        notes:
          "Five goals for next year. You are all allowed to check in on me in June.",
        elements: [
          kicker("yir-8-a", [7.5, 12, 36, 5], "NEXT YEAR"),
          heading("yir-8-b", [7.5, 18, 34, 40], "Five goals for 2027", 64),
          ...[
            "Run a full marathon",
            "Read 30 books, at least 10 in translation",
            "Visit Ifeoma once a month",
            "Take a pottery class",
            "Save for a trip to Lagos",
          ].flatMap((g, i) => [
            shape(
              `yir-8-c${i}`,
              "rounded",
              [50, 16 + i * 14.5, 3.2, sq(3.2)],
              "none",
              { stroke: INK, strokeWidth: 2.5, radius: 6 },
            ),
            text(`yir-8-d${i}`, [55.5, 16.4 + i * 14.5, 38, 7], p(g), {
              size: 26,
            }),
          ]),
        ],
      }),
      slide({
        id: "yir-9",
        layout: "blank",
        background: RUST,
        notes: "Raise a glass. Your turn.",
        elements: [
          icon("yir-9-a", "wine", 46, 16, 8, CREAM, { strokeWidth: 1.5 }),
          text("yir-9-b", [10, 42, 80, 16], pc("Here's to 2027."), {
            font: "title",
            size: 104,
            color: CREAM,
          }),
          text("yir-9-c", [10, 64, 80, 6], pc("Now tell me about yours."), {
            size: 28,
            color: CREAM,
          }),
        ],
      }),
    ],
  },
};
