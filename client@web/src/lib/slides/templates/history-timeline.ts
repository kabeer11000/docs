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
  ul,
} from "./build";
import type { SlideTemplate } from "./types";

const RUST = "#B4532A";
const INK = "#2A2118";
const PARCH = "#E8DCC6";
const OCHRE = "#D9A441";
const TEAL = "#2F6B6B";

const city = (
  id: string,
  x: number,
  y: number,
  name: string,
  above: boolean,
) => [
  shape(`${id}-a`, "circle", [x - 1.2, y - 2.1, 2.4, sq(2.4)], RUST),
  shape(`${id}-b`, "circle", [x - 2.2, y - 3.9, 4.4, sq(4.4)], "none", {
    stroke: RUST,
    strokeWidth: 2,
    opacity: 0.5,
  }),
  text(`${id}-c`, [x - 9, above ? y - 11 : y + 4, 18, 6], pc(name), {
    size: 20,
  }),
];

const era = (
  id: string,
  x: number,
  date: string,
  title: string,
  body: string,
  up: boolean,
) => [
  shape(`${id}-a`, "rect", [x - 0.15, up ? 34 : 50, 0.3, 16], INK, {
    opacity: 0.4,
  }),
  shape(`${id}-b`, "circle", [x - 1.3, 47.7, 2.6, sq(2.6)], up ? RUST : INK),
  text(`${id}-c`, [x - 9, up ? 14 : 66, 18, 6], pc(date), {
    font: "mono",
    size: 18,
    color: "accent",
  }),
  text(
    `${id}-d`,
    [x - 9, up ? 20 : 72, 18, 6],
    pc(`<strong>${title}</strong>`),
    { size: 21 },
  ),
  text(`${id}-e`, [x - 9, up ? 26 : 78, 18, 10], pc(body), {
    size: 15,
    opacity: 0.75,
  }),
];

const cargo = (
  id: string,
  x: number,
  glyph: string,
  title: string,
  items: string[],
) => [
  shape(`${id}-a`, "circle", [x, 26, 8, sq(8)], PARCH),
  icon(`${id}-b`, glyph, x + 2, 29.5, 4, RUST, { strokeWidth: 1.5 }),
  text(`${id}-c`, [x, 46, 26, 7], p(title), { font: "title", size: 34 }),
  text(`${id}-d`, [x, 55, 26, 34], ul(...items), { size: 21 }),
];

export const historyTimeline: SlideTemplate = {
  id: "history-timeline",
  name: "History Timeline",
  category: "Education",
  description:
    "Warm sand and serif history lesson on the Silk Roads: a stylised route map, a five-era timeline, trade goods, a primary source and discussion prompts.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "sand",
    transition: "fade",
    slides: [
      slide({
        id: "hist-1",
        layout: "blank",
        notes:
          "Today: the Silk Roads. Not one road, and not mostly silk. A network that moved goods, religions and diseases across Eurasia for 1,500 years.",
        elements: [
          shape("hist-1-a", "circle", [54, -30, 70, sq(70)], PARCH),
          shape("hist-1-b", "circle", [66, -8, 46, sq(46)], "none", {
            stroke: RUST,
            strokeWidth: 2,
          }),
          shape("hist-1-c", "circle", [76, 10, 26, sq(26)], RUST),
          icon("hist-1-d", "compass", 82.5, 21.5, 13, PARCH, {
            strokeWidth: 1.25,
          }),
          kicker("hist-1-e", [7.5, 14, 40, 5], "WORLD HISTORY / UNIT 4"),
          heading("hist-1-f", [7.5, 24, 52, 34], "The Silk Roads", 108),
          text("hist-1-g", [7.5, 62, 44, 6], p("130 BCE to 1453 CE"), {
            font: "mono",
            size: 26,
            color: "accent",
          }),
          text(
            "hist-1-h",
            [7.5, 72, 44, 14],
            p(
              "How a web of caravan routes connected China, Persia and Europe.",
            ),
            {
              size: 24,
              opacity: 0.75,
            },
          ),
        ],
      }),
      slide({
        id: "hist-2",
        layout: "blank",
        background: "pat-dots",
        notes:
          "A simplified map. West is left, east is right. Each city was a market, a resting point and a place where ideas changed hands.",
        elements: [
          kicker("hist-2-a", [7.5, 8, 40, 5], "THE ROUTE"),
          heading("hist-2-b", [7.5, 13, 60, 10], "Venice to Chang'an", 48),
          shape("hist-2-c", "line", [9.7, 65.75, 17.6, 0.5], RUST, {
            rotation: -15,
            strokeWidth: 4,
          }),
          shape("hist-2-d", "line", [26.95, 63.75, 19.1, 0.5], RUST, {
            rotation: 7,
            strokeWidth: 4,
          }),
          shape("hist-2-e", "line", [45, 58.25, 19, 0.5], RUST, {
            rotation: -26,
            strokeWidth: 4,
          }),
          shape("hist-2-f", "line", [62.85, 54.25, 25.3, 0.5], RUST, {
            rotation: 9,
            strokeWidth: 4,
          }),
          ...city("hist-2-g", 10, 70, "Venice", false),
          ...city("hist-2-h", 27, 62, "Constantinople", true),
          ...city("hist-2-i", 46, 66, "Baghdad", false),
          ...city("hist-2-j", 63, 51, "Samarkand", true),
          ...city("hist-2-k", 88, 58, "Chang'an", false),
          text(
            "hist-2-l",
            [62, 80, 31, 8],
            p("Not to scale. Main overland route only."),
            {
              size: 16,
              opacity: 0.6,
              align: "right",
            },
          ),
        ],
      }),
      slide({
        id: "hist-3",
        layout: "blank",
        notes:
          "Five moments to remember. Write these dates in your notes, they come back in the end-of-unit test.",
        elements: [
          shape("hist-3-a", "rect", [5, 48.8, 90, 0.5], INK),
          ...era(
            "hist-3-b",
            12,
            "130 BCE",
            "Zhang Qian",
            "Han envoy opens contact with Central Asia",
            true,
          ),
          ...era(
            "hist-3-c",
            31,
            "c. 600",
            "Tang golden age",
            "Chang'an is the largest city on Earth",
            false,
          ),
          ...era(
            "hist-3-d",
            50,
            "751",
            "Battle of Talas",
            "Paper-making spreads west",
            true,
          ),
          ...era(
            "hist-3-e",
            69,
            "1271",
            "Marco Polo",
            "Leaves Venice for the court of Kublai Khan",
            false,
          ),
          ...era(
            "hist-3-f",
            88,
            "1453",
            "Fall of Constantinople",
            "Overland trade declines, sea routes rise",
            true,
          ),
        ],
      }),
      slide({
        id: "hist-4",
        layout: "big-number",
        notes:
          "For scale: that is further than London to New York. A caravan took around a year to cover it, and almost no one travelled the whole way.",
        html: {
          stat: p("6,400 km"),
          caption: p(
            "from Chang'an to the Mediterranean. Most goods changed hands a dozen times; few merchants ever saw both ends.",
          ),
        },
        elements: [
          kicker("hist-4-a", [7.5, 7, 40, 5], "SCALE"),
          icon("hist-4-b", "mountain", 84, 8, 8, "accent", {
            strokeWidth: 1.25,
          }),
        ],
      }),
      slide({
        id: "hist-5",
        layout: "blank",
        notes:
          "The third column is the one students forget. The Black Death probably travelled these routes in the 1340s.",
        elements: [
          heading("hist-5-a", [7.5, 8, 85, 10], "What travelled the roads"),
          ...cargo("hist-5-b", 7.5, "package", "Goods", [
            "Silk and porcelain west",
            "Glass, wool and silver east",
            "Spices, horses, paper",
          ]),
          ...cargo("hist-5-c", 37, "book-open", "Ideas", [
            "Buddhism into China",
            "Islam into Central Asia",
            "Numerals and astronomy",
          ]),
          ...cargo("hist-5-d", 66.5, "triangle-alert", "Disease", [
            "The plague of the 1340s",
            "Spread along caravan stops",
            "Killed a third of Europe",
          ]),
        ],
      }),
      slide({
        id: "hist-6",
        layout: "quote",
        background: "#E8DCC6",
        notes:
          "Primary source. Ibn Battuta travelled further than Marco Polo. Ask: what does he notice, and why might he exaggerate?",
        html: {
          quote: p(
            "China is the safest and best country for the traveller. A man may go alone for nine months with great wealth and have nothing to fear.",
          ),
          attribution: p("Ibn Battuta, Rihla, c. 1355"),
        },
      }),
      slide({
        id: "hist-7",
        layout: "blank",
        notes:
          "Land and sea routes ran side by side for centuries. By 1500, ships could carry more for less, which is a big part of why the overland roads faded.",
        elements: [
          heading("hist-7-a", [7.5, 8, 85, 10], "Overland or by sea?"),
          ...table(
            "hist-7-b",
            [7.5, 26, 85],
            [2, 3, 3],
            [
              ["", "OVERLAND", "MARITIME"],
              [
                "Transport",
                "Camel caravans, 30 km a day",
                "Dhows and junks, monsoon winds",
              ],
              [
                "Cargo",
                "Light, valuable goods",
                "Bulk: spices, ceramics, timber",
              ],
              [
                "Risks",
                "Deserts, bandits, tolls",
                "Storms, pirates, shipwreck",
              ],
              ["Peak", "Tang and Mongol eras", "After 1400"],
            ],
            { rowH: 12, size: 22, band: PARCH },
          ),
        ],
      }),
      slide({
        id: "hist-8",
        layout: "blank",
        background: TEAL,
        notes:
          "Pick one question with your table. Five minutes, then we share. Homework: one page on question two.",
        elements: [
          kicker("hist-8-a", [7.5, 12, 40, 5], "DISCUSS", OCHRE),
          heading(
            "hist-8-b",
            [7.5, 18, 85, 12],
            "Talk it through with your table",
            56,
            { color: "#F2EBDD" },
          ),
          ...[
            "Why was silk worth carrying 6,400 km?",
            "Which mattered more in the long run: the goods or the ideas?",
            "What are the silk roads of today?",
          ].flatMap((q, i) => [
            text(`hist-8-c${i}`, [7.5, 38 + i * 17, 8, 12], p(`0${i + 1}`), {
              font: "title",
              size: 56,
              color: OCHRE,
            }),
            text(`hist-8-d${i}`, [17, 40 + i * 17, 70, 10], p(q), {
              size: 30,
              color: "#F2EBDD",
            }),
          ]),
        ],
      }),
    ],
  },
};
