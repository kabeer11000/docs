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

const BLACK = "#000000";
const AMBER = "#F2A541";
const SEA = "#1F3A4D";
const CARD = "#181C24";
const MIST = "#9FB3C8";

/** Cinema letterbox bars. */
const bars = (id: string) => [
  shape(`${id}-t`, "rect", [0, 0, 100, 11], BLACK),
  shape(`${id}-b`, "rect", [0, 89, 100, 11], BLACK),
];

const act = (id: string, x: number, n: string, title: string, body: string) => [
  text(`${id}-a`, [x, 24, 27, 8], p(n), {
    font: "mono",
    size: 20,
    color: AMBER,
  }),
  shape(`${id}-b`, "rect", [x, 32, 27, 0.4], MIST, { opacity: 0.5 }),
  text(`${id}-c`, [x, 36, 27, 10], p(title), { font: "title", size: 38 }),
  text(`${id}-d`, [x, 48, 26, 36], p(body), { size: 20, opacity: 0.78 }),
];

const role = (
  id: string,
  x: number,
  initials: string,
  name: string,
  who: string,
  fill: string,
) => [
  shape(`${id}-a`, "circle", [x + 6, 26, 15, sq(15)], fill),
  text(`${id}-b`, [x + 6, 38, 15, 10], pc(initials), {
    font: "title",
    size: 56,
    color: BLACK,
  }),
  text(`${id}-c`, [x, 57, 27, 7], pc(`<strong>${name}</strong>`), { size: 28 }),
  text(`${id}-d`, [x, 65, 27, 22], pc(who), { size: 19, opacity: 0.75 }),
];

export const filmPitch: SlideTemplate = {
  id: "film-pitch",
  name: "Film Pitch",
  category: "Creative",
  description:
    "Cinematic letterboxed pitch for a feature film: title card, logline, three acts, characters, look and tone palette, comparables, budget and team.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "night",
    transition: "fade",
    slides: [
      slide({
        id: "film-1",
        layout: "blank",
        background: SEA,
        notes:
          "Low Season is a feature drama, 98 minutes, set in a Welsh seaside town in February. We are raising the final 40 percent of the budget.",
        elements: [
          ...bars("film-1-x"),
          shape("film-1-a", "circle", [44, 22, 12, sq(12)], AMBER, {
            opacity: 0.9,
          }),
          shape("film-1-b", "rect", [0, 58, 100, 31], "#14283A"),
          shape("film-1-c", "rect", [30, 64, 40, 0.5], AMBER, { opacity: 0.6 }),
          shape("film-1-d", "rect", [38, 70, 24, 0.5], AMBER, {
            opacity: 0.35,
          }),
          text("film-1-e", [10, 40, 80, 16], pc("LOW SEASON"), {
            font: "title",
            size: 96,
          }),
          text("film-1-f", [10, 76, 80, 6], pc("A FILM BY CERYS PRICE"), {
            font: "mono",
            size: 18,
            color: MIST,
          }),
        ],
      }),
      slide({
        id: "film-2",
        layout: "blank",
        background: BLACK,
        notes: "Read the logline and stop. Let it land.",
        elements: [
          kicker("film-2-a", [12, 22, 40, 5], "LOGLINE", AMBER),
          heading(
            "film-2-b",
            [12, 30, 76, 44],
            "When the last arcade in a dying seaside town is sold, its 19-year-old night manager has one winter to decide whether to leave with her mother or stay with the father who never left.",
            42,
          ),
        ],
      }),
      slide({
        id: "film-3",
        layout: "blank",
        notes:
          "The structure is classical, the tone is not. The arcade is a character in every act.",
        elements: [
          ...bars("film-3-x"),
          heading("film-3-a", [7.5, 12, 85, 8], "The story", 40),
          ...act(
            "film-3-b",
            7.5,
            "ACT ONE",
            "The sale",
            "Nia learns the arcade has been sold to a developer. Her mother has already packed for Cardiff.",
          ),
          ...act(
            "film-3-c",
            36.5,
            "ACT TWO",
            "The storm",
            "A February storm cuts the town off for a week. Nia and her father run the arcade for the few people left.",
          ),
          ...act(
            "film-3-d",
            65.5,
            "ACT THREE",
            "The last night",
            "The final night of the arcade becomes a party for the whole town, and Nia makes her choice.",
          ),
        ],
      }),
      slide({
        id: "film-4",
        layout: "blank",
        notes:
          "Casting conversations are under way for Gareth. We want an unknown for Nia, open casting runs in South Wales in the new year.",
        elements: [
          ...bars("film-4-x"),
          heading("film-4-a", [7.5, 12, 85, 8], "Characters", 40),
          ...role(
            "film-4-b",
            7.5,
            "N",
            "Nia, 19",
            "Night manager. Funny, stuck, the only one who knows how every machine works.",
            AMBER,
          ),
          ...role(
            "film-4-c",
            36.5,
            "G",
            "Gareth, 54",
            "Her father. Owns nothing but the keys. Refuses to talk about the sale.",
            MIST,
          ),
          ...role(
            "film-4-d",
            65.5,
            "S",
            "Siân, 48",
            "Her mother. Left the town once and came back. Will not do it twice.",
            "#E8D5B5",
          ),
        ],
      }),
      slide({
        id: "film-5",
        layout: "blank",
        background: BLACK,
        notes:
          "The palette is sodium orange against winter blue. Long static shots, natural light, the arcade's neon as the only colour at night.",
        elements: [
          kicker("film-5-a", [7.5, 12, 40, 5], "LOOK AND TONE", AMBER),
          heading(
            "film-5-b",
            [7.5, 18, 85, 10],
            "Aftersun meets Local Hero, in February rain",
            44,
          ),
          ...[SEA, "#2E5266", MIST, "#E8D5B5", AMBER, "#C8553D"].map((c, i) =>
            shape(`film-5-c${i}`, "rect", [7.5 + i * 14.2, 36, 14.2, 34], c),
          ),
          ...["Winter sea", "Harbour", "Fog", "Sand", "Sodium", "Neon"].map(
            (n, i) =>
              text(`film-5-d${i}`, [7.5 + i * 14.2, 72, 14, 5], p(n), {
                font: "mono",
                size: 15,
                opacity: 0.7,
              }),
          ),
          text(
            "film-5-e",
            [7.5, 80, 85, 8],
            p(
              "Shot on 35mm, 1.85:1. Locked-off frames, natural light, no score until the final act.",
            ),
            {
              size: 22,
            },
          ),
        ],
      }),
      slide({
        id: "film-6",
        layout: "blank",
        notes:
          "Comparable UK and Irish dramas at a similar budget (illustrative figures, replace with your sales agent's comps). All recouped through sales and streaming, not theatrical alone.",
        elements: [
          ...bars("film-6-x"),
          heading("film-6-a", [7.5, 12, 85, 8], "Comparables", 40),
          ...table(
            "film-6-b",
            [7.5, 26, 85],
            [3, 2, 2, 3],
            [
              ["TITLE", "BUDGET", "GROSS", "RELEASE"],
              [
                "Salt Flats (2023)",
                "GBP 2.1M",
                "USD 6.4M",
                "Festival breakout",
              ],
              [
                "The Ferryman's Son (2022)",
                "EUR 1.6M",
                "USD 5.2M",
                "Awards run",
              ],
              [
                "Pier Lights (2021)",
                "GBP 1.2M",
                "GBP 1.4M",
                "Streaming worldwide",
              ],
              [
                "Undertow (2024)",
                "EUR 3.0M",
                "USD 2.3M",
                "Competition premiere",
              ],
            ],
            { rowH: 12, size: 22, band: CARD, head: AMBER },
          ),
        ],
      }),
      slide({
        id: "film-7",
        layout: "blank",
        notes:
          "Total budget 2.4 million. Ffilm Cymru and the BFI have committed 60 percent. We are raising 960 thousand in equity.",
        elements: [
          ...bars("film-7-x"),
          kicker("film-7-a", [7.5, 16, 36, 5], "FINANCE", AMBER),
          text("film-7-b", [6.5, 22, 40, 20], p("GBP 2.4M"), {
            font: "title",
            size: 100,
          }),
          text(
            "film-7-c",
            [7.5, 44, 36, 14],
            p("Total budget. 60% committed by Ffilm Cymru Wales and the BFI."),
            { size: 22 },
          ),
          text(
            "film-7-d",
            [7.5, 62, 36, 18],
            p(
              "<strong>Raising GBP 960k</strong> in equity, recouping first after the sales agent.",
            ),
            {
              size: 22,
              color: AMBER,
            },
          ),
          chart(
            "film-7-e",
            "pie",
            [50, 16, 44, 70],
            [
              "Above the line",
              "Production",
              "Post",
              "Contingency",
              "Insurance and legal",
            ],
            [22, 48, 16, 9, 5],
            AMBER,
          ),
        ],
      }),
      slide({
        id: "film-8",
        layout: "blank",
        background: BLACK,
        notes:
          "Close on the shoot dates and the contact. Script and director's lookbook are available under NDA.",
        elements: [
          icon("film-8-a", "film", 46, 22, 8, AMBER, { strokeWidth: 1.25 }),
          text(
            "film-8-b",
            [10, 42, 80, 12],
            pc("Shooting March 2028 in Aberystwyth"),
            { font: "title", size: 52 },
          ),
          text(
            "film-8-c",
            [10, 58, 80, 6],
            pc("Cerys Price, writer-director / Owen Lloyd, producer"),
            { size: 24, opacity: 0.75 },
          ),
          text(
            "film-8-d",
            [10, 68, 80, 6],
            pc("owen@harbourlightfilms.co.uk"),
            { font: "mono", size: 22, color: AMBER },
          ),
        ],
      }),
    ],
  },
};
