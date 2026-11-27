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

const VINYL = "#0D0614";
const GROOVE = "#2A1A3A";
const LILAC = "#C9A7FF";
const CARD = "#3A1A63";
const WHITE = "#FFFFFF";

/** A record: black disc, grooves, pink label, spindle hole. `s` is the width in percent. */
const record = (id: string, x: number, y: number, s: number) => [
  shape(`${id}-a`, "circle", [x, y, s, sq(s)], VINYL),
  ...[0.86, 0.72, 0.58].map((k, i) =>
    shape(
      `${id}-g${i}`,
      "circle",
      [x + (s * (1 - k)) / 2, y + (sq(s) * (1 - k)) / 2, s * k, sq(s * k)],
      "none",
      {
        stroke: GROOVE,
        strokeWidth: 2,
      },
    ),
  ),
  shape(
    `${id}-l`,
    "circle",
    [x + s * 0.34, y + sq(s) * 0.34, s * 0.32, sq(s * 0.32)],
    "accent",
  ),
  shape(
    `${id}-h`,
    "circle",
    [x + s * 0.485, y + sq(s) * 0.485, s * 0.03, sq(s * 0.03)],
    VINYL,
  ),
];

const beat = (
  id: string,
  x: number,
  date: string,
  title: string,
  live: boolean,
) => [
  shape(
    `${id}-a`,
    "circle",
    [x - 1.5, 50.3, 3, sq(3)],
    live ? "accent" : LILAC,
  ),
  text(`${id}-b`, [x - 8, 36, 16, 6], pc(date), {
    font: "mono",
    size: 18,
    color: live ? "accent" : LILAC,
  }),
  text(`${id}-c`, [x - 9, 62, 18, 14], pc(`<strong>${title}</strong>`), {
    size: 22,
  }),
];

export const albumLaunch: SlideTemplate = {
  id: "album-launch",
  name: "Album Launch",
  category: "Creative",
  description:
    "Grape and hot-pink music rollout: a vinyl record cover, tracklist, release date, press quote, listener growth, single timeline and tour dates.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "grape",
    transition: "zoom",
    slides: [
      slide({
        id: "alb-1",
        layout: "blank",
        background: "grad-dusk",
        notes:
          "This is the plan for Glass Weather, Mira's second album. Label, management and the agency all work from this deck.",
        elements: [
          ...record("alb-1-r", 62, 14, 40),
          shape("alb-1-a", "rect", [44, 12, 42, sq(42)], LILAC),
          shape("alb-1-s", "circle", [52, 26, 26, sq(26)], "accent", {
            opacity: 0.85,
          }),
          text("alb-1-t", [46, 76, 38, 6], p("GLASS WEATHER / MIRA VALE"), {
            font: "mono",
            size: 16,
            color: VINYL,
          }),
          kicker("alb-1-b", [7.5, 14, 40, 5], "MIRA VALE / LP2"),
          heading("alb-1-c", [7, 22, 36, 44], "Glass Weather", 112),
          text(
            "alb-1-d",
            [7.5, 70, 36, 14],
            p(
              "Ten songs about leaving the city and coming back. Out 14 March 2027.",
            ),
            {
              size: 24,
              opacity: 0.85,
            },
          ),
        ],
      }),
      slide({
        id: "alb-2",
        layout: "blank",
        notes:
          "Singles are marked in pink. Track 4 is the one radio has already asked for.",
        elements: [
          heading("alb-2-a", [7.5, 7, 40, 10], "Tracklist"),
          text("alb-2-b", [62, 8, 30, 8], p("38:42 / 10 tracks"), {
            font: "mono",
            size: 20,
            align: "right",
            color: LILAC,
          }),
          ...[
            ["Static Bloom", "3:41"],
            ["Northbound", "4:02"],
            ["Glass Weather", "3:55"],
            ["Small Hours", "3:18"],
            ["Concrete Garden", "4:27"],
            ["Ferris", "2:59"],
            ["Low Tide Lights", "4:11"],
            ["Signal", "3:36"],
            ["Back Roads", "4:05"],
            ["Homecoming", "4:28"],
          ].flatMap(([t, d], i) => {
            const x = 7.5 + Math.floor(i / 5) * 44;
            const y = 26 + (i % 5) * 13;
            const single = [0, 3, 6].includes(i);
            return [
              text(
                `alb-2-n${i}`,
                [x, y, 6, 8],
                p(String(i + 1).padStart(2, "0")),
                { font: "mono", size: 22, color: single ? "accent" : LILAC },
              ),
              text(
                `alb-2-t${i}`,
                [x + 6, y - 0.5, 28, 8],
                p(single ? `<strong>${t}</strong>` : t),
                { size: 28, color: single ? "accent" : "fg" },
              ),
              text(`alb-2-d${i}`, [x + 33, y, 7, 8], p(d), {
                font: "mono",
                size: 20,
                align: "right",
                opacity: 0.7,
              }),
            ];
          }),
        ],
      }),
      slide({
        id: "alb-3",
        layout: "big-number",
        notes:
          "Release day. Everything in the rollout points at this date, including the listening party in Manchester the night before.",
        html: {
          stat: p("14.03.27"),
          caption: p(
            "Glass Weather on vinyl, CD and every streaming service. Listening party at Band on the Wall the night before.",
          ),
        },
        elements: [
          kicker("alb-3-a", [7.5, 7, 40, 5], "RELEASE DAY"),
          icon("alb-3-b", "music", 84, 8, 8, "accent", { strokeWidth: 1.5 }),
        ],
      }),
      slide({
        id: "alb-4",
        layout: "blank",
        background: CARD,
        notes:
          "The quote from the advance review. We have permission to use it on the sticker and in ads.",
        elements: [
          shape("alb-4-a", "circle", [-12, 50, 40, sq(40)], "accent", {
            opacity: 0.25,
          }),
          icon("alb-4-b", "quote", 7.5, 12, 6, "accent", { strokeWidth: 1.5 }),
          heading(
            "alb-4-c",
            [7.5, 28, 80, 36],
            "A record that sounds like the drive home at 3am, windows down, nowhere to be.",
            54,
          ),
          text(
            "alb-4-d",
            [7.5, 74, 60, 6],
            p("<strong>The Line of Best Fit</strong>, advance review, 9/10"),
            { size: 24, color: LILAC },
          ),
        ],
      }),
      slide({
        id: "alb-5",
        layout: "blank",
        notes:
          "Monthly listeners since the first single. The jump in September is the BBC 6 Music playlist add.",
        elements: [
          kicker("alb-5-a", [7.5, 12, 36, 5], "MOMENTUM"),
          text("alb-5-b", [6.5, 18, 40, 22], p("412k"), {
            font: "title",
            size: 140,
            color: "accent",
          }),
          text(
            "alb-5-c",
            [7.5, 44, 34, 20],
            p(
              "monthly listeners, up from 61k when Static Bloom came out in June.",
            ),
            { size: 24 },
          ),
          text(
            "alb-5-d",
            [7.5, 70, 34, 12],
            p("Top cities: Manchester, London, Berlin, Melbourne."),
            { size: 20, opacity: 0.7 },
          ),
          shape("alb-5-e", "rounded", [46, 10, 47, 80], CARD, { radius: 28 }),
          chart(
            "alb-5-f",
            "line",
            [49, 16, 41, 68],
            ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
            [61, 88, 120, 265, 330, 412],
            "accent",
          ),
        ],
      }),
      slide({
        id: "alb-6",
        layout: "blank",
        notes:
          "Four beats before release day, then the tour. Each single gets a video and a two-week paid push.",
        elements: [
          heading("alb-6-a", [7.5, 8, 85, 10], "Rollout"),
          shape("alb-6-b", "rect", [7.5, 51.5, 85, 0.6], LILAC, {
            opacity: 0.5,
          }),
          ...beat("alb-6-c", 14, "JUN 20", "Static Bloom, single one", false),
          ...beat("alb-6-d", 32, "OCT 10", "Small Hours, single two", false),
          ...beat("alb-6-e", 50, "JAN 16", "Low Tide Lights and video", false),
          ...beat("alb-6-f", 68, "MAR 14", "Album out", true),
          ...beat("alb-6-g", 86, "APR 2", "UK and EU tour begins", false),
        ],
      }),
      slide({
        id: "alb-7",
        layout: "blank",
        notes:
          "Twelve dates on sale now. Manchester and London are nearly sold out, Berlin is moving to a bigger room.",
        elements: [
          heading("alb-7-a", [7.5, 8, 60, 10], "On tour, spring 2027"),
          icon("alb-7-b", "mic", 86, 9, 5, "accent", { strokeWidth: 1.5 }),
          ...table(
            "alb-7-c",
            [7.5, 24, 85],
            [2, 3, 3, 2],
            [
              ["DATE", "CITY", "VENUE", "STATUS"],
              ["2 Apr", "Manchester", "Albert Hall", "Final tickets"],
              ["4 Apr", "Glasgow", "Saint Luke's", "On sale"],
              ["7 Apr", "London", "Roundhouse", "Final tickets"],
              ["12 Apr", "Berlin", "Columbia Theater", "Upgraded"],
              ["15 Apr", "Amsterdam", "Paradiso", "On sale"],
            ],
            { rowH: 10.5, size: 22, band: CARD },
          ),
        ],
      }),
      slide({
        id: "alb-8",
        layout: "blank",
        background: "grad-dusk",
        notes: "End on the pre-save. The link goes in every bio from today.",
        elements: [
          ...record("alb-8-r", 62, 22, 30),
          heading("alb-8-a", [7.5, 26, 50, 22], "Pre-save Glass Weather", 76),
          text("alb-8-b", [7.5, 56, 46, 8], p("miravale.com/glassweather"), {
            font: "mono",
            size: 28,
            color: "accent",
          }),
          text(
            "alb-8-c",
            [7.5, 66, 46, 12],
            p(
              "Signed vinyl for the first 1,000 pre-orders. Limited pink pressing.",
            ),
            { size: 22, color: WHITE, opacity: 0.85 },
          ),
        ],
      }),
    ],
  },
};
