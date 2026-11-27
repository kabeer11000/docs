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
} from "./build";
import type { SlideTemplate } from "./types";

const INK = "#111111";
const CARD = "#1D1D1B";
const LINE = "#2E2E2B";
const PINK = "#FF7AB8";
const CYAN = "#5FD3F3";

/** A terminal window: title bar with three dots. */
const terminal = (
  id: string,
  [x, y, w, h]: [number, number, number, number],
) => [
  shape(`${id}-a`, "rounded", [x, y, w, h], CARD, { radius: 18 }),
  ...["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) =>
    shape(
      `${id}-d${i}`,
      "circle",
      [x + 1.8 + i * 2.2, y + 2.5, 1.3, sq(1.3)],
      c,
    ),
  ),
];

const lesson = (
  id: string,
  y: number,
  n: string,
  title: string,
  body: string,
) => [
  text(`${id}-a`, [7.5, y, 10, 16], p(n), {
    font: "title",
    size: 88,
    color: "accent",
  }),
  text(`${id}-b`, [19, y + 1.5, 70, 7], p(`<strong>${title}</strong>`), {
    size: 32,
  }),
  text(`${id}-c`, [19, y + 9, 70, 8], p(body), { size: 21, opacity: 0.7 }),
];

export const conferenceTalk: SlideTemplate = {
  id: "conference-talk",
  name: "Conference Talk",
  category: "Events",
  description:
    "Terminal-flavoured tech talk in black and lime: speaker intro, the problem in one number, a code window, results chart, before and after, lessons.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "volt",
    transition: "fade",
    slides: [
      slide({
        id: "talk-1",
        layout: "blank",
        background: "pat-grid",
        notes:
          "Hi everyone. This is the story of how a 40-person team spent a year fighting flaky tests, and what finally worked. Twenty-five minutes, questions at the end.",
        elements: [
          kicker(
            "talk-1-a",
            [7.5, 12, 60, 5],
            "$ devconf lisbon 2027 --track=reliability",
          ),
          heading(
            "talk-1-b",
            [7, 22, 80, 40],
            "What 10,000 flaky tests taught us",
            92,
          ),
          shape("talk-1-c", "rect", [7.5, 68, 1.2, 14], "accent"),
          text(
            "talk-1-d",
            [10.5, 68, 50, 14],
            p("<strong>Priya Raman</strong>", "Staff engineer, Parcelwise"),
            { size: 26 },
          ),
          shape("talk-1-e", "rounded", [80, 70, 12, 3.2], "accent", {
            radius: 4,
          }),
          text("talk-1-f", [80, 69.8, 12, 3.6], pc("TRACK 2 / 14:30"), {
            font: "mono",
            size: 14,
            color: INK,
          }),
        ],
      }),
      slide({
        id: "talk-2",
        layout: "blank",
        notes:
          "Thirty seconds on me. The relevant bit: I have been on call for our CI system for three years.",
        elements: [
          shape("talk-2-a", "circle", [7.5, 20, 26, sq(26)], "accent"),
          text("talk-2-b", [7.5, 40, 26, 16], pc("PR"), {
            font: "title",
            size: 110,
            color: INK,
          }),
          kicker("talk-2-c", [42, 20, 40, 5], "WHO IS TALKING"),
          heading("talk-2-d", [42, 26, 50, 10], "Hi, I am Priya.", 52),
          ...[
            ["code", "Eight years building delivery software"],
            ["server", "Owner of a CI fleet running 2M tests a day"],
            ["coffee", "Has been paged by a test called test_it_works"],
          ].flatMap(([g, t], i) => [
            icon(`talk-2-e${i}`, g, 42, 44 + i * 13, 3, "accent", {
              strokeWidth: 1.75,
            }),
            text(`talk-2-f${i}`, [47, 44.2 + i * 13, 45, 6], p(t), {
              size: 24,
            }),
          ]),
        ],
      }),
      slide({
        id: "talk-3",
        layout: "big-number",
        notes:
          "This is where we were in January 2026. One in seven runs failed for reasons that had nothing to do with the change being tested.",
        html: {
          stat: p("1 in 7"),
          caption: p(
            "CI runs failed with no code change at all. Engineers had learned to just press retry.",
          ),
        },
        elements: [kicker("talk-3-a", [7.5, 7, 40, 5], "JANUARY 2026")],
      }),
      slide({
        id: "talk-4",
        layout: "blank",
        notes:
          "The single biggest cause: tests that depend on wall-clock time. This one fails every night between 23:59 and midnight UTC.",
        elements: [
          heading("talk-4-a", [7.5, 8, 85, 10], "The usual suspect", 48),
          ...terminal("talk-4-b", [7.5, 24, 85, 66]),
          shape("talk-4-c", "rect", [7.5, 51.5, 85, 7], "accent", {
            opacity: 0.14,
          }),
          text(
            "talk-4-d",
            [11, 33, 78, 54],
            p(
              `<span style="color: ${PINK}">test</span>("ships today", () =&gt; {`,
              "&nbsp;&nbsp;const order = createOrder();",
              `&nbsp;&nbsp;<span style="color: ${CYAN}">expect</span>(order.shipDate).toEqual(today());`,
              "&nbsp;&nbsp;// fails if the clock ticks past midnight between lines",
              "});",
            ),
            { font: "mono", size: 26 },
          ),
        ],
      }),
      slide({
        id: "talk-5",
        layout: "blank",
        notes:
          "We quarantined, fixed and tracked. Flaky failure rate went from 14 percent to under 1 percent in nine months.",
        elements: [
          kicker("talk-5-a", [7.5, 12, 36, 5], "RESULTS"),
          text("talk-5-b", [6.5, 18, 40, 22], p("0.8%"), {
            font: "title",
            size: 140,
            color: "accent",
          }),
          text(
            "talk-5-c",
            [7.5, 44, 34, 20],
            p("flaky failure rate in October, down from 14% in January."),
            { size: 26 },
          ),
          shape("talk-5-d", "rounded", [46, 10, 47, 80], CARD, { radius: 24 }),
          chart(
            "talk-5-e",
            "line",
            [49, 16, 41, 68],
            [
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
            [14, 13.2, 11, 8.5, 6, 4.2, 3, 2.1, 1.3, 0.8],
            "accent",
          ),
        ],
      }),
      slide({
        id: "talk-6",
        layout: "blank",
        notes:
          "Not just a nicer number. Merge time and retries are the two developers actually feel.",
        elements: [
          heading("talk-6-a", [7.5, 8, 85, 10], "Before and after"),
          ...table(
            "talk-6-b",
            [7.5, 26, 85],
            [4, 2, 2],
            [
              ["METRIC", "JAN 2026", "OCT 2026"],
              ["Median time to merge", "3h 40m", "52m"],
              ["Retries per pull request", "2.6", "0.1"],
              ["Tests in quarantine", "1,912", "37"],
              ["CI spend per month", "USD 84k", "USD 51k"],
            ],
            { rowH: 12, size: 26, band: CARD },
          ),
        ],
      }),
      slide({
        id: "talk-7",
        layout: "blank",
        notes: "If you remember one slide, make it this one.",
        elements: [
          heading("talk-7-a", [7.5, 7, 85, 10], "Three things to steal"),
          shape("talk-7-b", "rect", [7.5, 20, 85, 0.3], LINE),
          ...lesson(
            "talk-7-c",
            24,
            "1",
            "Quarantine on the first flake",
            "Move it out of the blocking suite automatically. Fix it within a week or delete it.",
          ),
          ...lesson(
            "talk-7-d",
            48,
            "2",
            "Make time and randomness injectable",
            "Two thirds of our flakes were clocks, random seeds and network calls.",
          ),
          ...lesson(
            "talk-7-e",
            72,
            "3",
            "Put the flake rate on a dashboard",
            "Every team saw its own number every Monday. Nothing else changed behaviour as fast.",
          ),
        ],
      }),
      slide({
        id: "talk-8",
        layout: "quote",
        notes:
          "The quote that started the project, from our most senior engineer, in a retro.",
        html: {
          quote: p(
            "A test that fails randomly is worse than no test at all. It teaches people to ignore red.",
          ),
          attribution: p("Tomás Ferreira, Principal Engineer, Parcelwise"),
        },
      }),
      slide({
        id: "talk-9",
        layout: "blank",
        background: "grad-night",
        notes:
          "Thank you. Slides and the quarantine bot are open source, links on screen. I will be at the Parcelwise stand all afternoon.",
        elements: [
          heading("talk-9-a", [7.5, 22, 60, 20], "Thank you.", 120),
          text(
            "talk-9-b",
            [7.5, 52, 60, 6],
            p("slides: parcelwise.dev/flaky"),
            { font: "mono", size: 26, color: "accent" },
          ),
          text(
            "talk-9-c",
            [7.5, 60, 60, 6],
            p("code: github.com/parcelwise/quarantine-bot"),
            { font: "mono", size: 26 },
          ),
          text("talk-9-d", [7.5, 68, 60, 6], p("@priyabuilds"), {
            font: "mono",
            size: 26,
            opacity: 0.7,
          }),
          shape("talk-9-e", "circle", [70, 24, 22, sq(22)], "accent"),
          icon("talk-9-f", "message-circle", 75.5, 34, 11, INK, {
            strokeWidth: 1.5,
          }),
        ],
      }),
    ],
  },
};
