import {
  heading,
  icon,
  kicker,
  p,
  pc,
  shape,
  slide,
  sq,
  text,
  ul,
} from "./build";
import type { SlideTemplate } from "./types";

const INK = "#1C0D04";
const WHITE = "#FFFFFF";
const CREAM = "#FFE7D6";
const DEEP = "#C24A0E";

const win = (id: string, x: number, value: string, label: string) => [
  shape(`${id}-a`, "rounded", [x, 30, 27, 56], INK, { radius: 24 }),
  text(`${id}-b`, [x + 2.5, 38, 22, 20], p(value), {
    font: "title",
    size: 96,
    color: "accent",
  }),
  text(`${id}-c`, [x + 2.5, 62, 22, 20], p(label), { size: 22, color: CREAM }),
];

const kudos = (
  id: string,
  x: number,
  y: number,
  name: string,
  why: string,
  rot: number,
) => [
  shape(`${id}-a`, "rounded", [x, y, 27, 30], WHITE, {
    radius: 18,
    rotation: rot,
  }),
  text(`${id}-b`, [x + 2, y + 3.5, 23, 7], p(`<strong>${name}</strong>`), {
    size: 24,
    color: INK,
    rotation: rot,
  }),
  text(`${id}-c`, [x + 2, y + 11, 23, 17], p(why), {
    size: 18,
    color: INK,
    opacity: 0.75,
    rotation: rot,
  }),
];

const column = (
  id: string,
  x: number,
  label: string,
  fill: string,
  fg: string,
  items: string[],
) => [
  shape(`${id}-a`, "rounded", [x, 26, 27, 64], fill, { radius: 22 }),
  text(`${id}-b`, [x + 2.5, 30, 22, 8], p(label), {
    font: "title",
    size: 40,
    color: fg,
  }),
  text(`${id}-c`, [x + 2.5, 42, 22, 46], ul(...items), { size: 21, color: fg }),
];

const joiner = (
  id: string,
  x: number,
  initials: string,
  name: string,
  role: string,
  fill: string,
) => [
  shape(`${id}-a`, "circle", [x + 3, 30, 14, sq(14)], fill),
  text(`${id}-b`, [x + 3, 41, 14, 10], pc(initials), {
    font: "title",
    size: 52,
    color: INK,
  }),
  text(`${id}-c`, [x, 59, 20, 14], pc(`<strong>${name}</strong>`, role), {
    size: 20,
  }),
];

export const allHands: SlideTemplate = {
  id: "all-hands",
  name: "All-Hands Meeting",
  category: "Business",
  description:
    "Bright tangerine company all-hands: running order, wins on black cards, shout-out notes, now-next-later roadmap, new faces and an AMA.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "tangerine",
    transition: "slide",
    slides: [
      slide({
        id: "ah-1",
        layout: "blank",
        notes:
          "Welcome everyone, including the Nairobi team dialling in. Forty-five minutes, recording goes on the wiki tonight.",
        elements: [
          shape("ah-1-a", "circle", [62, -20, 52, sq(52)], INK),
          shape("ah-1-b", "circle", [54, 56, 22, sq(22)], WHITE),
          icon("ah-1-c", "party-popper", 76, 18, 14, "accent", {
            strokeWidth: 1.25,
          }),
          kicker("ah-1-d", [7.5, 12, 40, 5], "POCKETFUL / NOVEMBER 2026", INK),
          heading("ah-1-e", [7, 22, 56, 46], "All hands", 168),
          text(
            "ah-1-f",
            [7.5, 76, 44, 10],
            p("Thursday 27 November, 16:00 Lisbon / 18:00 Nairobi"),
            {
              size: 24,
            },
          ),
        ],
      }),
      slide({
        id: "ah-2",
        layout: "blank",
        notes: "Running order. AMA questions are open in the channel from now.",
        elements: [
          heading("ah-2-a", [7.5, 8, 40, 12], "Running order", 60),
          ...[
            ["16:00", "Wins of the month", "Joana"],
            ["16:10", "Shout-outs", "Everyone"],
            ["16:15", "Roadmap: now, next, later", "Kwame"],
            ["16:25", "Welcome to the new faces", "People team"],
            ["16:30", "Ask me anything", "Founders"],
          ].flatMap(([t, what, who], i) => [
            shape(`ah-2-r${i}`, "rect", [7.5, 28 + i * 13, 85, 0.4], INK, {
              opacity: 0.25,
            }),
            text(`ah-2-t${i}`, [7.5, 30.5 + i * 13, 14, 8], p(t), {
              font: "mono",
              size: 24,
            }),
            text(
              `ah-2-w${i}`,
              [22, 30 + i * 13, 50, 8],
              p(`<strong>${what}</strong>`),
              { size: 28 },
            ),
            text(`ah-2-p${i}`, [72, 30.5 + i * 13, 20.5, 8], p(who), {
              size: 22,
              align: "right",
            }),
          ]),
        ],
      }),
      slide({
        id: "ah-3",
        layout: "blank",
        notes:
          "The big one is the million users. Second is the app store rating, which was 3.9 in March. Third: the savings goal feature is now used by more than half of active users.",
        elements: [
          kicker("ah-3-a", [7.5, 9, 40, 5], "WINS OF THE MONTH", INK),
          heading("ah-3-b", [7.5, 14, 85, 10], "A very good November"),
          ...win(
            "ah-3-c",
            7.5,
            "1M",
            "people now save with Pocketful every month",
          ),
          ...win(
            "ah-3-d",
            36.5,
            "4.8",
            "app store rating, up from 3.9 in March",
          ),
          ...win(
            "ah-3-e",
            65.5,
            "54%",
            "of active users have a savings goal running",
          ),
        ],
      }),
      slide({
        id: "ah-4",
        layout: "blank",
        background: CREAM,
        notes:
          "Shout-outs from the kudos channel this month. Read each one out, then a round of applause.",
        elements: [
          heading("ah-4-a", [7.5, 7, 85, 10], "Shout-outs", 52, { color: INK }),
          ...kudos(
            "ah-4-b",
            7.5,
            24,
            "Amani Otieno",
            "Rebuilt the M-Pesa top-up flow in a week when the old one broke on payday.",
            -2,
          ),
          ...kudos(
            "ah-4-c",
            36.5,
            22,
            "Rita Sousa",
            "Answered 900 support tickets in the launch week and still wrote the FAQ.",
            1.5,
          ),
          ...kudos(
            "ah-4-d",
            65.5,
            25,
            "Leo Marchetti",
            "Cut app start time from 3.1 to 1.2 seconds on low-end Android phones.",
            -1,
          ),
          ...kudos(
            "ah-4-e",
            7.5,
            60,
            "Fatima Bello",
            "Ran the first user research trip to Kisumu and brought back 40 interviews.",
            1,
          ),
          ...kudos(
            "ah-4-f",
            36.5,
            61,
            "Diogo Alves",
            "Got us through the central bank audit with zero findings.",
            -1.5,
          ),
          ...kudos(
            "ah-4-g",
            65.5,
            59,
            "Nia Kamau",
            "Onboarded six new engineers and wrote the guide everyone now uses.",
            2,
          ),
        ],
      }),
      slide({
        id: "ah-5",
        layout: "blank",
        notes:
          "Now is committed. Next is planned but can move. Later is direction, not a promise. Questions about any of it go to the AMA.",
        elements: [
          heading("ah-5-a", [7.5, 8, 85, 10], "Roadmap"),
          ...column("ah-5-b", 7.5, "Now", INK, WHITE, [
            "Shared goals for families",
            "Faster bank transfers in Kenya",
            "New onboarding, 3 screens",
          ]),
          ...column("ah-5-c", 36.5, "Next", WHITE, INK, [
            "Round-ups on card spend",
            "Savings challenges",
            "Portuguese and Swahili",
          ]),
          ...column("ah-5-d", 65.5, "Later", DEEP, WHITE, [
            "Micro-investing",
            "Employer payroll saving",
            "Launch in Tanzania",
          ]),
        ],
      }),
      slide({
        id: "ah-6",
        layout: "blank",
        notes:
          "Four new people this month. Say hi in the welcome thread and grab them for a coffee.",
        elements: [
          heading("ah-6-a", [7.5, 8, 85, 10], "New faces"),
          ...joiner(
            "ah-6-b",
            7.5,
            "WN",
            "Wanjiru Njoroge",
            "Android engineer, Nairobi",
            WHITE,
          ),
          ...joiner(
            "ah-6-c",
            29,
            "TC",
            "Tiago Costa",
            "Product designer, Lisbon",
            CREAM,
          ),
          ...joiner(
            "ah-6-d",
            50.5,
            "ES",
            "Esi Mensah",
            "Risk analyst, remote",
            WHITE,
          ),
          ...joiner(
            "ah-6-e",
            72,
            "BR",
            "Bruno Reis",
            "Data engineer, Lisbon",
            CREAM,
          ),
        ],
      }),
      slide({
        id: "ah-7",
        layout: "blank",
        background: INK,
        notes:
          "Top-voted questions first. Anything we cannot answer live gets a written answer in the wiki by Monday.",
        elements: [
          shape("ah-7-a", "bubble", [7.5, 14, 46, 60], "accent"),
          text("ah-7-b", [10, 24, 40, 30], p("Ask us anything."), {
            font: "title",
            size: 80,
            color: INK,
          }),
          text(
            "ah-7-c",
            [60, 24, 33, 50],
            p(
              "Post questions in <strong>#all-hands</strong> and upvote the ones you want answered.",
              "Anonymous form is pinned in the channel.",
            ),
            { size: 26, color: CREAM },
          ),
          icon("ah-7-d", "message-circle", 60, 72, 5, "accent", {
            strokeWidth: 1.5,
          }),
        ],
      }),
      slide({
        id: "ah-8",
        layout: "blank",
        notes:
          "Thanks everyone. Drinks on the terrace in Lisbon, and the Nairobi office has pizza on the way.",
        elements: [
          heading("ah-8-a", [7, 26, 86, 30], "See you on 18 December.", 104),
          text(
            "ah-8-b",
            [7.5, 62, 60, 10],
            p("Next all hands is the year-end edition. Bring a guest."),
            { size: 28 },
          ),
          icon("ah-8-c", "pizza", 84, 72, 8, INK, { strokeWidth: 1.5 }),
        ],
      }),
    ],
  },
};
