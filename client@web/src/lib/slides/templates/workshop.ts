import { icon, p, pc, shape, slide, sq, text, ul } from "./build";
import type { SlideTemplate } from "./types";

const INK = "#121418";
const NOTE = {
  yellow: "#FFE45C",
  pink: "#FFB3C7",
  mint: "#9FF0C4",
  sky: "#A9D4FF",
  peach: "#FFC59E",
};
const DEEP = "#1A2A9E";

const sticky = (
  id: string,
  [x, y]: [number, number],
  fill: string,
  rotation: number,
  html: string,
  size = 26,
) => [
  shape(`${id}-a`, "rect", [x, y, 15, sq(15)], fill, { rotation, radius: 4 }),
  text(`${id}-b`, [x + 1.5, y + 4, 12, 18], html, {
    size,
    color: INK,
    rotation,
    font: "title",
  }),
];

const day = (
  id: string,
  x: number,
  name: string,
  verb: string,
  fill: string,
  rotation: number,
) => [
  text(`${id}-a`, [x, 28, 15, 6], pc(name), {
    font: "mono",
    size: 20,
    color: "accent",
  }),
  ...sticky(`${id}-n`, [x, 38], fill, rotation, pc(verb), 28),
];

const role = (
  id: string,
  x: number,
  glyph: string,
  name: string,
  who: string,
) => [
  shape(`${id}-a`, "rounded", [x, 30, 19.5, 56], DEEP, { radius: 24 }),
  icon(`${id}-b`, glyph, x + 2.5, 35, 4.5),
  text(`${id}-c`, [x + 2.5, 50, 15, 7], p(`<strong>${name}</strong>`), {
    size: 26,
  }),
  text(`${id}-d`, [x + 2.5, 58, 15, 26], p(who), { size: 19, opacity: 0.8 }),
];

export const workshop: SlideTemplate = {
  id: "workshop",
  name: "Design Sprint Workshop",
  category: "Education",
  description:
    "Playful cobalt workshop deck with sticky-note compositions: five-day plan, sprint question, roles, exercises and a break timer.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "ink",
    transition: "slide",
    slides: [
      slide({
        id: "work-1",
        layout: "blank",
        background: "pat-dots",
        notes:
          "Welcome everyone, coffee is at the back. Introduce yourself as facilitator and point out the fire exits.",
        elements: [
          text("work-1-a", [7.5, 16, 40, 5], p("NESTLY / 9 TO 13 MARCH"), {
            font: "mono",
            size: 20,
            color: "accent",
          }),
          text("work-1-b", [7.5, 24, 54, 40], p("Design Sprint Kickoff"), {
            font: "title",
            size: 92,
          }),
          text(
            "work-1-c",
            [7.5, 70, 44, 10],
            p("Five days from a big question to a tested prototype."),
            { size: 28 },
          ),
          ...sticky(
            "work-1-d",
            [64, 10],
            NOTE.yellow,
            -6,
            p("Map the problem"),
          ),
          ...sticky(
            "work-1-e",
            [80, 22],
            NOTE.pink,
            5,
            p("Sketch alone, together"),
          ),
          ...sticky("work-1-f", [66, 50], NOTE.mint, 3, p("Decide fast")),
          ...sticky("work-1-g", [82, 62], NOTE.sky, -4, p("Test on Friday")),
        ],
      }),
      slide({
        id: "work-2",
        layout: "blank",
        notes:
          "The week at a glance. Each day ends at 17:00 sharp. Lena, as Decider, needs to be in the room Monday morning and Wednesday all day.",
        elements: [
          text("work-2-a", [7.5, 8, 85, 10], p("Five days, one question"), {
            font: "title",
            size: 56,
          }),
          ...day("work-2-b", 7.5, "MON", "Map", NOTE.yellow, -3),
          ...day("work-2-c", 25, "TUE", "Sketch", NOTE.pink, 2),
          ...day("work-2-d", 42.5, "WED", "Decide", NOTE.mint, -2),
          ...day("work-2-e", 60, "THU", "Prototype", NOTE.sky, 3),
          ...day("work-2-f", 77.5, "FRI", "Test", NOTE.peach, -2),
          text(
            "work-2-g",
            [7.5, 80, 85, 6],
            pc(
              "Every day: 09:30 to 17:00. Lunch at 12:30. No laptops between sessions.",
            ),
            {
              size: 22,
              opacity: 0.8,
            },
          ),
        ],
      }),
      slide({
        id: "work-3",
        layout: "quote",
        background: "grad-ocean",
        notes:
          "Read the question aloud. Everything this week is judged against it. Write it on the whiteboard and leave it there until Friday.",
        html: {
          quote: p(
            "How might we get first-time renters to sign a lease in a single visit?",
          ),
          attribution: p(
            "Sprint question, agreed with Lena Moreau (Decider) on 2 March",
          ),
        },
      }),
      slide({
        id: "work-4",
        layout: "title-body",
        notes:
          "Ground rules. Ask the group if anything is missing and add it to the list live.",
        html: {
          title: p("How we work this week"),
          body: ul(
            "<strong>Laptops and phones closed</strong> unless the exercise needs them",
            "Work alone, together: ideas are sketched individually, then shared",
            "The Decider decides. Everyone else advises",
            "Timeboxes are sacred. The timer always wins",
          ),
        },
        elements: [
          ...sticky(
            "work-4-a",
            [80, 4],
            NOTE.yellow,
            6,
            p("Be here, fully"),
            22,
          ),
        ],
      }),
      slide({
        id: "work-5",
        layout: "blank",
        notes:
          "Who is in the room and why. Experts join only for Monday afternoon interviews.",
        elements: [
          text("work-5-a", [7.5, 8, 85, 10], p("Who does what"), {
            font: "title",
            size: 56,
          }),
          ...role(
            "work-5-b",
            7.5,
            "crown",
            "Decider",
            "Lena Moreau, Head of Product. Makes the final calls.",
          ),
          ...role(
            "work-5-c",
            29.33,
            "clock",
            "Facilitator",
            "Jonas Berg. Runs the clock and keeps us moving.",
          ),
          ...role(
            "work-5-d",
            51.16,
            "lightbulb",
            "Experts",
            "Leasing, legal and support leads, Monday afternoon.",
          ),
          ...role(
            "work-5-e",
            73,
            "pencil",
            "Makers",
            "Two designers, an engineer and a copywriter.",
          ),
        ],
      }),
      slide({
        id: "work-6",
        layout: "big-number",
        notes:
          "Hand out A4 sheets and black markers. Start the timer only once everyone has folded their paper. Eight minutes, one minute per frame.",
        html: {
          stat: p("8 min"),
          caption: p(
            "Crazy 8s. Fold a sheet into eight panels and sketch eight variations of your strongest idea, one per minute. No words needed.",
          ),
        },
        elements: [
          icon("work-6-a", "timer", 82, 12, 9, "accent", { strokeWidth: 1.5 }),
          text("work-6-b", [7.5, 7, 40, 5], p("EXERCISE 03"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
        ],
      }),
      slide({
        id: "work-7",
        layout: "section",
        background: "grad-sunset",
        notes:
          "Put the countdown on the second screen. Remind people to drop their sketches on the gallery wall on the way out.",
        html: { title: p("Coffee break. Back at 11:15.") },
        elements: [
          icon("work-7-a", "coffee", 82, 14, 10, "#FFFFFF", {
            strokeWidth: 1.5,
          }),
        ],
      }),
      slide({
        id: "work-8",
        layout: "two-column",
        notes:
          "Close each day with this slide. Ask for one word from everyone on how the day went.",
        html: {
          title: p("Wrap-up"),
          left: `${p("<strong>Today we</strong>")}${ul("Mapped the renter journey end to end", "Interviewed four experts", "Picked the target moment: the first viewing")}`,
          right: `${p("<strong>Tomorrow we</strong>")}${ul("Review lightning demos at 09:30", "Sketch solutions with the four-step method", "Recruit five renters for Friday")}`,
        },
      }),
    ],
  },
};
