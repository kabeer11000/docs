import { icon, p, pc, shape, slide, sq, text } from "./build";
import type { SlideTemplate } from "./types";

const PINE = "#0F3B2C";
const CREAM = "#F6EFE3";

const swatch = (id: string, x: number, fill: string, name: string) => [
  shape(`${id}-a`, "circle", [x, 36, 14, sq(14)], fill),
  text(`${id}-b`, [x - 3, 64, 20, 6], pc(name), { size: 22 }),
];

const moment = (id: string, x: number, year: string, line: string) => [
  shape(`${id}-a`, "circle", [x + 6.5, 45.5, 2, sq(2)], "accent"),
  text(`${id}-b`, [x, 30, 15, 12], pc(year), {
    font: "title",
    size: 56,
    color: "accent",
  }),
  text(`${id}-c`, [x - 2, 56, 19, 24], pc(line), { size: 21 }),
];

export const wedding: SlideTemplate = {
  id: "wedding",
  name: "Wedding Weekend",
  category: "Events",
  description:
    "Deep green and cream wedding guide: invitation cover, our story timeline, schedule, venues, travel, dress code palette and RSVP.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "forest",
    transition: "fade",
    slides: [
      slide({
        id: "wed-1",
        layout: "blank",
        notes:
          "Shown on the screen as guests arrive at the welcome drinks. Leave it up for a few minutes.",
        elements: [
          shape("wed-1-a", "circle", [22, -4.8, 56, sq(56)], "none", {
            stroke: "accent",
            strokeWidth: 2,
            opacity: 0.6,
          }),
          shape("wed-1-b", "circle", [25, 0.55, 50, sq(50)], "none", {
            stroke: "accent",
            strokeWidth: 1,
            opacity: 0.35,
          }),
          icon("wed-1-c", "leaf", 47.5, 12, 5, "accent", { strokeWidth: 1.25 }),
          text("wed-1-d", [10, 28, 80, 24], pc("Ana &amp; Theo"), {
            font: "title",
            size: 124,
          }),
          text("wed-1-e", [10, 54, 80, 8], pc("<em>are getting married</em>"), {
            font: "serif",
            size: 36,
          }),
          shape("wed-1-f", "rect", [46, 66, 8, 0.4], "accent"),
          text(
            "wed-1-g",
            [10, 71, 80, 6],
            pc("12 JUNE 2027 / SINTRA, PORTUGAL"),
            { font: "mono", size: 20, color: "accent" },
          ),
        ],
      }),
      slide({
        id: "wed-2",
        layout: "blank",
        notes:
          "A short version of how we met. Theo tells the 2019 bit, Ana tells the proposal.",
        elements: [
          text("wed-2-a", [7.5, 10, 85, 10], pc("Our story"), {
            font: "title",
            size: 60,
          }),
          shape("wed-2-b", "rect", [14, 46.3, 72, 0.3], "accent", {
            opacity: 0.5,
          }),
          ...moment(
            "wed-2-c",
            7.5,
            "2019",
            "Two strangers share the last table at a Porto bookshop cafe.",
          ),
          ...moment(
            "wed-2-d",
            30,
            "2021",
            "A rescued greyhound called Figo joins the family.",
          ),
          ...moment(
            "wed-2-e",
            53,
            "2024",
            "First home together, in a flat with a very small balcony.",
          ),
          ...moment(
            "wed-2-f",
            76,
            "2026",
            "Theo proposes on the beach at Adraga. Ana says yes before he finishes.",
          ),
        ],
      }),
      slide({
        id: "wed-3",
        layout: "agenda",
        background: "grad-accent",
        notes:
          "The ceremony is outdoors, so the shuttle leaves the hotel promptly at 14:15. Dancing finishes at 01:00 for the neighbours' sake.",
        html: {
          title: p("The day"),
          body: p(
            "15:00 Ceremony in the chapel garden",
            "16:00 Drinks and petiscos on the terrace",
            "18:30 Dinner under the cork oaks",
            "21:00 First dance, then the floor is yours",
            "01:00 Last shuttle back to Sintra",
          ),
        },
      }),
      slide({
        id: "wed-4",
        layout: "two-column",
        notes:
          "Both venues are a ten-minute walk apart. Flat shoes recommended for the garden path.",
        html: {
          title: p("Where"),
          left: p(
            "<strong>Ceremony</strong>",
            "Quinta das Murtas chapel garden, Rua Barbosa du Bocage, Sintra.",
            "<em>Outdoors, with shade and seating.</em>",
          ),
          right: p(
            "<strong>Reception</strong>",
            "Casa do Arco, ten minutes on foot along the lit garden path.",
            "<em>Dinner, dancing and a late supper.</em>",
          ),
        },
        elements: [
          icon("wed-4-a", "map-pin", 86, 9, 5, "accent", { strokeWidth: 1.5 }),
        ],
      }),
      slide({
        id: "wed-5",
        layout: "three-column",
        notes:
          "We have a room block until 15 March. After that, Sintra books out quickly in June.",
        html: {
          title: p("Travel and stay"),
          left: p(
            "<strong>Fly</strong>",
            "Lisbon airport is 40 minutes away. We will run a shuttle on Friday afternoon.",
          ),
          middle: p(
            "<strong>Stay</strong>",
            "Rooms are held at Hotel Tivoli Sintra under 'Ana and Theo' until 15 March.",
          ),
          right: p(
            "<strong>Get around</strong>",
            "Trains run from Lisbon Rossio every 20 minutes. Taxis wait at Sintra station.",
          ),
        },
      }),
      slide({
        id: "wed-6",
        layout: "blank",
        background: CREAM,
        notes:
          "Garden formal. These are the colours we love; nobody needs to match exactly. Please avoid stilettos on the lawn.",
        elements: [
          text("wed-6-a", [7.5, 10, 85, 10], pc("Dress code: garden formal"), {
            font: "title",
            size: 56,
            color: PINE,
          }),
          text(
            "wed-6-b",
            [7.5, 22, 85, 6],
            pc("Soft colours we would love to see"),
            { size: 24, color: PINE },
          ),
          ...swatch("wed-6-c", 13, "#9CAF88", "Sage"),
          ...swatch("wed-6-d", 33, "#C97B5A", "Terracotta"),
          ...swatch("wed-6-e", 53, "#E8D9B5", "Sand"),
          ...swatch("wed-6-f", 73, "#7E9BB5", "Dusty blue"),
          text(
            "wed-6-g",
            [7.5, 80, 85, 6],
            pc("<em>Flat or block heels recommended for the garden.</em>"),
            { size: 22, color: PINE },
          ),
        ],
      }),
      slide({
        id: "wed-7",
        layout: "blank",
        notes:
          "RSVP card. Mention dietary requirements and that children are very welcome.",
        elements: [
          shape("wed-7-a", "rect", [54, 0, 46, 100], CREAM),
          text("wed-7-b", [7.5, 24, 42, 10], p("Kindly reply by"), {
            size: 30,
          }),
          text("wed-7-c", [7.5, 34, 44, 24], p("1 March"), {
            font: "title",
            size: 120,
            color: "accent",
          }),
          text(
            "wed-7-d",
            [7.5, 62, 40, 20],
            p(
              "Tell us about dietary needs and song requests. Little ones are very welcome.",
            ),
            {
              size: 22,
            },
          ),
          icon("wed-7-e", "mail", 60, 18, 6, PINE, { strokeWidth: 1.5 }),
          text(
            "wed-7-f",
            [60, 34, 34, 8],
            p("<strong>rsvp@anaandtheo.pt</strong>"),
            { size: 28, color: PINE },
          ),
          text("wed-7-g", [60, 44, 34, 8], p("+351 912 448 301"), {
            font: "mono",
            size: 24,
            color: PINE,
          }),
          text(
            "wed-7-h",
            [60, 56, 30, 20],
            p("Or tell Theo's mum. She will tell everyone else."),
            { size: 22, color: PINE },
          ),
        ],
      }),
      slide({
        id: "wed-8",
        layout: "quote",
        background: "#0B2E22",
        notes:
          "Final slide for the evening. Thank you for coming so far to be with us.",
        html: {
          quote: p(
            "Whatever our souls are made of, his and mine are the same.",
          ),
          attribution: p("Emily Bronte, Wuthering Heights. See you in Sintra."),
        },
      }),
    ],
  },
};
