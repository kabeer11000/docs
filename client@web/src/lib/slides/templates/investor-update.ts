import {
  chart,
  heading,
  icon,
  kicker,
  p,
  shape,
  slide,
  sq,
  table,
  text,
  ul,
} from "./build";
import type { SlideTemplate } from "./types";

const DEEP = "#082230";
const CARD = "#103A48";
const LINE = "#1E5263";
const CORAL = "#FF8A65";

const metric = (
  id: string,
  x: number,
  y: number,
  label: string,
  value: string,
  note: string,
) => [
  shape(`${id}-a`, "rounded", [x, y, 27, 28], CARD, { radius: 18 }),
  kicker(`${id}-b`, [x + 2, y + 3, 23, 5], label, "accent", 15),
  text(`${id}-c`, [x + 2, y + 9, 23, 11], p(value), {
    font: "title",
    size: 52,
  }),
  text(`${id}-d`, [x + 2, y + 20, 23, 6], p(note), { size: 17, opacity: 0.65 }),
];

const ask = (
  id: string,
  y: number,
  glyph: string,
  title: string,
  body: string,
) => [
  shape(`${id}-a`, "circle", [50, y, 6, sq(6)], "accent"),
  icon(`${id}-b`, glyph, 51.5, y + 2.6, 3, DEEP, { strokeWidth: 2 }),
  text(`${id}-c`, [59, y - 0.5, 34, 6], p(`<strong>${title}</strong>`), {
    size: 24,
  }),
  text(`${id}-d`, [59, y + 5.5, 34, 10], p(body), { size: 18, opacity: 0.7 }),
];

export const investorUpdate: SlideTemplate = {
  id: "investor-update",
  name: "Monthly Investor Update",
  category: "Business",
  description:
    "Deep teal monthly update for existing investors: TL;DR, six-metric dashboard, growth chart, highlights and lowlights, pipeline and asks.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "lagoon",
    transition: "fade",
    slides: [
      slide({
        id: "inv-1",
        layout: "blank",
        notes:
          "Monthly update, sent as a deck and walked through live on the investor call. Keep it under fifteen minutes.",
        elements: [
          shape("inv-1-a", "circle", [56, -10, 60, sq(60)], "none", {
            stroke: LINE,
            strokeWidth: 2,
          }),
          shape("inv-1-b", "circle", [64, 4, 44, sq(44)], "none", {
            stroke: LINE,
            strokeWidth: 2,
          }),
          shape("inv-1-c", "circle", [72, 18, 28, sq(28)], "accent"),
          icon("inv-1-d", "leaf", 80, 32, 12, DEEP, { strokeWidth: 1.5 }),
          kicker("inv-1-e", [7.5, 12, 40, 5], "SPROUTLY / INVESTOR UPDATE"),
          heading("inv-1-f", [7, 24, 52, 34], "October 2026", 112),
          text(
            "inv-1-g",
            [7.5, 62, 44, 14],
            p("Greenhouse sensors and climate control for growers in Europe."),
            {
              size: 26,
              opacity: 0.75,
            },
          ),
          text(
            "inv-1-h",
            [7.5, 86, 50, 5],
            p("Confidential. Please do not forward."),
            { size: 16, opacity: 0.5 },
          ),
        ],
      }),
      slide({
        id: "inv-2",
        layout: "blank",
        notes:
          "If you read one slide, read this one. The Westland deal is the largest in our history and anchors the Netherlands.",
        elements: [
          kicker("inv-2-a", [7.5, 10, 40, 5], "TL;DR"),
          text("inv-2-b", [6.5, 16, 50, 30], p("+14%"), {
            font: "title",
            size: 190,
            color: "accent",
          }),
          text(
            "inv-2-c",
            [7.5, 50, 40, 10],
            p("MRR growth month on month, our best since launch."),
            {
              size: 26,
            },
          ),
          shape("inv-2-d", "rect", [54, 18, 0.3, 66], LINE),
          text(
            "inv-2-e",
            [58, 18, 35, 66],
            ul(
              "Signed Westland Growers: 62 greenhouses, EUR 340k ARR",
              "Gross margin up to 64% on the new sensor board",
              "Hardware lead times slipped two weeks, now recovered",
              "Runway is 22 months",
            ),
            { size: 24 },
          ),
        ],
      }),
      slide({
        id: "inv-3",
        layout: "blank",
        notes:
          "Same six numbers every month so you can compare. Definitions are in the appendix of the email.",
        elements: [
          heading("inv-3-a", [7.5, 7, 85, 10], "The numbers"),
          ...metric("inv-3-b", 7.5, 24, "MRR", "EUR 186k", "+14% vs September"),
          ...metric("inv-3-c", 36.5, 24, "CUSTOMERS", "214", "+19 this month"),
          ...metric(
            "inv-3-d",
            65.5,
            24,
            "NET RETENTION",
            "131%",
            "trailing 12 months",
          ),
          ...metric(
            "inv-3-e",
            7.5,
            58,
            "NET BURN",
            "EUR 290k",
            "-8% vs September",
          ),
          ...metric(
            "inv-3-f",
            36.5,
            58,
            "RUNWAY",
            "22 months",
            "EUR 6.4M in the bank",
          ),
          ...metric("inv-3-g", 65.5, 58, "HEADCOUNT", "41", "+3, see hiring"),
        ],
      }),
      slide({
        id: "inv-4",
        layout: "blank",
        notes:
          "Twelve months of MRR. The flat patch in spring was the sensor recall; growth has compounded since.",
        elements: [
          kicker("inv-4-a", [7.5, 10, 40, 5], "GROWTH"),
          heading("inv-4-b", [7.5, 15, 85, 10], "MRR, EUR thousands"),
          shape("inv-4-c", "rounded", [7.5, 28, 85, 64], CARD, { radius: 24 }),
          chart(
            "inv-4-d",
            "line",
            [10, 32, 80, 56],
            [
              "Nov",
              "Dec",
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
            ],
            [72, 79, 88, 96, 97, 99, 108, 121, 134, 149, 163, 186],
            "accent",
          ),
        ],
      }),
      slide({
        id: "inv-5",
        layout: "blank",
        notes:
          "We always share the lowlights. The hardware delay is fixed, the churned account is a lesson about onboarding.",
        elements: [
          heading("inv-5-a", [7.5, 8, 85, 10], "Highlights and lowlights"),
          shape("inv-5-b", "rect", [7.5, 26, 41, 1], "accent"),
          shape("inv-5-c", "rect", [51.5, 26, 41, 1], CORAL),
          icon("inv-5-d", "thumbs-up", 7.5, 31, 3.5, "accent"),
          icon("inv-5-e", "thumbs-down", 51.5, 31, 3.5, CORAL),
          text(
            "inv-5-f",
            [7.5, 42, 41, 48],
            ul(
              "Westland Growers signed after a 4-month pilot",
              "Launched the tomato yield model, 9% better forecasts",
              "First reseller in Spain, 11 growers in the first month",
            ),
            { size: 22 },
          ),
          text(
            "inv-5-g",
            [51.5, 42, 41, 48],
            ul(
              "Sensor board shipment slipped two weeks at the factory",
              "Lost Bloemhof (EUR 18k ARR): onboarding was too slow",
              "Senior firmware hire fell through at offer stage",
            ),
            { size: 22 },
          ),
        ],
      }),
      slide({
        id: "inv-6",
        layout: "blank",
        notes:
          "Pipeline for the next two quarters, weighted by stage. Two of these are where we need your intros.",
        elements: [
          heading("inv-6-a", [7.5, 8, 85, 10], "Pipeline"),
          ...table(
            "inv-6-b",
            [7.5, 24, 85],
            [4, 2, 2, 2],
            [
              ["ACCOUNT", "ARR", "STAGE", "CLOSE"],
              ["Agro Almeria Coop", "EUR 210k", "Pilot", "Dec"],
              ["Hortimax Belgium", "EUR 150k", "Proposal", "Jan"],
              ["Nordic Greens", "EUR 95k", "Pilot", "Jan"],
              ["Kent Berry Farms", "EUR 80k", "Discovery", "Mar"],
              ["Weighted total", "EUR 312k", "", "Q1"],
            ],
            { rowH: 10.5, size: 22, band: CARD },
          ),
        ],
      }),
      slide({
        id: "inv-7",
        layout: "blank",
        notes:
          "Three concrete asks. Reply to the email or message me directly if you can help with any of them.",
        elements: [
          kicker("inv-7-a", [7.5, 14, 36, 5], "HOW YOU CAN HELP"),
          heading("inv-7-b", [7.5, 20, 38, 40], "Three asks this month", 64),
          text(
            "inv-7-c",
            [7.5, 66, 36, 16],
            p("Even one intro makes a real difference at our stage."),
            {
              size: 22,
              opacity: 0.7,
            },
          ),
          ...ask(
            "inv-7-d",
            16,
            "users",
            "A senior firmware engineer",
            "Embedded C, low-power radio. Remote in the EU is fine.",
          ),
          ...ask(
            "inv-7-e",
            42,
            "handshake",
            "Intro to Hortimax leadership",
            "We are in proposal; a warm voice would help.",
          ),
          ...ask(
            "inv-7-f",
            68,
            "banknote",
            "Debt providers for hardware",
            "Financing sensor stock, roughly EUR 1.5M.",
          ),
        ],
      }),
      slide({
        id: "inv-8",
        layout: "blank",
        background: "grad-accent",
        notes:
          "Thank you for the support. Next update lands the first week of December.",
        elements: [
          heading("inv-8-a", [7.5, 30, 70, 20], "Thank you.", 120),
          text(
            "inv-8-b",
            [7.5, 56, 60, 12],
            p("Marit Jansen, CEO / marit@sproutly.farm"),
            { size: 28 },
          ),
        ],
      }),
    ],
  },
};
