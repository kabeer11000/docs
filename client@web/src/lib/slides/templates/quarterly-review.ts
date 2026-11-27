import { accent, chart, icon, p, shape, slide, sq, text, ul } from "./build";
import type { SlideTemplate } from "./types";

const TILE = "#F3F4F6";
const GREEN = "#1FA36B";

const kpi = (
  id: string,
  x: number,
  value: string,
  label: string,
  delta: string,
) => [
  shape(`${id}-a`, "rounded", [x, 32, 19.5, 52], TILE, { radius: 20 }),
  icon(`${id}-b`, "trending-up", x + 2, 37, 2.8, GREEN),
  text(`${id}-c`, [x + 5.5, 37.4, 13, 5], p(delta), { size: 18, color: GREEN }),
  text(`${id}-d`, [x + 2, 50, 17, 14], p(value), { font: "title", size: 54 }),
  text(`${id}-e`, [x + 2, 66, 16, 14], p(label), { size: 19, opacity: 0.7 }),
];

const priority = (
  id: string,
  x: number,
  n: string,
  title: string,
  body: string,
) => [
  text(`${id}-a`, [x, 30, 24, 20], p(n), {
    font: "title",
    size: 120,
    color: "accent",
  }),
  shape(`${id}-b`, "rect", [x, 54, 24, 0.5], "fg", { opacity: 0.2 }),
  text(`${id}-c`, [x, 58, 24, 8], p(`<strong>${title}</strong>`), { size: 28 }),
  text(`${id}-d`, [x, 66, 24, 22], p(body), { size: 20, opacity: 0.75 }),
];

export const quarterlyReview: SlideTemplate = {
  id: "quarterly-review",
  name: "Quarterly Business Review",
  category: "Business",
  description:
    "Clean white board-ready review with KPI tiles, revenue line and mix pie charts, wins and misses, and next-quarter priorities.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "paper",
    transition: "slide",
    slides: [
      slide({
        id: "qbr-1",
        layout: "blank",
        background: "pat-band",
        notes:
          "Welcome the board. This is the Q3 review; pre-read went out on Friday so we will move quickly through the numbers and spend most of the time on Q4 priorities.",
        elements: [
          text("qbr-1-a", [3, 26, 24, 34], p("Q3"), {
            font: "title",
            size: 230,
            color: "#FFFFFF",
          }),
          text("qbr-1-b", [3, 70, 22, 6], p("2026"), {
            font: "mono",
            size: 28,
            color: "#FFFFFF",
          }),
          text("qbr-1-c", [34, 14, 40, 5], p("NORTHWIND FREIGHT"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("qbr-1-d", [34, 28, 58, 30], p("Quarterly Business Review"), {
            font: "title",
            size: 76,
          }),
          text(
            "qbr-1-e",
            [34, 64, 52, 14],
            p(
              "July to September 2026. Prepared for the board meeting of 21 October.",
            ),
            {
              size: 26,
              opacity: 0.7,
            },
          ),
          shape("qbr-1-f", "circle", [86, 74, 22, sq(22)], "accent", {
            opacity: 0.15,
          }),
        ],
      }),
      slide({
        id: "qbr-2",
        layout: "agenda",
        notes:
          "Six sections, about forty minutes. Risks are deliberately before priorities so the discussion flows into Q4.",
        html: {
          title: p("Agenda"),
          body: p(
            "Highlights",
            "Revenue and margin",
            "Operations",
            "Customers",
            "Risks and misses",
            "Q4 priorities",
          ),
        },
        elements: [
          shape("qbr-2-a", "circle", [82, -18, 28, sq(28)], "none", {
            stroke: "accent",
            strokeWidth: 3,
          }),
        ],
      }),
      slide({
        id: "qbr-3",
        layout: "blank",
        notes:
          "Four numbers to remember. Revenue and margin both beat plan. On-time delivery is the best since 2019. NPS moved seven points after the tracking redesign.",
        elements: [
          text("qbr-3-a", [7.5, 9, 60, 6], p("HIGHLIGHTS"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("qbr-3-b", [7.5, 15, 80, 10], p("Q3 at a glance"), {
            font: "title",
            size: 56,
          }),
          ...kpi(
            "qbr-3-c",
            7.5,
            "48.2M",
            "EUR revenue, 3% ahead of plan",
            "+12% YoY",
          ),
          ...kpi("qbr-3-d", 29.33, "18.4%", "gross margin", "+1.6 pts"),
          ...kpi("qbr-3-e", 51.16, "97.1%", "on-time delivery", "+2.3 pts"),
          ...kpi("qbr-3-f", 73, "61", "net promoter score", "+7"),
        ],
      }),
      slide({
        id: "qbr-4",
        layout: "blank",
        notes:
          "Monthly revenue in millions of euros. The July dip is the planned shutdown at Rotterdam. September was a record month, driven by two new contract logistics customers.",
        elements: [
          text("qbr-4-a", [7.5, 9, 60, 6], p("REVENUE"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("qbr-4-b", [7.5, 15, 60, 10], p("A record September"), {
            font: "title",
            size: 56,
          }),
          chart(
            "qbr-4-c",
            "line",
            [7.5, 32, 85, 60],
            ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
            [14.2, 14.8, 15.1, 15, 15.9, 16.3, 15.4, 15.7, 17.1],
            "accent",
          ),
          shape("qbr-4-d", "bubble", [66, 8, 26, 20], "#121418"),
          text(
            "qbr-4-e",
            [67.5, 9.8, 23, 10],
            p("<strong>EUR 17.1M</strong> in September, best month ever"),
            {
              size: 18,
              color: "#FFFFFF",
            },
          ),
        ],
      }),
      slide({
        id: "qbr-5",
        layout: "blank",
        notes:
          "Contract logistics is now almost half of revenue, which is what we wanted: it is the highest-margin and stickiest segment. Customs brokerage is small but growing 30% a quarter.",
        elements: [
          text("qbr-5-a", [7.5, 9, 60, 6], p("REVENUE MIX"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("qbr-5-b", [7.5, 15, 80, 10], p("Where the money comes from"), {
            font: "title",
            size: 56,
          }),
          chart(
            "qbr-5-c",
            "pie",
            [7.5, 32, 50, 58],
            [
              "Contract logistics",
              "Cross-border road",
              "Last mile",
              "Customs brokerage",
            ],
            [46, 31, 15, 8],
            "accent",
          ),
          shape("qbr-5-d", "rounded", [62, 32, 30.5, 56], TILE, { radius: 20 }),
          text(
            "qbr-5-e",
            [64.5, 37, 26, 48],
            p(
              "<strong>Mix shift is on track.</strong>",
              `Contract logistics grew from 39% to ${accent("<strong>46%</strong>")} of revenue in twelve months.`,
              "Target for end of 2027: 55%.",
            ),
            { size: 21 },
          ),
        ],
      }),
      slide({
        id: "qbr-6",
        layout: "big-number",
        notes:
          "This is the operations story. Automation at Rotterdam paid back in nine weeks. The next hub is Duisburg, budget request in the Q4 section.",
        html: {
          stat: p("97.1%"),
          caption: p(
            "on-time delivery across 1.3 million shipments, our best quarter since 2019. The Rotterdam sortation upgrade paid for itself in nine weeks.",
          ),
        },
        elements: [
          text("qbr-6-a", [7.5, 7, 40, 5], p("OPERATIONS"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          icon("qbr-6-b", "truck", 82, 18, 10, "accent", { strokeWidth: 1.5 }),
        ],
      }),
      slide({
        id: "qbr-7",
        layout: "two-column",
        notes:
          "Be candid on the misses. The driver shortage in Poland cost us two lanes. Warehouse system migration slipped six weeks; new go-live is 2 December.",
        html: {
          title: p("Wins and misses"),
          left: ul(
            "<strong>Two new contract customers</strong>: Brightwell Foods and Oskar Home",
            "Rotterdam automation live, 22% faster sortation",
            "Tracking redesign lifted NPS by 7 points",
          ),
          right: ul(
            "<strong>Driver shortage in Poland</strong> paused the Gdansk to Prague lane",
            "Warehouse system migration slipped 6 weeks",
            "Fuel costs 4% over budget",
          ),
        },
        elements: [
          shape("qbr-7-a", "rect", [7.5, 27.4, 40, 0.8], GREEN),
          shape("qbr-7-b", "rect", [50, 27.4, 42.5, 0.8], "accent"),
        ],
      }),
      slide({
        id: "qbr-8",
        layout: "blank",
        notes:
          "Three priorities, each with a single owner. We are asking the board to approve the Duisburg capex today; the other two are within the existing budget.",
        elements: [
          text("qbr-8-a", [7.5, 9, 60, 6], p("Q4 PRIORITIES"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text(
            "qbr-8-b",
            [7.5, 15, 80, 10],
            p("Three things that matter most"),
            { font: "title", size: 56 },
          ),
          ...priority(
            "qbr-8-c",
            7.5,
            "01",
            "Duisburg hub",
            "Approve EUR 6.8M capex for sortation. Owner: Lotte Brandt, COO.",
          ),
          ...priority(
            "qbr-8-d",
            38,
            "02",
            "Driver pipeline",
            "Open a training academy in Lodz for 120 drivers a year. Owner: Piotr Nowak.",
          ),
          ...priority(
            "qbr-8-e",
            68.5,
            "03",
            "WMS go-live",
            "Ship the warehouse system migration by 2 December. Owner: Aisha Karim, CTO.",
          ),
        ],
      }),
      slide({
        id: "qbr-9",
        layout: "section",
        background: "grad-peach",
        notes:
          "Open the floor. Capture decisions and owners in the board minutes before closing.",
        html: { title: p("Questions and discussion") },
      }),
    ],
  },
};
