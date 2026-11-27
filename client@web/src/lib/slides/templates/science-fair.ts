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
} from "./build";
import type { SlideTemplate } from "./types";

const INK = "#121418";
const GREEN = "#0E9F6E";
const APPLE = "#FFF3D6";
const MINT = "#DDF7EA";
const LEMON = "#FFE45C";

/** A cut apple slice: skin ring, flesh, and a few seeds. */
const slice = (id: string, x: number, y: number, s: number, flesh: string) => [
  shape(`${id}-a`, "circle", [x, y, s, sq(s)], "#E5484D"),
  shape(
    `${id}-b`,
    "circle",
    [x + s * 0.06, y + sq(s) * 0.06, s * 0.88, sq(s * 0.88)],
    flesh,
  ),
  shape(
    `${id}-c`,
    "circle",
    [x + s * 0.42, y + sq(s) * 0.36, s * 0.07, sq(s * 0.1)],
    "#3A2A1A",
  ),
  shape(
    `${id}-d`,
    "circle",
    [x + s * 0.51, y + sq(s) * 0.52, s * 0.07, sq(s * 0.1)],
    "#3A2A1A",
  ),
];

const step = (id: string, x: number, n: string, body: string) => [
  shape(`${id}-a`, "rounded", [x, 28, 20, 60], "bg", {
    radius: 18,
    stroke: INK,
    strokeWidth: 3,
  }),
  text(`${id}-b`, [x + 2, 31, 16, 14], p(n), {
    font: "title",
    size: 72,
    color: "accent",
  }),
  text(`${id}-c`, [x + 2, 50, 16, 36], p(body), { size: 21 }),
];

export const scienceFair: SlideTemplate = {
  id: "science-fair",
  name: "Science Fair Project",
  category: "Education",
  description:
    "Playful graph-paper science project: question and hypothesis, materials, a four-step method, results chart, data table and conclusion.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "paper",
    transition: "slide",
    slides: [
      slide({
        id: "sci-1",
        layout: "blank",
        background: "pat-grid",
        notes:
          "Hi, I am Maya. My project tested which kitchen liquid stops cut apples from going brown. I tested five, and the answer surprised me.",
        elements: [
          ...slice("sci-1-s1", 62, 10, 26, APPLE),
          ...slice("sci-1-s2", 76, 50, 18, "#E9C79A"),
          ...slice("sci-1-s3", 58, 62, 12, "#C9965E"),
          kicker("sci-1-a", [7.5, 12, 50, 5], "SCIENCE FAIR 2027 / CHEMISTRY"),
          heading(
            "sci-1-b",
            [7, 22, 52, 40],
            "What stops an apple going brown?",
            76,
          ),
          text(
            "sci-1-c",
            [7.5, 70, 46, 14],
            p("<strong>Maya Chen</strong>, Year 7, Oakfield School"),
            {
              size: 26,
            },
          ),
        ],
      }),
      slide({
        id: "sci-2",
        layout: "blank",
        notes:
          "I guessed lemon juice would win because my grandma always puts it on fruit salad.",
        elements: [
          shape("sci-2-a", "rounded", [7.5, 12, 41, 76], INK, { radius: 28 }),
          shape("sci-2-b", "rounded", [51.5, 12, 41, 76], LEMON, {
            radius: 28,
          }),
          text("sci-2-c", [11, 16, 20, 20], p("?"), {
            font: "title",
            size: 140,
            color: "accent",
          }),
          icon("sci-2-d", "lightbulb", 55, 20, 7, INK, { strokeWidth: 1.75 }),
          kicker("sci-2-e", [11, 44, 30, 5], "QUESTION", "accent"),
          kicker("sci-2-f", [55, 44, 30, 5], "HYPOTHESIS", INK),
          text(
            "sci-2-g",
            [11, 51, 34, 34],
            p(
              "Which kitchen liquid keeps cut apple slices from turning brown the longest?",
            ),
            {
              size: 30,
              color: "#FFFFFF",
            },
          ),
          text(
            "sci-2-h",
            [55, 51, 34, 34],
            p(
              "Lemon juice will work best, because it is acidic and slows the browning reaction.",
            ),
            {
              size: 30,
              color: INK,
            },
          ),
        ],
      }),
      slide({
        id: "sci-3",
        layout: "blank",
        background: "pat-grid",
        notes:
          "Everything came from our kitchen. The only thing I bought was a second bag of apples.",
        elements: [
          heading("sci-3-a", [7.5, 8, 85, 10], "Materials"),
          ...[
            ["leaf", "18 slices of Gala apple"],
            ["utensils", "A knife and a cutting board"],
            ["layout-grid", "6 identical plates"],
            ["sun", "Lemon juice, salt water, honey water"],
            ["waves", "Plain tap water as a control"],
            ["timer", "A timer and a phone camera"],
          ].flatMap(([g, label], i) => {
            const x = 7.5 + (i % 3) * 29.5;
            const y = 26 + Math.floor(i / 3) * 32;
            return [
              shape(`sci-3-b${i}`, "rounded", [x, y, 27, 26], "bg", {
                radius: 16,
                stroke: INK,
                strokeWidth: 2,
              }),
              icon(`sci-3-c${i}`, g, x + 2, y + 4, 3.5, "accent", {
                strokeWidth: 2,
              }),
              text(`sci-3-d${i}`, [x + 2, y + 13, 23, 12], p(label), {
                size: 21,
              }),
            ];
          }),
        ],
      }),
      slide({
        id: "sci-4",
        layout: "blank",
        notes:
          "I used three slices per liquid so one odd slice would not change the result. Same apple, same time, same room.",
        elements: [
          heading("sci-4-a", [7.5, 8, 85, 10], "Method"),
          ...step(
            "sci-4-b",
            7.5,
            "1",
            "Cut one apple into 18 equal slices at the same time.",
          ),
          ...step(
            "sci-4-c",
            29,
            "2",
            "Dip three slices in each liquid for 30 seconds. Leave three dry.",
          ),
          ...step(
            "sci-4-d",
            50.5,
            "3",
            "Put each group on its own plate on the kitchen counter.",
          ),
          ...step(
            "sci-4-e",
            72,
            "4",
            "Photograph every hour for 6 hours and score browning 0 to 10.",
          ),
        ],
      }),
      slide({
        id: "sci-5",
        layout: "blank",
        background: "pat-grid",
        notes:
          "Lower is better. Lemon juice won, but honey water came very close, which I did not expect.",
        elements: [
          kicker("sci-5-a", [7.5, 10, 40, 5], "RESULTS"),
          heading(
            "sci-5-b",
            [7.5, 15, 85, 10],
            "Browning score after 6 hours (lower is better)",
            40,
          ),
          shape("sci-5-c", "rounded", [7.5, 28, 85, 64], "bg", {
            radius: 20,
            stroke: INK,
            strokeWidth: 2,
          }),
          chart(
            "sci-5-d",
            "bar",
            [10, 32, 80, 56],
            [
              "Nothing",
              "Tap water",
              "Salt water",
              "Honey water",
              "Lemon juice",
            ],
            [9, 7.5, 3, 2, 1.5],
            "accent",
          ),
        ],
      }),
      slide({
        id: "sci-6",
        layout: "blank",
        notes:
          "This is the raw data, averaged over the three slices for each liquid.",
        elements: [
          heading("sci-6-a", [7.5, 8, 85, 10], "My data"),
          ...table(
            "sci-6-b",
            [7.5, 24, 85],
            [3, 1, 1, 1, 1],
            [
              ["LIQUID", "1 HOUR", "2 HOURS", "4 HOURS", "6 HOURS"],
              ["Nothing (control)", "3", "5", "8", "9"],
              ["Tap water", "1", "3", "6", "7.5"],
              ["Salt water", "0", "1", "2", "3"],
              ["Honey water", "0", "0.5", "1.5", "2"],
              ["Lemon juice", "0", "0.5", "1", "1.5"],
            ],
            { rowH: 10.5, size: 24, band: MINT },
          ),
        ],
      }),
      slide({
        id: "sci-7",
        layout: "blank",
        background: GREEN,
        notes:
          "My hypothesis was right, but the honey result is the interesting part. Honey has a natural chemical that slows the enzyme too.",
        elements: [
          ...slice("sci-7-s", 66, 18, 26, APPLE),
          kicker("sci-7-a", [7.5, 14, 40, 5], "CONCLUSION", LEMON),
          heading(
            "sci-7-b",
            [7.5, 22, 52, 22],
            "Lemon juice wins. Honey is a close second.",
            60,
            { color: "#FFFFFF" },
          ),
          text(
            "sci-7-c",
            [7.5, 52, 50, 32],
            p(
              "Acid in lemon juice slows the enzyme that turns apple flesh brown. My hypothesis was supported. Honey water worked almost as well and tastes better.",
            ),
            { size: 24, color: "#FFFFFF" },
          ),
        ],
      }),
      slide({
        id: "sci-8",
        layout: "blank",
        background: "pat-grid",
        notes:
          "Thanks for listening. Happy to answer questions, and there are lemon-dipped apple slices to try.",
        elements: [
          kicker("sci-8-a", [7.5, 14, 40, 5], "IF I DID IT AGAIN"),
          text(
            "sci-8-b",
            [7.5, 22, 50, 50],
            p(
              "Test more apple varieties, not just Gala.",
              "Use a colour chart app instead of scoring by eye.",
              "Try vitamin C tablets dissolved in water.",
            ),
            { size: 28 },
          ),
          shape("sci-8-c", "bubble", [62, 22, 30, 40], LEMON),
          text("sci-8-d", [64, 30, 26, 20], pc("Thank you! Questions?"), {
            font: "title",
            size: 44,
            color: INK,
          }),
          icon("sci-8-e", "search", 74, 70, 6, "accent", { strokeWidth: 2 }),
        ],
      }),
    ],
  },
};
