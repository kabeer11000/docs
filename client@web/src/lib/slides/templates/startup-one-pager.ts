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

const INK = "#121418";
const YELLOW = "#FFE45C";

const step = (
  id: string,
  x: number,
  n: string,
  title: string,
  body: string,
) => [
  shape(`${id}-a`, "circle", [x + 6, 30, 10, sq(10)], INK),
  text(`${id}-b`, [x + 6, 35.5, 10, 8], pc(n), {
    font: "title",
    size: 52,
    color: YELLOW,
  }),
  text(`${id}-c`, [x, 54, 22, 7], pc(`<strong>${title}</strong>`), {
    size: 28,
  }),
  text(`${id}-d`, [x, 62, 22, 22], pc(body), { size: 20 }),
];

export const startupOnePager: SlideTemplate = {
  id: "startup-one-pager",
  name: "Startup One-Pager",
  category: "Business",
  description:
    "A punchy six-slide lemon and blue deck: what we do, why now, how it works, traction and the ask.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "lemon",
    transition: "slide",
    slides: [
      slide({
        id: "one-1",
        layout: "blank",
        notes:
          "Thirty-second version: Tidepool runs the front desk for independent physio clinics, so therapists can treat instead of typing.",
        elements: [
          shape("one-1-a", "circle", [60, -26, 56, sq(56)], "accent"),
          shape("one-1-b", "star", [80, 18, 10, sq(10)], YELLOW, {
            rotation: 18,
          }),
          shape("one-1-c", "circle", [52, 70, 7, sq(7)], INK),
          text("one-1-d", [7.5, 20, 50, 28], p("Tidepool"), {
            font: "title",
            size: 140,
          }),
          text(
            "one-1-e",
            [7.5, 50, 44, 18],
            p(
              "The front desk that runs itself, built for independent physio clinics.",
            ),
            {
              size: 32,
            },
          ),
          text(
            "one-1-f",
            [7.5, 84, 44, 5],
            p("Pre-seed. Dublin. hello@tidepool.health"),
            { font: "mono", size: 18 },
          ),
        ],
      }),
      slide({
        id: "one-2",
        layout: "two-column",
        notes:
          "Problem on the left, our answer on the right. Most clinics we met still run bookings from a paper diary and a shared mobile.",
        html: {
          title: p("Clinics are drowning in admin"),
          left: `${p(accent("<strong>Today</strong>"))}${ul("Therapists answer calls between patients", "1 in 8 appointments is a no-show", "Invoices chased by hand at month end")}`,
          right: `${p(accent("<strong>With Tidepool</strong>"))}${ul("Patients book and rebook by text", "Smart reminders cut no-shows to 1 in 30", "Insurers billed automatically")}`,
        },
        elements: [shape("one-2-a", "rect", [48.6, 30, 0.4, 56], INK)],
      }),
      slide({
        id: "one-3",
        layout: "big-number",
        background: "#FFFFFF",
        notes:
          "Measured across our first 40 clinics over 12 weeks. That is almost a full clinical day back every week.",
        html: {
          stat: p("6.5 hrs"),
          caption: p(
            "of admin saved per clinic, per week, across our first 40 clinics.",
          ),
        },
        elements: [
          shape("one-3-a", "rect", [0, 0, 100, 3], "accent"),
          icon("one-3-b", "clock", 84, 12, 8, "accent", { strokeWidth: 1.5 }),
        ],
      }),
      slide({
        id: "one-4",
        layout: "blank",
        notes:
          "Setup takes one afternoon. We import the diary from a photo if we have to; that one always gets a laugh.",
        elements: [
          text("one-4-a", [7.5, 8, 85, 10], p("Live in one afternoon"), {
            font: "title",
            size: 56,
          }),
          ...step(
            "one-4-b",
            7.5,
            "1",
            "Connect",
            "Link the clinic phone number and calendar. Ten minutes.",
          ),
          shape("one-4-c", "arrow", [31.5, 36, 6, 6], "accent"),
          ...step(
            "one-4-d",
            39,
            "2",
            "Import",
            "We bring in patients and bookings, even from a paper diary.",
          ),
          shape("one-4-e", "arrow", [63, 36, 6, 6], "accent"),
          ...step(
            "one-4-f",
            70.5,
            "3",
            "Relax",
            "Tidepool answers, books, reminds and bills from day one.",
          ),
        ],
      }),
      slide({
        id: "one-5",
        layout: "blank",
        notes:
          "Active clinics per month since launch in March. Growth is entirely word of mouth so far; we have not spent on ads.",
        elements: [
          text("one-5-a", [7.5, 10, 34, 5], p("TRACTION"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("one-5-b", [7.5, 16, 34, 20], p("140 clinics, zero ad spend."), {
            font: "title",
            size: 52,
          }),
          text(
            "one-5-c",
            [7.5, 44, 32, 40],
            ul(
              "EUR 31k monthly recurring revenue",
              "Net revenue retention 128%",
              "4.9 rating from 2,300 patients",
            ),
            {
              size: 22,
            },
          ),
          shape("one-5-d", "rounded", [44, 10, 49, 80], "#FFFFFF", {
            radius: 28,
          }),
          chart(
            "one-5-e",
            "line",
            [47, 16, 43, 68],
            ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
            [6, 14, 25, 41, 62, 88, 112, 140],
            "accent",
          ),
        ],
      }),
      slide({
        id: "one-6",
        layout: "blank",
        background: INK,
        notes:
          "Close on the ask and leave the email on screen during questions.",
        elements: [
          shape("one-6-b", "circle", [74, 48, 40, sq(40)], "accent"),
          text("one-6-c", [7.5, 14, 50, 5], p("THE ASK"), {
            font: "mono",
            size: 18,
            color: YELLOW,
          }),
          text("one-6-d", [7.5, 22, 60, 26], p("Raising EUR 1.2M"), {
            font: "title",
            size: 104,
            color: YELLOW,
          }),
          text(
            "one-6-e",
            [7.5, 52, 52, 18],
            p(
              "To reach 1,000 clinics across Ireland and the UK by the end of 2027.",
            ),
            {
              size: 28,
              color: "#FFFFFF",
            },
          ),
          text("one-6-f", [7.5, 80, 50, 6], p("niamh@tidepool.health"), {
            font: "mono",
            size: 24,
            color: YELLOW,
          }),
        ],
      }),
    ],
  },
};
