import { icon, p, pc, shape, slide, sq, text, ul } from "./build";
import type { SlideTemplate } from "./types";

const SNOW = "#F1F3F7";
const CARD = "#181C24";

const stop = (
  id: string,
  x: number,
  city: string,
  days: string,
  here: boolean,
) => [
  shape(
    `${id}-a`,
    "circle",
    [x, here ? 46.4 : 47.3, here ? 4.4 : 3, here ? sq(4.4) : sq(3)],
    here ? "accent" : SNOW,
  ),
  text(`${id}-b`, [x - 7, 32, 17, 8], pc(`<strong>${city}</strong>`), {
    size: 28,
  }),
  text(`${id}-c`, [x - 7, 60, 17, 6], pc(days), {
    font: "mono",
    size: 18,
    color: "accent",
  }),
];

const tile = (
  id: string,
  x: number,
  glyph: string,
  value: string,
  label: string,
) => [
  shape(`${id}-a`, "rounded", [x, 30, 26, 56], CARD, { radius: 28 }),
  icon(`${id}-b`, glyph, x + 3, 36, 4.5),
  text(`${id}-c`, [x + 3, 52, 22, 16], p(value), { font: "title", size: 88 }),
  text(`${id}-d`, [x + 3, 70, 22, 10], p(label), { size: 22, opacity: 0.75 }),
];

export const travelStory: SlideTemplate = {
  id: "travel-story",
  name: "Travel Story",
  category: "Personal",
  description:
    "Moody night-sky travel journal with layered mountain silhouettes, a route line, oversized place names and trip stats.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "night",
    transition: "slide",
    slides: [
      slide({
        id: "trip-1",
        layout: "blank",
        background: "grad-dusk",
        notes:
          "Set the scene: ten days, one rail pass, and far more snow than either of us had ever seen.",
        elements: [
          shape("trip-1-a", "triangle", [-12, 46, 62, 62], "#2A1846"),
          shape("trip-1-b", "triangle", [62, 50, 54, 58], "#3A1A55"),
          shape("trip-1-c", "triangle", [26, 36, 64, 72], "#140B28"),
          shape("trip-1-d", "circle", [78, 10, 9, sq(9)], SNOW, {
            opacity: 0.9,
          }),
          icon("trip-1-e", "snowflake", 64, 14, 2.5, SNOW, { opacity: 0.6 }),
          icon("trip-1-f", "snowflake", 70, 30, 1.8, SNOW, { opacity: 0.5 }),
          icon("trip-1-g", "snowflake", 92, 34, 2.2, SNOW, { opacity: 0.5 }),
          text(
            "trip-1-h",
            [7.5, 10, 50, 5],
            p("A WINTER JOURNAL / FEBRUARY 2026"),
            { font: "mono", size: 18, color: "accent" },
          ),
          text("trip-1-i", [7.5, 16, 56, 34], p("Ten Days in Hokkaido"), {
            font: "title",
            size: 96,
            color: SNOW,
          }),
        ],
      }),
      slide({
        id: "trip-2",
        layout: "blank",
        background: "grad-night",
        notes:
          "Our route, west to east. All by train apart from the last bus into Utoro.",
        elements: [
          text("trip-2-a", [7.5, 9, 60, 5], p("THE ROUTE"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text(
            "trip-2-b",
            [7.5, 14, 85, 10],
            p("Five stops, 412 km, one rail pass"),
            { font: "title", size: 52 },
          ),
          shape("trip-2-c", "rect", [10, 49.75, 78, 0.5], SNOW, {
            opacity: 0.35,
          }),
          ...stop("trip-2-d", 10, "Otaru", "Day 1", false),
          ...stop("trip-2-e", 28.5, "Sapporo", "Days 2 to 3", true),
          ...stop("trip-2-f", 47, "Furano", "Days 4 to 5", false),
          ...stop("trip-2-g", 65.5, "Asahikawa", "Days 6 to 7", false),
          ...stop("trip-2-h", 84, "Shiretoko", "Days 8 to 10", false),
          icon("trip-2-i", "map", 7.5, 76, 3, "accent"),
          text(
            "trip-2-j",
            [12, 76.5, 70, 6],
            p("JR Hokkaido rail pass, 7 days, about EUR 190 per person."),
            { size: 20, opacity: 0.7 },
          ),
        ],
      }),
      slide({
        id: "trip-3",
        layout: "blank",
        background: "grad-ocean",
        notes:
          "Sapporo during the snow festival. Two hundred ice sculptures, and a miso ramen alley that is worth the queue.",
        elements: [
          shape("trip-3-a", "circle", [64, -20, 50, sq(50)], "accent", {
            opacity: 0.85,
          }),
          text("trip-3-b", [7.5, 14, 40, 5], p("DAYS 2 TO 3"), {
            font: "mono",
            size: 20,
            color: SNOW,
          }),
          text("trip-3-c", [5.5, 22, 80, 34], p("Sapporo"), {
            font: "title",
            size: 200,
            color: SNOW,
          }),
          text(
            "trip-3-d",
            [7.5, 64, 46, 24],
            p(
              "Snow festival week. Ice palaces in Odori Park by day, steaming miso ramen in Ganso Ramen Yokocho by night.",
            ),
            { size: 24, color: SNOW },
          ),
        ],
      }),
      slide({
        id: "trip-4",
        layout: "big-number",
        background: "grad-night",
        notes:
          "The coldest morning of the trip. Our eyelashes froze on the walk to the station. Worth it for the diamond dust in the air.",
        html: {
          stat: p("-21 C"),
          caption: p(
            "at 6:40 on the morning we left Asahikawa. The air was full of diamond dust, tiny ice crystals glittering in the sun.",
          ),
        },
        elements: [
          icon("trip-4-a", "snowflake", 82, 12, 10, "accent", {
            strokeWidth: 1.25,
          }),
        ],
      }),
      slide({
        id: "trip-5",
        layout: "blank",
        notes:
          "The trip in three numbers. The ramen number is a conservative estimate.",
        elements: [
          text("trip-5-a", [7.5, 8, 85, 10], p("By the numbers"), {
            font: "title",
            size: 56,
          }),
          ...tile("trip-5-b", 7.5, "plane", "412", "kilometres by train"),
          ...tile(
            "trip-5-c",
            37,
            "waves",
            "9",
            "onsen soaks, three outdoors in the snow",
          ),
          ...tile(
            "trip-5-d",
            66.5,
            "utensils",
            "23",
            "bowls of ramen, give or take",
          ),
        ],
      }),
      slide({
        id: "trip-6",
        layout: "quote",
        background: "grad-dusk",
        notes:
          "Mrs Sato ran our guesthouse in Utoro. She said this when the bus was cancelled and we were stuck an extra day. Best day of the trip.",
        html: {
          quote: p("Snow is only the mountain telling you to slow down."),
          attribution: p("Mrs Sato, guesthouse owner, Utoro"),
        },
      }),
      slide({
        id: "trip-7",
        layout: "two-column",
        notes:
          "Practical tips for anyone going in February. Crampons were the single best thing we packed.",
        html: {
          title: p("If you go"),
          left: `${p("<strong>Pack</strong>")}${ul("Slip-on crampons for icy pavements", "Merino layers, not one big coat", "A small towel for the onsen")}`,
          right: `${p("<strong>Skip</strong>")}${ul("Hiring a car in deep winter", "Booking Sapporo late: festival week sells out", "Trying to see it all in a week")}`,
        },
        elements: [
          shape("trip-7-a", "circle", [88, -14, 16, sq(16)], "accent", {
            opacity: 0.9,
          }),
        ],
      }),
      slide({
        id: "trip-8",
        layout: "blank",
        background: "grad-dusk",
        notes:
          "Thanks for watching. Photos are in the shared album; ask me for the full itinerary.",
        elements: [
          shape("trip-8-a", "circle", [44, 10, 12, sq(12)], SNOW, {
            opacity: 0.9,
          }),
          shape("trip-8-b", "circle", [47, 8, 12, sq(12)], "#22123D"),
          shape("trip-8-c", "triangle", [-10, 64, 60, 44], "#140B28"),
          shape("trip-8-d", "triangle", [44, 58, 70, 50], "#2A1846"),
          text("trip-8-e", [10, 40, 80, 14], pc("Until next winter."), {
            font: "title",
            size: 80,
            color: SNOW,
          }),
          icon("trip-8-f", "snowflake", 20, 18, 2.4, SNOW, { opacity: 0.6 }),
          icon("trip-8-g", "snowflake", 76, 24, 2, SNOW, { opacity: 0.5 }),
        ],
      }),
    ],
  },
};
