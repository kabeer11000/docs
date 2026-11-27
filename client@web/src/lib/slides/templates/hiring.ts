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

const INK = "#121418";
const DEEP = "#1A2A9E";
const SKY = "#A9D4FF";
const PEACH = "#FFC59E";
const MINT = "#9FF0C4";

const principle = (
  id: string,
  x: number,
  y: number,
  glyph: string,
  title: string,
  body: string,
) => [
  shape(`${id}-a`, "rounded", [x, y, 41, 30], DEEP, { radius: 20 }),
  icon(`${id}-b`, glyph, x + 2.5, y + 4.5, 4, "accent", { strokeWidth: 1.75 }),
  text(`${id}-c`, [x + 9, y + 4, 30, 7], p(`<strong>${title}</strong>`), {
    size: 26,
  }),
  text(`${id}-d`, [x + 9, y + 12, 30, 16], p(body), { size: 19, opacity: 0.8 }),
];

const person = (
  id: string,
  x: number,
  y: number,
  initials: string,
  name: string,
  role: string,
  fill: string,
) => [
  shape(`${id}-a`, "circle", [x + 4.5, y, 9, sq(9)], fill),
  text(`${id}-b`, [x + 4.5, y + 5, 9, 7], pc(initials), {
    font: "title",
    size: 32,
    color: INK,
  }),
  text(`${id}-c`, [x, y + 17.5, 18, 10], pc(`<strong>${name}</strong>`, role), {
    size: 16,
  }),
];

const step = (
  id: string,
  x: number,
  n: string,
  title: string,
  body: string,
  last = false,
) => [
  shape(`${id}-a`, "circle", [x, 32, 8, sq(8)], "accent"),
  text(`${id}-b`, [x, 37, 8, 6], pc(n), {
    font: "title",
    size: 34,
    color: INK,
  }),
  ...(last
    ? []
    : [
        icon(`${id}-c`, "arrow-right", x + 13, 36.5, 3, "fg", { opacity: 0.5 }),
      ]),
  text(`${id}-d`, [x - 2, 52, 20, 7], p(`<strong>${title}</strong>`), {
    size: 24,
  }),
  text(`${id}-e`, [x - 2, 60, 19, 26], p(body), { size: 18, opacity: 0.8 }),
];

export const hiring: SlideTemplate = {
  id: "hiring",
  name: "Hiring Pitch",
  category: "Business",
  description:
    "Cobalt recruiting deck for candidates and career fairs: mission, numbers, how we work, the team, benefits, interview steps and open roles.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "ink",
    transition: "slide",
    slides: [
      slide({
        id: "hire-1",
        layout: "blank",
        background: "pat-dots",
        notes:
          "Used at career fairs and sent to every candidate before the first call. Keep it honest: what we do, how we work, how hiring works.",
        elements: [
          shape("hire-1-a", "star", [70, 12, 20, sq(20)], "accent", {
            rotation: 12,
          }),
          shape("hire-1-b", "circle", [62, 58, 12, sq(12)], SKY),
          shape("hire-1-c", "rounded", [82, 62, 10, sq(10)], PEACH, {
            rotation: -10,
            radius: 18,
          }),
          kicker("hire-1-d", [7.5, 12, 40, 5], "ORBITAL / CAREERS"),
          heading(
            "hire-1-e",
            [7, 22, 60, 44],
            "Come build the weather map of space.",
            84,
          ),
          text(
            "hire-1-f",
            [7.5, 74, 50, 10],
            p("We are hiring 14 people in 2027. Here is what that looks like."),
            {
              size: 26,
            },
          ),
        ],
      }),
      slide({
        id: "hire-2",
        layout: "quote",
        notes:
          "Our mission in one line. Every role, from finance to firmware, connects back to it.",
        html: {
          quote: p(
            "Every satellite operator should know about a space-weather storm a day before it hits.",
          ),
          attribution: p("Our mission, since 2022"),
        },
      }),
      slide({
        id: "hire-3",
        layout: "blank",
        notes:
          "Why now: we are small enough that you will shape it, big enough that it is not a coin flip.",
        elements: [
          kicker("hire-3-a", [7.5, 10, 40, 5], "WHERE WE ARE"),
          heading(
            "hire-3-b",
            [7.5, 15, 85, 10],
            "Small team, serious traction",
          ),
          ...[
            ["38", "people across Delft, Toulouse and remote"],
            ["2,600", "satellites protected by our forecasts"],
            ["EUR 22M", "Series A, led by Fly Ventures, 2025"],
          ].flatMap(([v, l], i) => [
            text(`hire-3-c${i}`, [7.5 + i * 29.5, 34, 27, 18], p(v), {
              font: "title",
              size: 88,
              color: "accent",
            }),
            shape(`hire-3-d${i}`, "rect", [7.5 + i * 29.5, 56, 27, 0.5], "fg", {
              opacity: 0.3,
            }),
            text(`hire-3-e${i}`, [7.5 + i * 29.5, 60, 25, 20], p(l), {
              size: 24,
            }),
          ]),
        ],
      }),
      slide({
        id: "hire-4",
        layout: "blank",
        notes:
          "These are the four things candidates ask about most. Be specific about the writing culture, it is not for everyone.",
        elements: [
          heading("hire-4-a", [7.5, 7, 85, 10], "How we work"),
          ...principle(
            "hire-4-b",
            7.5,
            24,
            "file-text",
            "We write things down",
            "Decisions start as a two-page memo. Meetings are for discussing, not presenting.",
          ),
          ...principle(
            "hire-4-c",
            51.5,
            24,
            "clock",
            "Core hours, not office hours",
            "Be online 11:00 to 15:00 CET. The rest of your day is yours.",
          ),
          ...principle(
            "hire-4-d",
            7.5,
            60,
            "rocket",
            "Ship weekly",
            "Every team demos something real on Friday, even if it is small.",
          ),
          ...principle(
            "hire-4-e",
            51.5,
            60,
            "shield-check",
            "Blameless by default",
            "Incidents get a write-up and a fix, never a culprit.",
          ),
        ],
      }),
      slide({
        id: "hire-5",
        layout: "blank",
        notes:
          "A few of the people you will meet in the process. Hiring managers are on the top row.",
        elements: [
          heading("hire-5-a", [7.5, 7, 85, 10], "People you will work with"),
          ...person("hire-5-b", 7.5, 24, "EV", "Eva Visser", "CEO", "#FFE45C"),
          ...person(
            "hire-5-c",
            28.5,
            24,
            "KB",
            "Karim Benali",
            "Head of Engineering",
            SKY,
          ),
          ...person(
            "hire-5-d",
            49.5,
            24,
            "SL",
            "Sofia Lund",
            "Lead Scientist",
            PEACH,
          ),
          ...person(
            "hire-5-e",
            70.5,
            24,
            "MO",
            "Mateo Ortiz",
            "Design Lead",
            MINT,
          ),
          ...person(
            "hire-5-f",
            7.5,
            60,
            "AN",
            "Aiko Nakamura",
            "Data Platform",
            PEACH,
          ),
          ...person(
            "hire-5-g",
            28.5,
            60,
            "JD",
            "Jules Durand",
            "Customer Success",
            MINT,
          ),
          ...person(
            "hire-5-h",
            49.5,
            60,
            "RG",
            "Rosa Gil",
            "People and Talent",
            "#FFE45C",
          ),
          ...person("hire-5-i", 70.5, 60, "TO", "Tunde Ojo", "Firmware", SKY),
        ],
      }),
      slide({
        id: "hire-6",
        layout: "blank",
        notes: "The benefits page. Equity is for everyone, from day one.",
        elements: [
          heading("hire-6-a", [7.5, 7, 85, 10], "What you get"),
          ...[
            [
              "gem",
              "Equity for everyone",
              "Options from day one, 10-year exercise window.",
            ],
            [
              "plane",
              "30 days off",
              "Plus a company-wide week off at New Year.",
            ],
            [
              "laptop",
              "Your setup",
              "EUR 2,500 for equipment, refreshed every 3 years.",
            ],
            [
              "graduation-cap",
              "Learning budget",
              "EUR 1,500 a year for courses and conferences.",
            ],
            [
              "heart-pulse",
              "Health cover",
              "Private health and mental health support.",
            ],
            [
              "users",
              "Off-sites twice a year",
              "Last ones: Porto and the Dolomites.",
            ],
          ].flatMap(([g, t, b], i) => {
            const x = 7.5 + (i % 3) * 29.5;
            const y = 26 + Math.floor(i / 3) * 34;
            return [
              icon(`hire-6-i${i}`, g, x, y, 4, "accent", { strokeWidth: 1.75 }),
              text(
                `hire-6-t${i}`,
                [x, y + 9, 27, 7],
                p(`<strong>${t}</strong>`),
                { size: 24 },
              ),
              text(`hire-6-b${i}`, [x, y + 16, 26, 12], p(b), {
                size: 18,
                opacity: 0.8,
              }),
            ];
          }),
        ],
      }),
      slide({
        id: "hire-7",
        layout: "blank",
        notes:
          "Four steps, about three weeks end to end. We pay for the take-home and give written feedback at every stage.",
        elements: [
          heading("hire-7-a", [7.5, 8, 85, 10], "How hiring works"),
          ...step(
            "hire-7-b",
            9.5,
            "1",
            "Intro call",
            "30 minutes with Rosa about you, the role and pay range.",
          ),
          ...step(
            "hire-7-c",
            31.5,
            "2",
            "Paid exercise",
            "A real problem, 4 hours max. We pay EUR 400 for your time.",
          ),
          ...step(
            "hire-7-d",
            53.5,
            "3",
            "Team day",
            "Walk us through it, then meet the people you would work with.",
          ),
          ...step(
            "hire-7-e",
            75.5,
            "4",
            "Offer",
            "Within 3 working days, with written feedback either way.",
            true,
          ),
        ],
      }),
      slide({
        id: "hire-8",
        layout: "blank",
        notes:
          "Current openings. All roles have published salary bands on the careers page.",
        elements: [
          heading("hire-8-a", [7.5, 8, 85, 10], "Open roles"),
          ...table(
            "hire-8-b",
            [7.5, 24, 85],
            [4, 2, 2, 2],
            [
              ["ROLE", "TEAM", "WHERE", "BAND, EUR"],
              [
                "Senior Backend Engineer",
                "Platform",
                "Delft or remote",
                "85-105k",
              ],
              ["Space Weather Scientist", "Science", "Toulouse", "70-90k"],
              ["Product Designer", "Design", "Remote, EU", "65-85k"],
              ["Embedded Engineer", "Firmware", "Delft", "75-95k"],
              ["Account Executive", "Sales", "Remote, US East", "USD 90-110k"],
            ],
            { rowH: 10.5, size: 22, band: DEEP },
          ),
        ],
      }),
      slide({
        id: "hire-9",
        layout: "blank",
        background: "#FFE45C",
        notes:
          "Last slide stays up while people come and talk to us at the stand.",
        elements: [
          heading("hire-9-a", [7, 22, 70, 36], "Your seat is waiting.", 110, {
            color: INK,
          }),
          text("hire-9-b", [7.5, 64, 60, 8], p("jobs@orbital.space"), {
            font: "mono",
            size: 36,
            color: DEEP,
          }),
          text(
            "hire-9-c",
            [7.5, 74, 60, 8],
            p("Not seeing your role? Write anyway, we read everything."),
            {
              size: 24,
              color: INK,
            },
          ),
          shape("hire-9-d", "star", [78, 50, 16, sq(16)], DEEP, {
            rotation: -8,
          }),
        ],
      }),
    ],
  },
};
