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

const INK = "#111111";
const CARD = "#1D1D1B";
const LINE = "#2E2E2B";

const play = (
  id: string,
  x: number,
  n: string,
  glyph: string,
  name: string,
  body: string,
) => [
  shape(`${id}-a`, "rounded", [x, 30, 27, 60], CARD, { radius: 20 }),
  text(`${id}-b`, [x + 2.5, 33, 10, 12], p(n), {
    font: "title",
    size: 64,
    color: "accent",
  }),
  icon(`${id}-c`, glyph, x + 20, 35, 4.5, "fg", { strokeWidth: 1.5 }),
  text(`${id}-d`, [x + 2.5, 52, 22, 8], p(`<strong>${name}</strong>`), {
    size: 28,
  }),
  text(`${id}-e`, [x + 2.5, 62, 22, 24], p(body), { size: 19, opacity: 0.72 }),
];

export const salesKickoff: SlideTemplate = {
  id: "sales-kickoff",
  name: "Sales Kickoff",
  category: "Business",
  description:
    "Black and electric-lime kickoff deck: last year in numbers, wins and misses, quota chart, three plays, territories and President's Club.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "volt",
    transition: "slide",
    slides: [
      slide({
        id: "sko-1",
        layout: "blank",
        notes:
          "Walk on to music. Let the slide sit for five seconds, then: last year we proved the product sells itself to logistics teams. This year we prove we can sell it to everyone else.",
        elements: [
          shape("sko-1-a", "rect", [0, 78, 100, 22], "accent"),
          shape("sko-1-b", "rect", [0, 74, 100, 1.2], "accent"),
          shape("sko-1-c", "rect", [0, 70.5, 100, 0.6], "accent"),
          kicker("sko-1-d", [7.5, 12, 50, 5], "TIDEWATER / SALES KICKOFF"),
          heading("sko-1-e", [7, 20, 86, 40], "FY27. Win the mid-market.", 120),
          text(
            "sko-1-f",
            [7.5, 84, 60, 8],
            p("Lisbon, 12 to 14 January 2027"),
            {
              size: 28,
              color: INK,
            },
          ),
          icon("sko-1-g", "zap", 86, 81, 6.5, INK, { strokeWidth: 2 }),
        ],
      }),
      slide({
        id: "sko-2",
        layout: "agenda",
        notes:
          "Three days, but this is today. Breakouts after lunch are by segment, check your badge colour.",
        html: {
          title: p("Day one"),
          body: p(
            "FY26 in numbers, Dana Okafor",
            "What we learned from 312 closed deals",
            "FY27 targets and the three plays",
            "Territories and new pods",
            "President's Club reveal",
          ),
        },
        elements: [
          shape("sko-2-a", "circle", [84, -16, 26, sq(26)], "accent"),
          icon("sko-2-b", "calendar", 89, 6, 6, INK, { strokeWidth: 1.75 }),
        ],
      }),
      slide({
        id: "sko-3",
        layout: "blank",
        notes:
          "The headline is the 118 percent. Then the three supporting numbers: deal size up, cycle down, net retention over 120. Pause on the cycle time, that is the team's work, not the market.",
        elements: [
          kicker("sko-3-a", [7.5, 10, 40, 5], "FY26 IN NUMBERS"),
          text("sko-3-b", [6.5, 15, 60, 34], p("$48.2M"), {
            font: "title",
            size: 190,
            color: "accent",
          }),
          text(
            "sko-3-c",
            [7.5, 50, 50, 8],
            p("new bookings. <strong>118% of plan.</strong>"),
            { size: 34 },
          ),
          shape("sko-3-d", "rect", [7.5, 66, 85, 0.3], LINE),
          text("sko-3-e", [7.5, 70, 26, 12], p("$61k"), {
            font: "title",
            size: 64,
          }),
          text("sko-3-f", [37, 70, 26, 12], p("47 days"), {
            font: "title",
            size: 64,
          }),
          text("sko-3-g", [66.5, 70, 26, 12], p("124%"), {
            font: "title",
            size: 64,
          }),
          text("sko-3-h", [7.5, 83, 26, 6], p("average deal, up 22%"), {
            size: 20,
            opacity: 0.65,
          }),
          text("sko-3-i", [37, 83, 26, 6], p("sales cycle, down from 71"), {
            size: 20,
            opacity: 0.65,
          }),
          text("sko-3-j", [66.5, 83, 26, 6], p("net revenue retention"), {
            size: 20,
            opacity: 0.65,
          }),
        ],
      }),
      slide({
        id: "sko-4",
        layout: "blank",
        notes:
          "Be honest on the right-hand side. We lost eleven deals over 200k to procurement stalls. That is a process problem we can fix, and the plays address it directly.",
        elements: [
          heading(
            "sko-4-a",
            [7.5, 8, 85, 10],
            "What we learned from 312 deals",
          ),
          shape("sko-4-b", "rounded", [7.5, 26, 41, 64], CARD, { radius: 20 }),
          shape("sko-4-c", "rounded", [51.5, 26, 41, 64], "none", {
            radius: 20,
            stroke: LINE,
            strokeWidth: 2,
          }),
          icon("sko-4-d", "circle-check", 10.5, 31, 4, "accent"),
          icon("sko-4-e", "circle-alert", 54.5, 31, 4, "fg"),
          text("sko-4-f", [16, 31.5, 30, 7], p("<strong>Keep doing</strong>"), {
            size: 28,
          }),
          text(
            "sko-4-g",
            [60, 31.5, 30, 7],
            p("<strong>Fix this year</strong>"),
            {
              size: 28,
            },
          ),
          text(
            "sko-4-h",
            [10.5, 44, 36, 44],
            ul(
              "Live route demos in the first call: 2.3x win rate",
              "Ops champions, not IT, as the first contact",
              "Pilots capped at 30 days with a signed success plan",
            ),
            { size: 22 },
          ),
          text(
            "sko-4-i",
            [54.5, 44, 36, 44],
            ul(
              "11 deals over $200k stalled in procurement",
              "Security review started too late, average 19 days",
              "Discounting above 20% without a multi-year term",
            ),
            { size: 22 },
          ),
        ],
      }),
      slide({
        id: "sko-5",
        layout: "blank",
        notes:
          "Seventy-two million is the number. It is back-weighted because the mid-market pods ramp through Q2. Your individual quota letters go out Friday.",
        elements: [
          kicker("sko-5-a", [7.5, 12, 36, 5], "FY27 TARGET"),
          text("sko-5-b", [6.5, 18, 40, 22], p("$72M"), {
            font: "title",
            size: 132,
            color: "accent",
          }),
          text(
            "sko-5-c",
            [7.5, 46, 32, 30],
            p(
              "New bookings, up 49%. Mid-market carries 40% of it, up from 12% last year.",
            ),
            { size: 26 },
          ),
          shape("sko-5-d", "rounded", [46, 10, 47, 80], CARD, { radius: 24 }),
          chart(
            "sko-5-e",
            "bar",
            [49, 16, 41, 68],
            ["Q1", "Q2", "Q3", "Q4"],
            [13, 16.5, 19, 23.5],
            "accent",
          ),
        ],
      }),
      slide({
        id: "sko-6",
        layout: "blank",
        notes:
          "Three plays, and every deal should run at least one. Enablement sessions for each play are tomorrow morning.",
        elements: [
          heading("sko-6-a", [7.5, 8, 85, 10], "Three plays for FY27"),
          text(
            "sko-6-b",
            [7.5, 19, 85, 5],
            p(
              "Every opportunity in the CRM gets tagged with its play by stage two.",
            ),
            { size: 22, opacity: 0.7 },
          ),
          ...play(
            "sko-6-c",
            7.5,
            "01",
            "target",
            "Land with ops",
            "Book the dispatcher demo before the exec call. Champions close 2.3x more.",
          ),
          ...play(
            "sko-6-d",
            36.5,
            "02",
            "shield-check",
            "Security on day one",
            "Send the trust pack with the first proposal. Target: review done in 7 days.",
          ),
          ...play(
            "sko-6-e",
            65.5,
            "03",
            "repeat",
            "Expand in 90",
            "Every new logo gets a second-site plan at the 90-day business review.",
          ),
        ],
      }),
      slide({
        id: "sko-7",
        layout: "blank",
        notes:
          "New pod structure. Each pod is one AE lead, two AEs, one SE and a shared SDR. Leads, stand up when I call your region.",
        elements: [
          heading("sko-7-a", [7.5, 8, 85, 10], "Territories and pods"),
          ...table(
            "sko-7-b",
            [7.5, 24, 85],
            [3, 3, 2, 2],
            [
              ["REGION", "POD LEAD", "QUOTA", "FOCUS"],
              ["Iberia and France", "Ana Ribeiro", "$14.0M", "Enterprise"],
              ["DACH and Nordics", "Jonas Berg", "$16.5M", "Enterprise"],
              ["UK and Ireland", "Priya Nair", "$12.0M", "Mid-market"],
              ["Benelux", "Tom de Wit", "$9.5M", "Mid-market"],
              ["North America", "Kayla Brooks", "$20.0M", "Both"],
            ],
            { rowH: 10.5, size: 24, band: CARD },
          ),
        ],
      }),
      slide({
        id: "sko-8",
        layout: "quote",
        notes:
          "This came from the Hapag pilot debrief. Read it, then hand to Ana for the two-minute story of how that deal was won.",
        html: {
          quote: p(
            "Your rep spent a morning in our yard before she ever showed us a slide. That is why we signed.",
          ),
          attribution: p(
            "Marta Lindqvist, Head of Operations, Nordhavn Logistics",
          ),
        },
        elements: [shape("sko-8-a", "rect", [0, 96, 100, 4], "accent")],
      }),
      slide({
        id: "sko-9",
        layout: "blank",
        background: "grad-night",
        notes:
          "Close with the trip. Qualify at 110 percent of quota and you are on the plane to Madeira. Then music, and everyone to the breakouts.",
        elements: [
          shape("sko-9-a", "circle", [58, 10, 34, sq(34)], "accent"),
          icon("sko-9-b", "trophy", 67, 26, 16, INK, { strokeWidth: 1.25 }),
          kicker("sko-9-c", [7.5, 14, 40, 5], "PRESIDENT'S CLUB 2027"),
          heading(
            "sko-9-d",
            [7.5, 22, 46, 30],
            "Madeira. Four days. Plus one.",
            72,
          ),
          text(
            "sko-9-e",
            [7.5, 58, 44, 18],
            p(
              "Hit 110% of your annual number and you are on the plane in June.",
            ),
            { size: 26, opacity: 0.8 },
          ),
          text("sko-9-f", [58, 82, 34, 6], pc("Go get it."), {
            font: "title",
            size: 36,
          }),
        ],
      }),
    ],
  },
};
