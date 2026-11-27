import { p, pc, shape, slide, sq, text } from "./build";
import type { SlideTemplate } from "./types";

export const minimalKeynote: SlideTemplate = {
  id: "minimal-keynote",
  name: "Minimal Keynote",
  category: "Business",
  description:
    "Stark white keynote built on huge type, one idea per slide and a single orange accent.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "paper",
    transition: "zoom",
    slides: [
      slide({
        id: "key-1",
        layout: "title",
        notes:
          "Walk on, pause, smile. No intro slide about yourself; the host already did that.",
        html: {
          title: p("Small teams, big software."),
          subtitle: p("Jonah Reyes. DevSummit Berlin, 4 November 2026"),
        },
        elements: [
          shape("key-1-a", "circle", [7.5, 14, 2.4, sq(2.4)], "accent"),
        ],
      }),
      slide({
        id: "key-2",
        layout: "blank",
        notes:
          "Seven. Let it hang there. Then: past seven people, every new hire adds more coordination than code.",
        elements: [
          text("key-2-a", [5, 4, 40, 90], p("7"), {
            font: "title",
            size: 400,
            color: "accent",
          }),
          text(
            "key-2-b",
            [46, 38, 46, 30],
            p(
              "people. Past that, every new hire adds more meetings than output.",
            ),
            {
              font: "title",
              size: 44,
            },
          ),
        ],
      }),
      slide({
        id: "key-3",
        layout: "section",
        notes:
          "This is the thesis of the whole talk. Everything that follows is an example of it.",
        html: { title: p("Less process. More trust.") },
      }),
      slide({
        id: "key-4",
        layout: "quote",
        notes:
          "Most people know this one. Ask them to apply it to their org chart, not their code.",
        html: {
          quote: p(
            "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.",
          ),
          attribution: p("Antoine de Saint-Exupery"),
        },
      }),
      slide({
        id: "key-5",
        layout: "big-number",
        notes:
          "From our study of 312 engineering teams across 40 companies. Median lead time from first commit to production.",
        html: {
          stat: p("4x"),
          caption: p(
            "faster from idea to production for teams of eight or fewer, across 312 engineering teams we studied.",
          ),
        },
      }),
      slide({
        id: "key-6",
        layout: "three-column",
        notes:
          "Three habits the fastest teams shared. Thirty seconds each, with one story for the middle one.",
        html: {
          title: p("What the fastest teams do"),
          left: p(
            "<strong>Own the outcome</strong>",
            "Not tickets. The team is judged on what changed for users.",
          ),
          middle: p(
            "<strong>Write it down</strong>",
            "A one-page memo replaces three meetings and outlives all of them.",
          ),
          right: p(
            "<strong>Ship every day</strong>",
            "Small changes, behind flags, reviewed within the hour.",
          ),
        },
      }),
      slide({
        id: "key-7",
        layout: "blank",
        background: "#121418",
        notes:
          "The one thing to do on Monday. Wait for the laugh, then mean it.",
        elements: [
          text(
            "key-7-a",
            [10, 34, 80, 30],
            pc("Delete one meeting this week."),
            { font: "title", size: 88, color: "#FFFFFF" },
          ),
          shape("key-7-b", "rect", [46, 70, 8, 0.8], "accent"),
        ],
      }),
      slide({
        id: "key-8",
        layout: "blank",
        notes:
          "Thank the organisers. Slides and the full study are at the address on screen.",
        elements: [
          text("key-8-a", [7.5, 30, 85, 24], p("Thank you."), {
            font: "title",
            size: 150,
          }),
          shape("key-8-b", "circle", [78, 58, 34, sq(34)], "accent"),
          text("key-8-c", [7.5, 64, 60, 6], p("jonah@smallteams.dev"), {
            font: "mono",
            size: 26,
            color: "accent",
          }),
        ],
      }),
    ],
  },
};
