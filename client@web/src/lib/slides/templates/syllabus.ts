import {
  chart,
  heading,
  icon,
  kicker,
  p,
  shape,
  slide,
  table,
  text,
} from "./build";
import type { SlideTemplate } from "./types";

const RED = "#D7261E";
const WHITE = "#FFFFFF";
const SOFT = "#F1EEE8";
const BOOKS = ["#141414", "#D7261E", "#2F5D8A"];

const fact = (
  id: string,
  y: number,
  glyph: string,
  label: string,
  value: string,
) => [
  icon(`${id}-a`, glyph, 50, y, 3, "accent", { strokeWidth: 1.75 }),
  kicker(`${id}-b`, [55, y - 0.5, 36, 4], label, "fg", 15),
  text(`${id}-c`, [55, y + 3.5, 38, 6], p(value), { size: 22 }),
];

const outcome = (id: string, x: number, y: number, n: string, body: string) => [
  text(`${id}-a`, [x, y, 8, 14], p(n), {
    font: "title",
    size: 72,
    color: "accent",
  }),
  text(`${id}-b`, [x + 8, y + 2, 32, 20], p(body), { size: 22 }),
];

const book = (
  id: string,
  x: number,
  h: number,
  fill: string,
  title: string,
  author: string,
) => [
  shape(`${id}-a`, "rect", [x, 92 - h, 9, h], fill),
  shape(`${id}-b`, "rect", [x, 92 - h + 3, 9, 0.5], WHITE, { opacity: 0.5 }),
  text(
    `${id}-c`,
    [x - 15.5, 92 - h / 2 - 3.5, 40, 7],
    p(`<strong>${title}</strong>`),
    {
      size: 20,
      color: WHITE,
      rotation: -90,
      align: "center",
    },
  ),
  text(
    `${id}-d`,
    [x + 11, 92 - h + 2, 18, 12],
    p(`<strong>${title}</strong>`, author),
    { size: 17 },
  ),
];

const policy = (
  id: string,
  x: number,
  glyph: string,
  title: string,
  body: string,
) => [
  shape(`${id}-a`, "rect", [x, 28, 27, 0.6], "accent"),
  icon(`${id}-b`, glyph, x, 33, 3.5, "fg", { strokeWidth: 1.5 }),
  text(`${id}-c`, [x, 42, 27, 7], p(`<strong>${title}</strong>`), { size: 26 }),
  text(`${id}-d`, [x, 50, 26, 38], p(body), { size: 19, opacity: 0.8 }),
];

export const syllabus: SlideTemplate = {
  id: "course-syllabus",
  name: "Course Syllabus",
  category: "Education",
  description:
    "Editorial first-day syllabus: course cover, logistics, learning outcomes, week-by-week schedule, grading pie, reading list as book spines and policies.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "editorial",
    transition: "fade",
    slides: [
      slide({
        id: "syl-1",
        layout: "blank",
        notes:
          "Welcome to the first session. Today is the map of the semester: what we read, how you are assessed and how to reach me.",
        elements: [
          shape("syl-1-a", "rect", [0, 0, 36, 100], RED),
          text("syl-1-b", [3, 10, 32, 8], p("ENV"), {
            font: "mono",
            size: 40,
            color: WHITE,
          }),
          text("syl-1-c", [2, 56, 34, 36], p("210"), {
            font: "title",
            size: 200,
            color: WHITE,
          }),
          kicker("syl-1-d", [42, 12, 50, 5], "SPRING SEMESTER 2027"),
          heading("syl-1-e", [42, 22, 52, 34], "Climate and the City", 84),
          shape("syl-1-f", "rect", [42, 60, 8, 0.6], "accent"),
          text(
            "syl-1-g",
            [42, 65, 48, 20],
            p(
              "How cities heat up, flood and adapt, and who decides what gets built. An introduction for second-year students.",
            ),
            { size: 22, opacity: 0.75 },
          ),
        ],
      }),
      slide({
        id: "syl-2",
        layout: "blank",
        notes:
          "Office hours are drop-in, no booking needed. Email for anything that cannot wait until class.",
        elements: [
          kicker("syl-2-a", [7.5, 12, 36, 5], "THE ESSENTIALS"),
          heading("syl-2-b", [7.5, 18, 36, 20], "Dr. Helen Abara", 60),
          text(
            "syl-2-c",
            [7.5, 42, 34, 30],
            p(
              "Urban geographer. Fifteen years studying heat and flooding in Lagos, Rotterdam and Manchester.",
            ),
            { size: 22, opacity: 0.75 },
          ),
          shape("syl-2-d", "rect", [46, 10, 0.3, 80], "fg", { opacity: 0.2 }),
          ...fact(
            "syl-2-e",
            14,
            "calendar",
            "WHEN",
            "Tuesdays and Thursdays, 10:00 to 11:30",
          ),
          ...fact(
            "syl-2-f",
            32,
            "map-pin",
            "WHERE",
            "Hartley Building, Room 2.14",
          ),
          ...fact(
            "syl-2-g",
            50,
            "clock",
            "OFFICE HOURS",
            "Wednesdays 14:00 to 16:00, Room 4.02",
          ),
          ...fact(
            "syl-2-h",
            68,
            "mail",
            "CONTACT",
            "h.abara@university.ac.uk, replies within 48 hours",
          ),
        ],
      }),
      slide({
        id: "syl-3",
        layout: "blank",
        notes:
          "By the end of the course you should be able to do all four of these. The final project tests every one.",
        elements: [
          heading(
            "syl-3-a",
            [7.5, 8, 85, 10],
            "By the end of this course you will",
          ),
          ...outcome(
            "syl-3-b",
            7.5,
            26,
            "1",
            "Explain the urban heat island effect and read a land-surface temperature map.",
          ),
          ...outcome(
            "syl-3-c",
            52,
            26,
            "2",
            "Compare grey, green and blue approaches to flood risk.",
          ),
          ...outcome(
            "syl-3-d",
            7.5,
            58,
            "3",
            "Critique an adaptation plan for who benefits and who pays.",
          ),
          ...outcome(
            "syl-3-e",
            52,
            58,
            "4",
            "Write a 3,000-word policy brief for a real city council.",
          ),
        ],
      }),
      slide({
        id: "syl-4",
        layout: "blank",
        notes:
          "Four blocks of three weeks. Reading week is week 7. The field trip to the Thames Barrier is in week 9.",
        elements: [
          heading("syl-4-a", [7.5, 8, 85, 10], "Schedule"),
          ...table(
            "syl-4-b",
            [7.5, 24, 85],
            [1.5, 4, 4],
            [
              ["WEEKS", "THEME", "WHAT IS DUE"],
              [
                "1 to 3",
                "How cities make their own climate",
                "Reading response 1",
              ],
              ["4 to 6", "Heat: who suffers, who adapts", "Heat map exercise"],
              ["7", "Reading week", "Nothing, rest"],
              [
                "8 to 10",
                "Water: flood, drought, the barrier",
                "Field trip report",
              ],
              ["11 to 12", "Politics of adaptation", "Policy brief, 15 May"],
            ],
            { rowH: 10.5, size: 22, band: SOFT },
          ),
        ],
      }),
      slide({
        id: "syl-5",
        layout: "blank",
        notes:
          "No final exam. The policy brief is the big one, and you get feedback on a draft first.",
        elements: [
          kicker("syl-5-a", [7.5, 12, 36, 5], "ASSESSMENT"),
          heading("syl-5-b", [7.5, 18, 36, 14], "How you are graded", 52),
          ...table(
            "syl-5-c",
            [7.5, 36, 38],
            [4, 1],
            [
              ["COMPONENT", "WEIGHT"],
              ["Reading responses, 4", "20%"],
              ["Heat map exercise", "15%"],
              ["Field trip report", "20%"],
              ["Policy brief", "35%"],
              ["Participation", "10%"],
            ],
            { rowH: 9, size: 20 },
          ),
          chart(
            "syl-5-d",
            "pie",
            [52, 12, 42, 76],
            [
              "Responses",
              "Heat map",
              "Field trip",
              "Policy brief",
              "Participation",
            ],
            [20, 15, 20, 35, 10],
            "accent",
          ),
        ],
      }),
      slide({
        id: "syl-6",
        layout: "blank",
        notes:
          "Three set texts. All are in the library and the first two are available as e-books.",
        elements: [
          kicker("syl-6-a", [7.5, 10, 40, 5], "REQUIRED READING"),
          heading(
            "syl-6-b",
            [7.5, 15, 85, 10],
            "Three books, read in this order",
          ),
          ...book(
            "syl-6-c",
            10,
            56,
            BOOKS[0],
            "Heat Island",
            "Brian Stone, 2012",
          ),
          ...book(
            "syl-6-d",
            40,
            66,
            BOOKS[1],
            "The Water Will Come",
            "Jeff Goodell, 2017",
          ),
          ...book(
            "syl-6-e",
            70,
            50,
            BOOKS[2],
            "Adaptive Cities",
            "M. Oduya, 2023",
          ),
        ],
      }),
      slide({
        id: "syl-7",
        layout: "blank",
        notes:
          "Read the AI policy carefully. It is permissive, but you must say what you used.",
        elements: [
          heading("syl-7-a", [7.5, 8, 85, 10], "Policies"),
          ...policy(
            "syl-7-b",
            7.5,
            "users",
            "Attendance",
            "Come to class. Miss more than four sessions without a reason and we need to talk.",
          ),
          ...policy(
            "syl-7-c",
            36.5,
            "hourglass",
            "Late work",
            "Five percent off per day, up to five days. Extensions are granted if you ask before the deadline.",
          ),
          ...policy(
            "syl-7-d",
            65.5,
            "sparkles",
            "AI tools",
            "Allowed for research and editing. Add a short note saying which tool you used and how.",
          ),
        ],
      }),
      slide({
        id: "syl-8",
        layout: "big-number",
        notes:
          "First reading response is due next Thursday. 500 words on chapter one of Heat Island.",
        html: {
          stat: p("Thu 22 Jan"),
          caption: p(
            "First reading response due. 500 words on chapter one of <em>Heat Island</em>. See you on Thursday.",
          ),
        },
        elements: [kicker("syl-8-a", [7.5, 7, 40, 5], "BEFORE NEXT WEEK")],
      }),
    ],
  },
};
