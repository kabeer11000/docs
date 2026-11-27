import type { SlideElement } from "../model";
import { heading, icon, kicker, p, pc, shape, slide, sq, text } from "./build";
import type { SlideTemplate } from "./types";

const INK = "#121418";
const PINK = "#FF5FA2";
const BLUE = "#3B5BFD";
const ORANGE = "#FF6A1F";
const MINT = "#3DD39B";
const WHITE = "#FFFFFF";
const PURPLE = "#7B3FE4";

/** Deterministic confetti: small rotated bits scattered around the edges. */
const confetti = (id: string, seed = 0): SlideElement[] => {
  const colors = [PINK, BLUE, ORANGE, MINT, PURPLE, WHITE];
  const spots: [number, number][] = [
    [4, 8],
    [16, 4],
    [30, 10],
    [48, 3],
    [66, 7],
    [82, 4],
    [94, 14],
    [90, 34],
    [96, 56],
    [88, 80],
    [74, 92],
    [56, 88],
    [38, 94],
    [20, 88],
    [6, 76],
    [2, 44],
    [12, 24],
    [70, 20],
  ];
  return spots.map(([x, y], i) => {
    const c = colors[(i + seed) % colors.length];
    const kind = (i + seed) % 3;
    const rotation = ((i * 37 + seed * 11) % 80) - 40 || 15;
    return kind === 0
      ? shape(`${id}-${i}`, "rect", [x, y, 2.2, 1.4], c, { rotation })
      : kind === 1
        ? shape(`${id}-${i}`, "circle", [x, y, 1.4, sq(1.4)], c)
        : shape(`${id}-${i}`, "star", [x, y, 2, sq(2)], c, { rotation });
  });
};

const moment = (
  id: string,
  y: number,
  time: string,
  what: string,
  glyph: string,
  fill: string,
) => [
  shape(`${id}-a`, "rounded", [40, y, 52, 14], fill, { radius: 40 }),
  text(`${id}-b`, [43, y + 3.5, 12, 7], p(time), {
    font: "mono",
    size: 24,
    color: WHITE,
  }),
  text(`${id}-c`, [55, y + 3, 30, 8], p(`<strong>${what}</strong>`), {
    size: 26,
    color: WHITE,
  }),
  icon(`${id}-d`, glyph, 86, y + 3.6, 3.6, WHITE, { strokeWidth: 2 }),
];

const fact = (
  id: string,
  x: number,
  y: number,
  value: string,
  label: string,
  fill: string,
) => [
  shape(`${id}-a`, "circle", [x, y, 18, sq(18)], fill),
  text(`${id}-b`, [x, y + 9, 18, 12], pc(value), {
    font: "title",
    size: 60,
    color: WHITE,
  }),
  text(`${id}-c`, [x - 2, y + 21, 22, 8], pc(label), {
    size: 17,
    color: WHITE,
  }),
];

export const birthdayParty: SlideTemplate = {
  id: "birthday-party",
  name: "Birthday Party",
  category: "Events",
  description:
    "Confetti-filled lemon invite for a 30th: giant name, save the date, the night's running order, venue, disco dress code, fun facts and RSVP.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "lemon",
    transition: "zoom",
    slides: [
      slide({
        id: "bday-1",
        layout: "blank",
        notes: "Send this as the invite, or loop it on the screen at the door.",
        elements: [
          ...confetti("bday-1-c"),
          kicker("bday-1-a", [10, 18, 80, 5], "YOU ARE INVITED TO", BLUE),
          text("bday-1-b", [6, 26, 88, 34], pc("Leo is 30!"), {
            font: "title",
            size: 180,
            color: INK,
          }),
          shape("bday-1-d", "rounded", [32, 66, 36, 10], INK, { radius: 40 }),
          text("bday-1-e", [32, 68.2, 36, 6], pc("A disco roller night"), {
            size: 30,
            color: "#FFE45C",
          }),
        ],
      }),
      slide({
        id: "bday-2",
        layout: "blank",
        background: PINK,
        notes:
          "Save the date. Tell people to keep the whole evening free, it goes late.",
        elements: [
          ...confetti("bday-2-c", 2),
          shape("bday-2-a", "rounded", [10, 16, 32, 68], WHITE, {
            radius: 28,
            rotation: -4,
          }),
          shape("bday-2-b", "rounded", [10, 16, 32, 16], INK, {
            radius: 28,
            rotation: -4,
          }),
          text("bday-2-d", [10, 19, 32, 10], pc("JUNE"), {
            font: "mono",
            size: 36,
            color: WHITE,
            rotation: -4,
          }),
          text("bday-2-e", [10, 36, 32, 34], pc("14"), {
            font: "title",
            size: 200,
            color: INK,
            rotation: -4,
          }),
          text("bday-2-f", [10, 72, 32, 8], pc("SATURDAY"), {
            font: "mono",
            size: 24,
            color: INK,
            rotation: -4,
          }),
          kicker("bday-2-g", [52, 26, 40, 5], "SAVE THE DATE", WHITE),
          heading(
            "bday-2-h",
            [52, 33, 40, 24],
            "From 7pm until they kick us out",
            54,
            { color: WHITE },
          ),
          text(
            "bday-2-i",
            [52, 66, 38, 14],
            p("Last skates at 1am. Night buses run every 20 minutes."),
            { size: 24, color: WHITE },
          ),
        ],
      }),
      slide({
        id: "bday-3",
        layout: "blank",
        notes:
          "Running order so people know when to arrive. The cake is at 21:30 sharp, do not be late for that.",
        elements: [
          heading("bday-3-a", [7.5, 14, 30, 40], "The plan", 96, {
            color: INK,
          }),
          text(
            "bday-3-b",
            [7.5, 52, 28, 30],
            p("Skates are included. Bring socks, trust us."),
            { size: 26, color: INK },
          ),
          ...moment(
            "bday-3-c",
            10,
            "19:00",
            "Doors and welcome drinks",
            "wine",
            BLUE,
          ),
          ...moment(
            "bday-3-d",
            30,
            "20:00",
            "Roller disco opens",
            "music",
            PINK,
          ),
          ...moment(
            "bday-3-e",
            50,
            "21:30",
            "Cake and a terrible speech",
            "cake",
            ORANGE,
          ),
          ...moment(
            "bday-3-f",
            70,
            "22:00",
            "DJ Mags till late",
            "headphones",
            PURPLE,
          ),
        ],
      }),
      slide({
        id: "bday-4",
        layout: "blank",
        notes: "Venue details. There is step-free access and a cloakroom.",
        elements: [
          shape("bday-4-a", "rect", [50, 0, 50, 100], INK),
          ...[18, 42, 66].map((y, i) =>
            shape(`bday-4-r${i}`, "rect", [50, y, 50, 1.6], "#2A2D33"),
          ),
          ...[62, 80].map((x, i) =>
            shape(`bday-4-v${i}`, "rect", [x, 0, 1, 100], "#2A2D33"),
          ),
          shape("bday-4-b", "rect", [50, 54, 50, 2.4], BLUE, { rotation: -12 }),
          shape("bday-4-c", "circle", [68, 30, 9, sq(9)], PINK),
          icon("bday-4-d", "map-pin", 70, 34, 5, WHITE, { strokeWidth: 2 }),
          kicker("bday-4-e", [7.5, 16, 36, 5], "WHERE", BLUE),
          heading("bday-4-f", [7.5, 22, 38, 20], "Rollerdrome Hackney", 64, {
            color: INK,
          }),
          text(
            "bday-4-g",
            [7.5, 50, 36, 12],
            p("Unit 4, Mare Street Arches, London E8 3RH"),
            { size: 26, color: INK },
          ),
          text(
            "bday-4-h",
            [7.5, 66, 36, 20],
            p(
              "5 minutes from Hackney Central. Bike racks out front. Step-free entrance on the left.",
            ),
            { size: 21, color: INK, opacity: 0.8 },
          ),
        ],
      }),
      slide({
        id: "bday-5",
        layout: "blank",
        background: PURPLE,
        notes:
          "Dress code is seventies disco. Sequins, flares, glitter, all encouraged. Prize for the best outfit.",
        elements: [
          ...confetti("bday-5-c", 4),
          kicker("bday-5-a", [7.5, 14, 40, 5], "DRESS CODE", "#FFE45C"),
          heading(
            "bday-5-b",
            [7.5, 22, 50, 40],
            "Seventies disco. Go big.",
            96,
            { color: WHITE },
          ),
          text(
            "bday-5-d",
            [7.5, 70, 46, 12],
            p(
              "Sequins, flares and glitter. Best outfit wins a mirror ball trophy.",
            ),
            { size: 24, color: WHITE },
          ),
          shape("bday-5-e", "circle", [64, 22, 26, sq(26)], "#D8DEE9"),
          ...[0, 1, 2, 3, 4].map((r) =>
            shape(`bday-5-g${r}`, "rect", [64, 24 + r * 9, 26, 0.5], "#9AA3B2"),
          ),
          ...[0, 1, 2, 3].map((c) =>
            shape(
              `bday-5-h${c}`,
              "rect",
              [68 + c * 5.5, 22, 0.4, sq(26)],
              "#9AA3B2",
            ),
          ),
          shape("bday-5-i", "line", [76.6, 6, 0.8, 16], WHITE, {
            strokeWidth: 3,
          }),
          shape("bday-5-j", "star", [86, 18, 4, sq(4)], "#FFE45C"),
        ],
      }),
      slide({
        id: "bday-6",
        layout: "blank",
        background: INK,
        notes:
          "Thirty years in numbers, as researched by his sister. The pizza figure is an estimate.",
        elements: [
          heading(
            "bday-6-a",
            [7.5, 8, 85, 10],
            "Thirty years of Leo, in numbers",
            52,
            { color: "#FFE45C" },
          ),
          ...fact("bday-6-b", 8, 30, "4", "cities lived in", BLUE),
          ...fact("bday-6-c", 31, 30, "1,800", "pizzas, roughly", PINK),
          ...fact("bday-6-d", 54, 30, "11", "broken phones", ORANGE),
          ...fact("bday-6-e", 77, 30, "1", "very good dog", MINT),
        ],
      }),
      slide({
        id: "bday-7",
        layout: "blank",
        notes:
          "RSVP by the end of May so we can book enough skates. No gifts, but the drinks tab is open for donations.",
        elements: [
          ...confetti("bday-7-c", 1),
          icon("bday-7-a", "party-popper", 44, 12, 12, BLUE, {
            strokeWidth: 1.5,
          }),
          text("bday-7-b", [10, 44, 80, 14], pc("RSVP by 31 May"), {
            font: "title",
            size: 96,
            color: INK,
          }),
          text(
            "bday-7-d",
            [10, 62, 80, 6],
            pc("Text Ana on 07700 900 312, or reply in the group chat"),
            { size: 28, color: INK },
          ),
          text(
            "bday-7-e",
            [10, 72, 80, 6],
            pc("No gifts please. Just come and fall over with us."),
            { size: 24, color: INK, opacity: 0.75 },
          ),
        ],
      }),
    ],
  },
};
