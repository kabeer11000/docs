import type { SlideElement } from "../model";
import {
  heading,
  icon,
  kicker,
  p,
  shape,
  slide,
  sq,
  table,
  text,
} from "./build";
import type { SlideTemplate } from "./types";

const BLACK = "#0A0A0B";
const FRAMES = [
  "#E9A07A",
  "#3D5A80",
  "#98C1D9",
  "#EE6C4D",
  "#293241",
  "#F2CC8F",
  "#81B29A",
  "#E07A5F",
  "#5E548E",
  "#D8E2DC",
  "#9F86C0",
  "#FFB4A2",
];

/** A film strip edge: a row of sprocket holes. */
const sprockets = (id: string, y: number) =>
  Array.from({ length: 24 }, (_, i) =>
    shape(`${id}-${i}`, "rounded", [1 + i * 4.2, y, 2.2, 2.4], "#2A2A2E", {
      radius: 3,
    }),
  );

/** A seascape built from bands: sky, sun, sea, sand. */
const seascape = (
  id: string,
  [x, y, w, h]: [number, number, number, number],
) => [
  shape(`${id}-a`, "rect", [x, y, w, h], "#F2B880"),
  shape(`${id}-b`, "rect", [x, y, w, h * 0.3], "#E9A07A"),
  shape(
    `${id}-c`,
    "circle",
    [x + w * 0.58, y + h * 0.3, w * 0.16, sq(w * 0.16)],
    "#FFF1D6",
  ),
  shape(`${id}-d`, "rect", [x, y + h * 0.56, w, h * 0.28], "#3D5A80"),
  shape(
    `${id}-e`,
    "rect",
    [x + w * 0.2, y + h * 0.66, w * 0.5, h * 0.012],
    "#98C1D9",
    { opacity: 0.7 },
  ),
  shape(
    `${id}-f`,
    "rect",
    [x + w * 0.1, y + h * 0.74, w * 0.35, h * 0.012],
    "#98C1D9",
    { opacity: 0.5 },
  ),
  shape(`${id}-g`, "rect", [x, y + h * 0.84, w, h * 0.16], "#E8D5B5"),
];

/** A night street: building blocks with lit windows. */
const nightCity = (id: string, x0: number, y0: number): SlideElement[] => {
  const blocks: [number, number, number][] = [
    [0, 30, 10],
    [11, 14, 12],
    [24, 38, 9],
    [34, 6, 14],
    [49, 26, 11],
  ];
  return blocks.flatMap(([dx, dy, w], b) => {
    const top = y0 + dy;
    const out: SlideElement[] = [
      shape(`${id}-b${b}`, "rect", [x0 + dx, top, w, 92 - top], "#1A1D2B"),
    ];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 3; c++)
        if ((r + c + b) % 3 !== 0)
          out.push(
            shape(
              `${id}-w${b}-${r}-${c}`,
              "rect",
              [x0 + dx + 1.4 + c * (w / 3.4), top + 5 + r * 9, 1.6, 3.4],
              (r + b) % 2 ? "#FFD27A" : "#FF9257",
              { opacity: 0.85 },
            ),
          );
    return out;
  });
};

export const photoPortfolio: SlideTemplate = {
  id: "photo-portfolio",
  name: "Photography Portfolio",
  category: "Creative",
  description:
    "Gallery-black photographer's book: film-strip cover, a seascape and a night city drawn in shapes, a contact sheet, process, clients and rates.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "night",
    transition: "fade",
    slides: [
      slide({
        id: "photo-1",
        layout: "blank",
        background: BLACK,
        notes:
          "Hello, I am Noor. I shoot coastlines and cities after dark, mostly on medium format film. This is a short selection from the last three years.",
        elements: [
          ...sprockets("photo-1-s1", 6),
          ...sprockets("photo-1-s2", 91.6),
          ...FRAMES.slice(0, 5).map((c, i) =>
            shape(`photo-1-f${i}`, "rect", [1 + i * 20, 14, 18, 30], c),
          ),
          kicker("photo-1-a", [7.5, 54, 40, 5], "PORTFOLIO 2024 TO 2026"),
          heading("photo-1-b", [7, 60, 70, 18], "Noor Haddad", 96),
          text(
            "photo-1-c",
            [7.5, 79, 60, 6],
            p("Coastlines, night streets, slow light."),
            { size: 26, opacity: 0.7 },
          ),
        ],
      }),
      slide({
        id: "photo-2",
        layout: "blank",
        background: BLACK,
        notes:
          "Salt is a series from the Atlantic coast of Portugal, shot over four winters at dawn. Seven frames were shown at Lisbon Photo 2025.",
        elements: [
          ...seascape("photo-2-p", [7.5, 10, 56, 80]),
          kicker("photo-2-a", [68, 14, 26, 5], "SERIES 01"),
          heading("photo-2-b", [68, 20, 26, 14], "Salt", 80),
          text(
            "photo-2-c",
            [68, 40, 25, 30],
            p(
              "Dawn on the Atlantic coast near Nazaré. Four winters, one lens, no filters.",
            ),
            {
              size: 22,
              opacity: 0.8,
            },
          ),
          text(
            "photo-2-d",
            [68, 80, 25, 6],
            p("Hasselblad 500C / Portra 160"),
            { font: "mono", size: 15, opacity: 0.55 },
          ),
        ],
      }),
      slide({
        id: "photo-3",
        layout: "blank",
        background: BLACK,
        notes:
          "A contact sheet from one morning. The circled frame is the one that became the cover of the Salt book.",
        elements: [
          kicker("photo-3-a", [7.5, 7, 40, 5], "CONTACT SHEET / ROLL 114"),
          ...FRAMES.map((c, i) =>
            shape(
              `photo-3-f${i}`,
              "rect",
              [7.5 + (i % 4) * 21.5, 16 + Math.floor(i / 4) * 26, 19.5, 23],
              c,
            ),
          ),
          ...FRAMES.map((_, i) =>
            text(
              `photo-3-n${i}`,
              [7.5 + (i % 4) * 21.5, 39.2 + Math.floor(i / 4) * 26, 10, 3],
              p(`114-${String(i + 1).padStart(2, "0")}`),
              {
                font: "mono",
                size: 11,
                opacity: 0.5,
              },
            ),
          ),
          shape("photo-3-g", "circle", [48, 36, 23, sq(23) - 9], "none", {
            stroke: "accent",
            strokeWidth: 5,
            rotation: -4,
          }),
        ],
      }),
      slide({
        id: "photo-4",
        layout: "blank",
        background: "grad-night",
        notes:
          "Night Shifts follows the people who keep Porto running between midnight and five: bakers, cleaners, taxi drivers.",
        elements: [
          ...nightCity("photo-4-c", 36, 0),
          shape("photo-4-m", "circle", [86, 10, 6, sq(6)], "fg"),
          kicker("photo-4-a", [7.5, 14, 26, 5], "SERIES 02"),
          heading("photo-4-b", [7.5, 20, 28, 24], "Night Shifts", 64),
          text(
            "photo-4-d",
            [7.5, 48, 26, 30],
            p(
              "Porto between midnight and five. Thirty portraits of the people who keep the city running.",
            ),
            {
              size: 21,
              opacity: 0.8,
            },
          ),
        ],
      }),
      slide({
        id: "photo-5",
        layout: "quote",
        background: BLACK,
        notes: "This is the line I give every client before a shoot.",
        html: {
          quote: p(
            "I would rather wait three hours for the right light than fix it in three minutes on a screen.",
          ),
          attribution: p("Noor Haddad"),
        },
      }),
      slide({
        id: "photo-6",
        layout: "blank",
        background: BLACK,
        notes:
          "Clients ask about process. Film for personal work, digital for commissions with tight turnarounds.",
        elements: [
          heading("photo-6-a", [7.5, 8, 85, 10], "How I work"),
          ...[
            [
              "compass",
              "Scout",
              "I visit every location twice before the shoot, once by day and once at the hour we will shoot.",
            ],
            [
              "camera",
              "Shoot",
              "Medium format film for editorial, full-frame digital when the deadline is tomorrow.",
            ],
            [
              "image",
              "Print",
              "Every final is printed and checked by hand before delivery. Files arrive within 10 days.",
            ],
          ].flatMap(([g, t, b], i) => [
            shape(
              `photo-6-r${i}`,
              "rect",
              [7.5 + i * 29.5, 28, 27, 0.4],
              "accent",
            ),
            icon(`photo-6-i${i}`, g, 7.5 + i * 29.5, 34, 4, "fg", {
              strokeWidth: 1.25,
            }),
            text(`photo-6-t${i}`, [7.5 + i * 29.5, 44, 27, 8], p(t), {
              font: "title",
              size: 40,
            }),
            text(`photo-6-b${i}`, [7.5 + i * 29.5, 55, 26, 34], p(b), {
              size: 20,
              opacity: 0.75,
            }),
          ]),
        ],
      }),
      slide({
        id: "photo-7",
        layout: "blank",
        background: BLACK,
        notes:
          "A few of the people I have worked with. Full list and tear sheets on request.",
        elements: [
          kicker("photo-7-a", [7.5, 10, 40, 5], "CLIENTS AND PUBLICATIONS"),
          ...[
            "Monocle",
            "Kinfolk",
            "The Guardian",
            "Turismo de Portugal",
            "Aesop",
            "Cereal",
            "Expresso",
            "Patagonia",
          ].map((n, i) =>
            text(
              `photo-7-n${i}`,
              [7.5 + (i % 2) * 44, 22 + Math.floor(i / 2) * 17, 42, 12],
              p(n),
              {
                font: "title",
                size: 52,
                opacity: i % 3 === 0 ? 0.95 : 0.55,
              },
            ),
          ),
        ],
      }),
      slide({
        id: "photo-8",
        layout: "blank",
        background: BLACK,
        notes:
          "Rates include one round of retouching and usage for twelve months. Travel outside Portugal is billed at cost.",
        elements: [
          heading("photo-8-a", [7.5, 8, 85, 10], "Commissions"),
          ...table(
            "photo-8-b",
            [7.5, 26, 85],
            [3, 2, 4],
            [
              ["BRIEF", "FROM", "INCLUDES"],
              ["Editorial, half day", "EUR 900", "15 selects, 12-month usage"],
              [
                "Editorial, full day",
                "EUR 1,600",
                "30 selects, 12-month usage",
              ],
              [
                "Brand campaign",
                "EUR 4,500",
                "Concept, scouting, 2 shoot days",
              ],
              [
                "Fine art prints",
                "EUR 280",
                "Signed, edition of 15, 50 x 60 cm",
              ],
            ],
            { rowH: 12, size: 22, band: "#16181D" },
          ),
        ],
      }),
      slide({
        id: "photo-9",
        layout: "blank",
        background: BLACK,
        notes:
          "Thank you. Prints from both series are available, and I am booking spring commissions now.",
        elements: [
          ...seascape("photo-9-p", [58, 0, 42, 100]),
          heading(
            "photo-9-a",
            [7.5, 26, 46, 24],
            "Let's make something slow.",
            64,
          ),
          text("photo-9-b", [7.5, 58, 46, 6], p("noor@noorhaddad.photo"), {
            font: "mono",
            size: 26,
            color: "accent",
          }),
          text(
            "photo-9-c",
            [7.5, 66, 46, 6],
            p("Based in Lisbon, available worldwide."),
            { size: 22, opacity: 0.7 },
          ),
        ],
      }),
    ],
  },
};
