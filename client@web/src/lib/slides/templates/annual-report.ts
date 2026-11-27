import { accent, chart, p, shape, slide, text } from "./build";
import type { SlideTemplate } from "./types";

const RED = "#D7261E";
const WHITE = "#FFFFFF";

export const annualReport: SlideTemplate = {
  id: "annual-report",
  name: "Research Report",
  category: "Business",
  description:
    "Editorial red and white research report: magazine cover, contents, headline finding, city bar chart, motives pie and recommendations.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "editorial",
    transition: "fade",
    slides: [
      slide({
        id: "rep-1",
        layout: "blank",
        notes:
          "This is the fifth edition of the report. 18,000 respondents in twelve European cities, fieldwork in May and June.",
        elements: [
          shape("rep-1-a", "rect", [62, 0, 38, 100], RED),
          text("rep-1-b", [64, 58, 34, 30], p("2026"), {
            font: "title",
            size: 168,
            color: WHITE,
          }),
          text("rep-1-c", [64, 10, 30, 10], p("FIFTH EDITION"), {
            font: "mono",
            size: 18,
            color: WHITE,
          }),
          text("rep-1-d", [7.5, 10, 40, 5], p("KESTREL MOBILITY LAB"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("rep-1-e", [7.5, 24, 50, 44], p("The State of Urban Cycling"), {
            font: "title",
            size: 84,
          }),
          shape("rep-1-f", "rect", [7.5, 72, 10, 0.5], "accent"),
          text(
            "rep-1-g",
            [7.5, 76, 46, 14],
            p(
              "Who rides, why they ride, and what keeps the rest off the saddle.",
            ),
            {
              size: 24,
              opacity: 0.75,
            },
          ),
        ],
      }),
      slide({
        id: "rep-2",
        layout: "agenda",
        notes:
          "Five chapters. The recommendations are written for city transport departments, not for advocates.",
        html: {
          title: p("Contents"),
          body: p(
            "The headline number",
            "City by city",
            "Why people ride",
            "How we did the research",
            "Recommendations",
          ),
        },
        elements: [shape("rep-2-a", "rect", [7.5, 7, 6, 1], "accent")],
      }),
      slide({
        id: "rep-3",
        layout: "big-number",
        notes:
          "Weekday bike trips rose 23 percent across the twelve cities since 2024. Most of the growth came from women over 35 and e-bike commuters.",
        html: {
          stat: p("+23%"),
          caption: p(
            `weekday bike trips since 2024 across twelve cities. ${accent("<strong>Women over 35</strong>")} account for half of the growth.`,
          ),
        },
        elements: [
          text(
            "rep-3-a",
            [7.5, 7, 60, 5],
            p("CHAPTER 1 / THE HEADLINE NUMBER"),
            { font: "mono", size: 18, color: "accent" },
          ),
        ],
      }),
      slide({
        id: "rep-4",
        layout: "blank",
        notes:
          "Share of all weekday trips made by bike. Utrecht and Copenhagen lead as ever, but Paris has tripled its share since 2019 and is the story of the decade.",
        elements: [
          text("rep-4-a", [7.5, 9, 60, 5], p("CHAPTER 2 / CITY BY CITY"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text(
            "rep-4-b",
            [7.5, 15, 85, 10],
            p("Share of weekday trips made by bike, %"),
            { font: "title", size: 48 },
          ),
          chart(
            "rep-4-c",
            "bar",
            [7.5, 30, 85, 60],
            [
              "Utrecht",
              "Copenhagen",
              "Paris",
              "Milan",
              "Warsaw",
              "Lisbon",
              "London",
            ],
            [43, 41, 19, 12, 9, 7, 6],
            "accent",
          ),
        ],
      }),
      slide({
        id: "rep-5",
        layout: "blank",
        notes:
          "Health overtook cost as the first reason this year. Note that only 9 percent say climate is their main motive, even though most say it matters.",
        elements: [
          text("rep-5-a", [7.5, 9, 60, 5], p("CHAPTER 3 / WHY PEOPLE RIDE"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text(
            "rep-5-b",
            [7.5, 15, 40, 30],
            p("Health now beats cost as the first reason to ride."),
            { font: "title", size: 48 },
          ),
          text(
            "rep-5-c",
            [7.5, 52, 36, 34],
            p("Main motive given by regular cyclists, 2026 survey, n = 9,412."),
            { size: 22, opacity: 0.7 },
          ),
          chart(
            "rep-5-d",
            "pie",
            [50, 14, 44, 72],
            ["Health", "Cost", "Speed", "Climate", "Other"],
            [34, 29, 22, 9, 6],
            "accent",
          ),
        ],
      }),
      slide({
        id: "rep-6",
        layout: "two-column",
        notes:
          "Be upfront about limits. The online panel under-represents people over 70, and we weighted for it.",
        html: {
          title: p("How we did the research"),
          left: p(
            "<strong>Method</strong>",
            "Online panel of 18,000 adults in twelve cities, weighted by age, gender and district. Plus 1.2 million anonymised trips from bike-share operators.",
          ),
          right: p(
            "<strong>Limits</strong>",
            "Over-70s are under-represented online. Trip data covers shared bikes only, so private bikes are estimated from the survey.",
          ),
        },
        elements: [
          shape("rep-6-a", "rect", [48.7, 30, 0.2, 54], "fg", { opacity: 0.3 }),
        ],
      }),
      slide({
        id: "rep-7",
        layout: "quote",
        notes:
          "This quote came up in some form in almost every interview with people who do not cycle yet.",
        html: {
          quote: p(
            "I would ride every day if I did not have to share the road with buses to get to the bridge.",
          ),
          attribution: p("Survey respondent, 41, Milan"),
        },
      }),
      slide({
        id: "rep-8",
        layout: "title-body",
        background: "pat-stripes",
        notes:
          "Four recommendations. Each one is costed in the appendix; protected junctions are the cheapest per extra rider.",
        html: {
          title: p("Recommendations"),
          body: `<ol><li><p><strong>Protect the junctions first.</strong> 62% of near misses happen there.</p></li><li><p><strong>Secure parking at stations</strong>, so bikes and trains work as one trip.</p></li><li><p><strong>Subsidise e-bikes for over-50s</strong>, the fastest-growing group.</p></li><li><p><strong>Publish trip data monthly</strong> so progress is visible.</p></li></ol>`,
        },
      }),
    ],
  },
};
