import {
  chart,
  heading,
  icon,
  kicker,
  p,
  shape,
  slide,
  table,
  text,
} from "./build";
import type { SlideTemplate } from "./types";

const SOFT = "#F3F4F6";
const GREEN = "#0E9F6E";
const RED = "#E5484D";
const WHITE = "#FFFFFF";

const kpi = (
  id: string,
  x: number,
  label: string,
  value: string,
  delta: string,
  up: boolean,
) => [
  shape(`${id}-a`, "rounded", [x, 28, 20.5, 46], SOFT, { radius: 18 }),
  kicker(`${id}-b`, [x + 2, 32, 17, 5], label, "fg", 16),
  text(`${id}-c`, [x + 2, 41, 17, 14], p(value), { font: "title", size: 60 }),
  icon(
    `${id}-d`,
    up ? "trending-up" : "trending-down",
    x + 2,
    62,
    2.6,
    up ? GREEN : RED,
    {
      strokeWidth: 2,
    },
  ),
  text(`${id}-e`, [x + 5, 61.5, 14, 6], p(delta), {
    size: 18,
    color: up ? GREEN : RED,
  }),
];

const ask = (id: string, x: number, n: string, title: string, body: string) => [
  text(`${id}-a`, [x, 30, 26, 14], p(n), {
    font: "title",
    size: 80,
    color: "accent",
  }),
  shape(`${id}-b`, "rect", [x, 46, 26, 0.4], "fg", { opacity: 0.2 }),
  text(`${id}-c`, [x, 50, 26, 10], p(`<strong>${title}</strong>`), {
    size: 26,
  }),
  text(`${id}-d`, [x, 61, 26, 28], p(body), { size: 19, opacity: 0.7 }),
];

export const boardUpdate: SlideTemplate = {
  id: "board-update",
  name: "Board Update",
  category: "Business",
  description:
    "Clean quarterly board pack: KPI tiles with deltas, revenue against plan, runway, a risk register and the decisions you need.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "paper",
    transition: "fade",
    slides: [
      slide({
        id: "brd-1",
        layout: "blank",
        notes:
          "Thank the board for the early start. The pre-read went out Monday, so we will spend most of the time on the three decisions at the end.",
        elements: [
          shape("brd-1-a", "rect", [58, 0, 42, 100], "accent"),
          text("brd-1-b", [60, 46, 38, 44], p("Q3"), {
            font: "title",
            size: 240,
            color: WHITE,
          }),
          kicker("brd-1-c", [7.5, 12, 40, 5], "FERNWAY / BOARD OF DIRECTORS"),
          heading("brd-1-d", [7.5, 24, 46, 32], "Quarterly board update", 76),
          shape("brd-1-e", "rect", [7.5, 62, 8, 0.8], "accent"),
          text(
            "brd-1-f",
            [7.5, 67, 44, 16],
            p(
              "Meeting of 21 October 2026. Prepared by Leah Morgan, CEO, and Raj Patel, CFO.",
            ),
            { size: 22, opacity: 0.7 },
          ),
        ],
      }),
      slide({
        id: "brd-2",
        layout: "agenda",
        notes:
          "Ninety minutes. Executive session at the end without management.",
        html: {
          title: p("Agenda"),
          body: p(
            "Quarter at a glance",
            "Revenue against plan",
            "Cash and runway",
            "Top risks",
            "Decisions for the board",
          ),
        },
      }),
      slide({
        id: "brd-3",
        layout: "blank",
        notes:
          "Three of four green. Gross margin dipped because of the one-off migration cost for the Halvorsen account; it recovers in Q4.",
        elements: [
          kicker("brd-3-a", [7.5, 9, 40, 5], "QUARTER AT A GLANCE"),
          heading(
            "brd-3-b",
            [7.5, 14, 85, 10],
            "Ahead of plan on growth, watching margin",
          ),
          ...kpi("brd-3-c", 7.5, "ARR", "$14.6M", "+11% QoQ", true),
          ...kpi("brd-3-d", 29, "NET RETENTION", "118%", "+3 pts", true),
          ...kpi("brd-3-e", 50.5, "CUSTOMERS", "1,284", "+142 net", true),
          ...kpi("brd-3-f", 72, "GROSS MARGIN", "71%", "-4 pts", false),
          text(
            "brd-3-g",
            [7.5, 80, 85, 8],
            p("All figures as of 30 September 2026, unaudited."),
            { size: 18, opacity: 0.5 },
          ),
        ],
      }),
      slide({
        id: "brd-4",
        layout: "blank",
        notes:
          "We crossed plan in August and stayed above it. The September jump is the two enterprise deals that slipped from Q2.",
        elements: [
          kicker("brd-4-a", [7.5, 9, 40, 5], "REVENUE AGAINST PLAN"),
          heading(
            "brd-4-b",
            [7.5, 14, 40, 22],
            "Monthly recurring revenue, $k",
            44,
          ),
          text(
            "brd-4-c",
            [7.5, 40, 32, 40],
            p(
              "<strong>$1.22M</strong> MRR in September, 6% above plan.",
              "Enterprise is now 38% of new revenue, up from 21% a year ago.",
            ),
            { size: 22 },
          ),
          chart(
            "brd-4-d",
            "line",
            [44, 12, 50, 76],
            ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
            [960, 1005, 1040, 1090, 1150, 1220],
            "accent",
          ),
        ],
      }),
      slide({
        id: "brd-5",
        layout: "big-number",
        notes:
          "Runway at current burn is 26 months. With the hiring plan in decision two it drops to 21, still past the Series B window.",
        html: {
          stat: p("26 months"),
          caption: p(
            "of runway on $18.9M cash at the current $720k monthly net burn. Break-even forecast: Q1 2028.",
          ),
        },
        elements: [kicker("brd-5-a", [7.5, 7, 40, 5], "CASH AND RUNWAY")],
      }),
      slide({
        id: "brd-6",
        layout: "blank",
        notes:
          "One new risk this quarter: the card network fee change. Raj has a plan, we will cover it in detail if there are questions.",
        elements: [
          heading("brd-6-a", [7.5, 8, 85, 10], "Top risks"),
          ...table(
            "brd-6-b",
            [7.5, 24, 85],
            [4, 2, 2, 5],
            [
              ["RISK", "LIKELIHOOD", "OWNER", "MITIGATION"],
              [
                "Card network fee increase",
                "High",
                "Raj Patel",
                "Pass-through clause in new contracts from November",
              ],
              [
                "Key engineer attrition",
                "Medium",
                "Leah Morgan",
                "Refresh grants approved for 14 staff",
              ],
              [
                "EU payroll licence delay",
                "Medium",
                "Ines Kaur",
                "Partner bank fallback signed",
              ],
              [
                "Enterprise deal slippage",
                "Low",
                "Sam Ochoa",
                "Pipeline coverage at 3.4x for Q4",
              ],
            ],
            { rowH: 12, size: 20, band: SOFT },
          ),
        ],
      }),
      slide({
        id: "brd-7",
        layout: "blank",
        notes:
          "These are the three things we need a vote on today. Detailed memos are in the appendix of the pre-read.",
        elements: [
          kicker("brd-7-a", [7.5, 9, 40, 5], "FOR DECISION"),
          heading(
            "brd-7-b",
            [7.5, 14, 85, 10],
            "Three decisions we need today",
          ),
          ...ask(
            "brd-7-c",
            7.5,
            "01",
            "Approve FY27 budget",
            "$31M operating plan, 38 net new hires, break-even in Q1 2028.",
          ),
          ...ask(
            "brd-7-d",
            37,
            "02",
            "Open the Toronto office",
            "Eight engineers in year one. Lease of $210k a year, 3-year term.",
          ),
          ...ask(
            "brd-7-e",
            66.5,
            "03",
            "Expand the option pool",
            "Add 4% to the pool ahead of the Series B to cover senior hires.",
          ),
        ],
      }),
      slide({
        id: "brd-8",
        layout: "blank",
        background: "pat-band",
        notes:
          "Hand over to the chair for the votes, then management leaves for the executive session.",
        elements: [
          icon("brd-8-a", "handshake", 8, 36, 12, WHITE, { strokeWidth: 1.5 }),
          heading("brd-8-b", [36, 30, 56, 20], "Thank you", 96),
          text(
            "brd-8-c",
            [36, 54, 50, 14],
            p(
              "Next meeting: 20 January 2027, Fernway London office. Questions to leah@fernway.com before then.",
            ),
            { size: 24, opacity: 0.75 },
          ),
        ],
      }),
    ],
  },
};
