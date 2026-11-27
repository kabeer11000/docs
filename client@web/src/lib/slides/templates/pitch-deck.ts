import {
  accent,
  chart,
  icon,
  p,
  pc,
  shape,
  slide,
  sq,
  text,
  ul,
} from "./build";
import type { SlideTemplate } from "./types";

const INK = "#0E1014";
const CARD = "#181C24";

export const pitchDeck: SlideTemplate = {
  id: "pitch-deck",
  name: "Seed Pitch",
  category: "Business",
  description:
    "A dark, high-contrast investor deck: problem, solution, traction chart, market circles, team and the ask.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "night",
    transition: "fade",
    slides: [
      slide({
        id: "pitch-1",
        layout: "blank",
        background: "grad-night",
        notes:
          "Open with the one-liner and stop. Let the room read it. Then: we are three engineers from the grid side, and we have spent two years making neighbourhood batteries pay for themselves.",
        elements: [
          shape("pitch-1-a", "circle", [55, -35, 70, sq(70)], "none", {
            stroke: "accent",
            strokeWidth: 3,
            opacity: 0.5,
          }),
          shape("pitch-1-b", "circle", [64, -18, 50, sq(50)], "accent"),
          icon("pitch-1-c", "zap", 82, 12, 12, INK, { strokeWidth: 1.5 }),
          text("pitch-1-d", [7.5, 14, 40, 6], p("SEED ROUND / 2026"), {
            font: "mono",
            size: 20,
            color: "accent",
          }),
          text("pitch-1-e", [7.5, 26, 56, 28], p("Lumen Grid"), {
            font: "title",
            size: 132,
          }),
          text(
            "pitch-1-f",
            [7.5, 56, 46, 16],
            p("The operating system for neighbourhood batteries."),
            { size: 34 },
          ),
          text(
            "pitch-1-g",
            [7.5, 86, 60, 5],
            p("Confidential. Prepared for Northgate Ventures, November 2026."),
            {
              size: 16,
              opacity: 0.55,
            },
          ),
        ],
      }),
      slide({
        id: "pitch-2",
        layout: "big-number",
        notes:
          "This is the whole problem in one number. Solar is cheap, but the street-level grid was never built for two-way flow. Every curtailed kilowatt-hour is money a household already paid for and then throws away.",
        html: {
          stat: p("41%"),
          caption: p(
            "of rooftop solar in our pilot regions is exported at a loss or curtailed outright, because the local grid cannot absorb the midday peak.",
          ),
        },
        elements: [
          text("pitch-2-a", [7.5, 7, 40, 5], p("THE PROBLEM"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          icon("pitch-2-b", "triangle-alert", 86, 8, 6.5, "accent", {
            strokeWidth: 1.5,
          }),
        ],
      }),
      slide({
        id: "pitch-3",
        layout: "blank",
        notes:
          "Three things make it work. Walk left to right, and spend most of the time on the middle card: the dispatch model is where our moat is.",
        elements: [
          text(
            "pitch-3-a",
            [7.5, 8, 80, 8],
            p("One controller. Every battery on the street."),
            { font: "title", size: 52 },
          ),
          text(
            "pitch-3-b",
            [7.5, 20, 60, 5],
            p("How Lumen Grid turns idle storage into a shared asset."),
            { size: 22, opacity: 0.7 },
          ),
          shape("pitch-3-c", "rounded", [7.5, 34, 25, 56], CARD, {
            radius: 24,
          }),
          shape("pitch-3-d", "rounded", [37.5, 34, 25, 56], CARD, {
            radius: 24,
          }),
          shape("pitch-3-e", "rounded", [67.5, 34, 25, 56], CARD, {
            radius: 24,
          }),
          shape("pitch-3-f", "rect", [37.5, 34, 25, 1.2], "accent"),
          icon("pitch-3-g", "cpu", 10, 40, 4.5),
          icon("pitch-3-h", "activity", 40, 40, 4.5),
          icon("pitch-3-i", "wallet", 70, 40, 4.5),
          text(
            "pitch-3-j",
            [10, 52, 21, 7],
            p("<strong>Plug-in controller</strong>"),
            { size: 26 },
          ),
          text(
            "pitch-3-k",
            [40, 52, 21, 7],
            p("<strong>Street-level dispatch</strong>"),
            { size: 26 },
          ),
          text(
            "pitch-3-l",
            [70, 52, 21, 7],
            p("<strong>Automatic settlement</strong>"),
            { size: 26 },
          ),
          text(
            "pitch-3-m",
            [10, 60, 21, 26],
            p(
              "A EUR 190 box that speaks to 40+ inverter brands in under ten minutes.",
            ),
            {
              size: 20,
              opacity: 0.75,
            },
          ),
          text(
            "pitch-3-n",
            [40, 60, 21, 26],
            p(
              "Our model forecasts load per feeder and shifts charge between homes every 5 minutes.",
            ),
            {
              size: 20,
              opacity: 0.75,
            },
          ),
          text(
            "pitch-3-o",
            [70, 60, 21, 26],
            p(
              "Households are paid monthly for the capacity they share. No tariffs to read.",
            ),
            {
              size: 20,
              opacity: 0.75,
            },
          ),
        ],
      }),
      slide({
        id: "pitch-4",
        layout: "blank",
        notes:
          "Revenue has grown every quarter since the first pilot. October alone was our best month. Point out that churn is zero: no household has unplugged a controller.",
        elements: [
          text("pitch-4-a", [7.5, 12, 36, 5], p("TRACTION"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text(
            "pitch-4-b",
            [7.5, 18, 36, 30],
            p("From 3 pilot streets to 212 in 14 months."),
            { font: "title", size: 46 },
          ),
          text("pitch-4-c", [7.5, 52, 38, 20], p("1.8M"), {
            font: "title",
            size: 112,
            color: "accent",
          }),
          text(
            "pitch-4-d",
            [7.5, 73, 34, 12],
            p(
              "EUR in annual recurring revenue, October 2026. Zero churn to date.",
            ),
            {
              size: 22,
              opacity: 0.75,
            },
          ),
          shape("pitch-4-e", "rounded", [47, 10, 46, 80], CARD, { radius: 28 }),
          chart(
            "pitch-4-f",
            "bar",
            [50, 16, 40, 68],
            ["Q3 25", "Q4 25", "Q1 26", "Q2 26", "Q3 26", "Oct 26"],
            [120, 310, 620, 1050, 1480, 1800],
            "accent",
          ),
        ],
      }),
      slide({
        id: "pitch-5",
        layout: "blank",
        notes:
          "Top-down: every home with solar in our five launch countries. Bottom-up: the 410 million is the feeders where our controller is already certified. That is what we can win by 2029.",
        elements: [
          text("pitch-5-a", [7.5, 12, 36, 5], p("MARKET"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text(
            "pitch-5-b",
            [7.5, 18, 38, 24],
            p("A EUR 38B market forming right now."),
            { font: "title", size: 48 },
          ),
          text(
            "pitch-5-c",
            [7.5, 48, 36, 40],
            ul(
              "11.4M European homes have rooftop solar",
              "2.1M already own a home battery",
              "Grid operators must buy local flexibility from 2027",
            ),
            { size: 22 },
          ),
          shape("pitch-5-d", "circle", [50, 6, 46, sq(46)], "#1C212B"),
          shape("pitch-5-e", "circle", [58, 34.45, 30, sq(30)], "#2A303C"),
          shape("pitch-5-f", "circle", [66, 62.89, 14, sq(14)], "accent"),
          text(
            "pitch-5-g",
            [58, 12, 30, 12],
            pc("<strong>EUR 38B</strong>", "total addressable"),
            { size: 20 },
          ),
          text(
            "pitch-5-h",
            [60, 40, 26, 12],
            pc("<strong>EUR 6.2B</strong>", "serviceable"),
            { size: 20 },
          ),
          text("pitch-5-i", [66, 71, 14, 8], pc("<strong>EUR 410M</strong>"), {
            size: 18,
            color: INK,
          }),
        ],
      }),
      slide({
        id: "pitch-6",
        layout: "two-column",
        notes:
          "Two revenue lines. Households pay nothing up front; we earn from the grid side. Margins improve as each street adds homes because the controller cost is fixed.",
        html: {
          title: p("How we make money"),
          left: p(
            accent("<strong>Flexibility fees</strong>"),
            "Grid operators pay us per megawatt of peak they no longer need to build for. We keep 30% and pass 70% to households.",
          ),
          right: p(
            accent("<strong>Fleet software</strong>"),
            "Installers and cooperatives license the dispatch dashboard at EUR 2.40 per battery per month. Gross margin today: 71%.",
          ),
        },
        elements: [
          shape("pitch-6-a", "circle", [88, -14, 16, sq(16)], "accent", {
            opacity: 0.9,
          }),
        ],
      }),
      slide({
        id: "pitch-7",
        layout: "blank",
        notes:
          "Thirty seconds on the team. The point is that we have built grid software at scale before and we already have the utility relationships.",
        elements: [
          text("pitch-7-a", [7.5, 8, 80, 8], p("The team"), {
            font: "title",
            size: 52,
          }),
          shape("pitch-7-b", "circle", [12, 28, 12, sq(12)], "accent"),
          shape("pitch-7-c", "circle", [44, 28, 12, sq(12)], "#FFD3B8"),
          shape("pitch-7-d", "circle", [76, 28, 12, sq(12)], "#F1F3F7"),
          text("pitch-7-e", [12, 37, 12, 9], p("ID"), {
            font: "title",
            size: 52,
            align: "center",
            color: INK,
          }),
          text("pitch-7-f", [44, 37, 12, 9], p("MK"), {
            font: "title",
            size: 52,
            align: "center",
            color: INK,
          }),
          text("pitch-7-g", [76, 37, 12, 9], p("SA"), {
            font: "title",
            size: 52,
            align: "center",
            color: INK,
          }),
          text(
            "pitch-7-h",
            [4, 55, 28, 30],
            pc(
              "<strong>Ines Duarte</strong>",
              "CEO. Ran demand response at Iberdrola for 6 years.",
            ),
            {
              size: 20,
            },
          ),
          text(
            "pitch-7-i",
            [36, 55, 28, 30],
            pc(
              "<strong>Marek Kowal</strong>",
              "CTO. Built the forecasting stack at Octopus Kraken.",
            ),
            {
              size: 20,
            },
          ),
          text(
            "pitch-7-j",
            [68, 55, 28, 30],
            pc(
              "<strong>Sana Ahmed</strong>",
              "Hardware. Shipped 400k smart meters at Landis+Gyr.",
            ),
            {
              size: 20,
            },
          ),
        ],
      }),
      slide({
        id: "pitch-8",
        layout: "quote",
        background: "grad-dusk",
        notes:
          "Read it slowly. Zuidwijk is our largest cooperative: 64 homes. Hanne is happy to take reference calls.",
        html: {
          quote: p(
            "We cut our peak import bill by a third in the first winter, without touching a single panel.",
          ),
          attribution: p("Hanne Vos, Director, Zuidwijk Energy Cooperative"),
        },
      }),
      slide({
        id: "pitch-9",
        layout: "blank",
        notes:
          "The ask. Four million gets us to 2,000 streets and Series A metrics in 18 months. Hardware is the biggest line because we finance the first controllers ourselves. Pause, then take questions.",
        elements: [
          shape("pitch-9-a", "rect", [0, 0, 42, 100], "accent"),
          text("pitch-9-b", [6, 14, 34, 5], p("THE ASK"), {
            font: "mono",
            size: 18,
            color: INK,
          }),
          text("pitch-9-c", [6, 22, 34, 24], p("EUR 4M"), {
            font: "title",
            size: 112,
            color: INK,
          }),
          text(
            "pitch-9-d",
            [6, 50, 32, 20],
            p("Seed round. 18 months of runway to 2,000 streets and Series A."),
            { size: 26, color: INK },
          ),
          text("pitch-9-e", [6, 84, 34, 5], p("ines@lumengrid.energy"), {
            font: "mono",
            size: 18,
            color: INK,
          }),
          text(
            "pitch-9-f",
            [50, 14, 42, 6],
            p("<strong>Use of funds</strong>"),
            { size: 26 },
          ),
          chart(
            "pitch-9-g",
            "pie",
            [50, 26, 44, 56],
            [
              "Hardware fleet",
              "Engineering",
              "Utility partnerships",
              "Working capital",
            ],
            [40, 32, 18, 10],
            "accent",
          ),
        ],
      }),
    ],
  },
};
