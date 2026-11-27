import { accent, icon, p, pc, shape, slide, sq, text, ul } from "./build";
import type { SlideTemplate } from "./types";

const COBALT = "#2337C6";
const DEEP = "#1A2A9E";
const YELLOW = "#FFE45C";

const feature = (
  id: string,
  y: number,
  name: string,
  title: string,
  body: string,
) => [
  shape(`${id}-a`, "circle", [50, y, 6, sq(6)], DEEP),
  icon(`${id}-b`, name, 51.5, y + 2.6, 3),
  text(`${id}-c`, [59, y - 0.5, 34, 6], p(`<strong>${title}</strong>`), {
    size: 28,
  }),
  text(`${id}-d`, [59, y + 5.5, 34, 8], p(body), { size: 19, opacity: 0.8 }),
];

const milestone = (
  id: string,
  x: number,
  date: string,
  label: string,
  done: boolean,
) => [
  shape(`${id}-a`, "circle", [x, 47.3, 3, sq(3)], done ? "accent" : COBALT, {
    stroke: "accent",
    strokeWidth: 4,
  }),
  text(`${id}-b`, [x - 6, 32, 15, 8], pc(`<strong>${date}</strong>`), {
    size: 26,
    color: "accent",
  }),
  text(`${id}-c`, [x - 7, 60, 17, 18], pc(label), { size: 20 }),
];

export const productLaunch: SlideTemplate = {
  id: "product-launch",
  name: "Product Launch",
  category: "Business",
  description:
    "Bold cobalt and yellow launch deck with a hero reveal, feature list, pricing cards and a rollout timeline.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "ink",
    transition: "zoom",
    slides: [
      slide({
        id: "launch-1",
        layout: "blank",
        notes:
          "Lights down. Let the name sit on screen for a beat before speaking. Then: two years, 41 prototypes, and one goal - the quietest earbuds we have ever made.",
        elements: [
          shape("launch-1-a", "circle", [58, 30, 60, sq(60)], "accent"),
          shape("launch-1-b", "circle", [52, 18, 72, sq(72)], "none", {
            stroke: "accent",
            strokeWidth: 2,
            opacity: 0.4,
          }),
          icon("launch-1-c", "headphones", 70, 46, 14, COBALT, {
            strokeWidth: 1.5,
          }),
          text("launch-1-d", [7.5, 16, 40, 6], p("HALDEN AUDIO PRESENTS"), {
            font: "mono",
            size: 20,
            color: "accent",
          }),
          text("launch-1-e", [7.5, 26, 55, 32], p("Orbit 2"), {
            font: "title",
            size: 168,
          }),
          text("launch-1-f", [7.5, 62, 44, 10], p("Silence, on your terms."), {
            size: 40,
          }),
          text(
            "launch-1-g",
            [7.5, 86, 40, 5],
            p("Launch event. Copenhagen, 14 April 2027"),
            { size: 18, opacity: 0.7 },
          ),
        ],
      }),
      slide({
        id: "launch-2",
        layout: "agenda",
        notes:
          "Quick map of the next twenty minutes so the press know when to expect pricing.",
        html: {
          title: p("Today"),
          body: p(
            "Why we rebuilt Orbit from scratch",
            "Three things that are new",
            "Orbit 1 versus Orbit 2",
            "Pricing and availability",
            "Live demo with Freja Lund",
          ),
        },
        elements: [
          shape("launch-2-a", "circle", [84, -20, 26, sq(26)], "accent", {
            opacity: 0.9,
          }),
        ],
      }),
      slide({
        id: "launch-3",
        layout: "big-number",
        notes:
          "The number everyone asks about first. 38 hours with the case, 9 on a single charge with noise cancelling on. That is a full transatlantic round trip.",
        html: {
          stat: p("38 hrs"),
          caption: p(
            "of listening with the case. Nine hours per charge with noise cancelling on, and ten minutes of charging buys you three more.",
          ),
        },
        elements: [
          icon("launch-3-a", "zap", 84, 10, 8, "accent", { strokeWidth: 1.5 }),
          shape("launch-3-b", "rect", [0, 96, 100, 4], "accent"),
        ],
      }),
      slide({
        id: "launch-4",
        layout: "blank",
        notes:
          "Three headline features. Spend the most time on adaptive silence: it is the one reviewers will test first. Spatial calls is the surprise.",
        elements: [
          shape("launch-4-a", "rect", [0, 0, 42, 100], "accent"),
          text("launch-4-b", [7.5, 14, 30, 6], p("WHAT IS NEW"), {
            font: "mono",
            size: 18,
            color: COBALT,
          }),
          text(
            "launch-4-c",
            [7.5, 22, 32, 50],
            p("Built around the way you actually listen."),
            { font: "title", size: 60, color: COBALT },
          ),
          text(
            "launch-4-d",
            [7.5, 80, 30, 8],
            p("Every feature below is on by default."),
            { size: 20, color: COBALT },
          ),
          ...feature(
            "launch-4-e",
            14,
            "waves",
            "Adaptive silence",
            "Six microphones per bud re-tune cancellation 50,000 times a second.",
          ),
          ...feature(
            "launch-4-f",
            38,
            "mic",
            "Spatial calls",
            "Voices are placed around you, so a four-person call feels like a table.",
          ),
          ...feature(
            "launch-4-g",
            62,
            "leaf",
            "Repairable by design",
            "Replaceable batteries and tips. Every part sold for ten years.",
          ),
        ],
      }),
      slide({
        id: "launch-5",
        layout: "two-column",
        notes:
          "Do not dwell. The comparison speaks for itself; the weight number gets a reaction every time.",
        html: {
          title: p("Orbit 1 versus Orbit 2"),
          left: `${p("<strong>Orbit 1 (2024)</strong>")}${ul("24 hours with case", "Two microphones per bud", "5.9 g per bud", "Glued battery")}`,
          right: `${p(accent("<strong>Orbit 2 (2027)</strong>"))}${ul("38 hours with case", "Six microphones per bud", "4.1 g per bud", "Swappable battery, 10-year parts")}`,
        },
        elements: [
          shape("launch-5-a", "rect", [48.6, 30, 0.3, 58], "accent", {
            opacity: 0.5,
          }),
        ],
      }),
      slide({
        id: "launch-6",
        layout: "blank",
        notes:
          "Pricing. The standard model holds last year's price. Most pre-orders in our test markets went to the bundle, so we highlight Pro as the middle option.",
        elements: [
          text("launch-6-a", [7.5, 8, 80, 9], p("Pricing"), {
            font: "title",
            size: 56,
          }),
          shape("launch-6-b", "rounded", [7.5, 26, 26, 64], DEEP, {
            radius: 28,
          }),
          shape("launch-6-c", "rounded", [37, 22, 26, 72], "accent", {
            radius: 28,
          }),
          shape("launch-6-d", "rounded", [66.5, 26, 26, 64], DEEP, {
            radius: 28,
          }),
          icon("launch-6-e", "star", 46.5, 25, 7, COBALT),
          text("launch-6-f", [9.5, 32, 22, 6], p("Orbit 2"), { size: 26 }),
          text(
            "launch-6-g",
            [39, 40, 22, 6],
            p("<strong>Orbit 2 Pro</strong>"),
            { size: 26, color: COBALT },
          ),
          text("launch-6-h", [68.5, 32, 22, 6], p("Studio bundle"), {
            size: 26,
          }),
          text("launch-6-i", [9.5, 40, 22, 14], p("EUR 199"), {
            font: "title",
            size: 64,
          }),
          text("launch-6-j", [39, 48, 22, 14], p("EUR 279"), {
            font: "title",
            size: 64,
            color: COBALT,
          }),
          text("launch-6-k", [68.5, 40, 22, 14], p("EUR 349"), {
            font: "title",
            size: 64,
          }),
          text(
            "launch-6-l",
            [9.5, 58, 22, 28],
            p("Adaptive silence, 38-hour case, four colours."),
            { size: 20, opacity: 0.8 },
          ),
          text(
            "launch-6-m",
            [39, 66, 22, 26],
            p("Adds lossless audio, wireless charging and a titanium case."),
            { size: 20, color: COBALT },
          ),
          text(
            "launch-6-n",
            [68.5, 58, 22, 28],
            p("Orbit 2 Pro plus the Halden desk stand and two years of cover."),
            {
              size: 20,
              opacity: 0.8,
            },
          ),
        ],
      }),
      slide({
        id: "launch-7",
        layout: "blank",
        background: "pat-grid",
        notes:
          "Rollout. Press units ship this week; retail follows in May. Remind retail partners that display stock arrives 28 April.",
        elements: [
          text("launch-7-a", [7.5, 8, 80, 9], p("Rollout"), {
            font: "title",
            size: 56,
          }),
          shape("launch-7-b", "rect", [7.5, 49.6, 85, 0.6], "accent", {
            opacity: 0.6,
          }),
          ...milestone(
            "launch-7-c",
            12,
            "3 Feb",
            "Press preview in Copenhagen and New York",
            true,
          ),
          ...milestone(
            "launch-7-d",
            35,
            "10 Mar",
            "Pre-orders open online in 26 countries",
            true,
          ),
          ...milestone(
            "launch-7-e",
            58,
            "14 Apr",
            "Launch event and first deliveries",
            false,
          ),
          ...milestone(
            "launch-7-f",
            81,
            "May",
            "In 3,400 retail stores across 18 countries",
            false,
          ),
        ],
      }),
      slide({
        id: "launch-8",
        layout: "blank",
        background: "grad-ocean",
        notes:
          "Close on the call to action and hand over to Freja for the live demo.",
        elements: [
          shape("launch-8-a", "star", [80, 12, 9, sq(9)], YELLOW, {
            rotation: 12,
          }),
          shape("launch-8-b", "star", [88, 40, 4, sq(4)], YELLOW, {
            rotation: -10,
            opacity: 0.8,
          }),
          shape("launch-8-c", "star", [72, 62, 5, sq(5)], YELLOW, {
            rotation: 20,
            opacity: 0.6,
          }),
          text(
            "launch-8-d",
            [7.5, 26, 70, 34],
            p("Pre-orders open", accent("10 March.")),
            { font: "title", size: 96 },
          ),
          text("launch-8-e", [7.5, 74, 60, 6], p("orbit.haldenaudio.com"), {
            font: "mono",
            size: 26,
          }),
        ],
      }),
    ],
  },
};
