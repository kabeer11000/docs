import {
  heading,
  icon,
  kicker,
  ol,
  p,
  pc,
  shape,
  slide,
  sq,
  table,
  text,
} from "./build";
import type { SlideTemplate } from "./types";

const PLUM = "#3A0F22";
const WHITE = "#FFFFFF";
const ROSE = "#FFD0C2";
const GOLD = "#FFB547";

const card = (
  id: string,
  x: number,
  y: number,
  es: string,
  en: string,
  fill: string,
  fg: string,
) => [
  shape(`${id}-a`, "rounded", [x, y, 27, 30], fill, { radius: 18 }),
  text(`${id}-b`, [x + 2, y + 6, 23, 10], pc(es), {
    font: "title",
    size: 38,
    color: fg,
  }),
  text(`${id}-c`, [x + 2, y + 18, 23, 6], pc(en), {
    size: 20,
    color: fg,
    opacity: 0.7,
  }),
];

const line = (
  id: string,
  y: number,
  who: string,
  es: string,
  en: string,
  right: boolean,
) => {
  const x = right ? 44 : 7.5;
  return [
    shape(`${id}-a`, "bubble", [x, y, 48.5, 20], right ? PLUM : WHITE),
    kicker(`${id}-b`, [x + 3, y + 2, 40, 4], who, right ? GOLD : "accent", 15),
    text(`${id}-c`, [x + 3, y + 6, 43, 6], p(`<strong>${es}</strong>`), {
      size: 26,
      color: right ? WHITE : PLUM,
    }),
    text(`${id}-d`, [x + 3, y + 11.5, 43, 5], p(en), {
      size: 17,
      color: right ? WHITE : PLUM,
      opacity: 0.7,
    }),
  ];
};

export const languageLesson: SlideTemplate = {
  id: "language-lesson",
  name: "Language Lesson",
  category: "Education",
  description:
    "Friendly blush Spanish lesson on ordering coffee: goals, flash cards, a speech-bubble dialogue, a grammar table, a pronunciation tip and practice.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "blush",
    transition: "slide",
    slides: [
      slide({
        id: "lang-1",
        layout: "blank",
        notes:
          "Greet the class in Spanish only for the first minute. Today is all about ordering in a cafe, which you will role-play at the end.",
        elements: [
          shape("lang-1-a", "bubble", [58, 12, 34, 40], "accent"),
          text("lang-1-b", [60, 20, 30, 18], pc("¡Hola!"), {
            font: "title",
            size: 80,
            color: WHITE,
          }),
          shape("lang-1-c", "bubble", [66, 56, 24, 28], PLUM, { rotation: 6 }),
          icon("lang-1-d", "coffee", 74, 61, 8, GOLD, {
            strokeWidth: 1.5,
            rotation: 6,
          }),
          kicker("lang-1-e", [7.5, 14, 40, 5], "SPANISH A1 / LESSON 6"),
          heading("lang-1-f", [7.5, 24, 48, 30], "En el café", 104),
          text(
            "lang-1-g",
            [7.5, 60, 44, 14],
            p("Ordering drinks and snacks, politely, in Spanish."),
            { size: 28 },
          ),
        ],
      }),
      slide({
        id: "lang-2",
        layout: "blank",
        notes:
          "Read the three goals. At the end of the lesson we will come back to this slide and tick them off together.",
        elements: [
          heading("lang-2-a", [7.5, 8, 85, 10], "Today you will be able to"),
          ...[
            ["Name ten things on a cafe menu", "coffee"],
            ["Order politely with quisiera", "message-circle"],
            ["Ask for the bill and pay", "wallet"],
          ].flatMap(([goal, g], i) => [
            shape(
              `lang-2-b${i}`,
              "rounded",
              [7.5, 26 + i * 22, 85, 18],
              WHITE,
              { radius: 18 },
            ),
            icon(`lang-2-c${i}`, g, 10.5, 29.5 + i * 22, 3.5, "accent", {
              strokeWidth: 1.75,
            }),
            text(`lang-2-d${i}`, [17, 30 + i * 22, 64, 8], p(goal), {
              size: 30,
            }),
            icon(`lang-2-e${i}`, "circle-check", 86, 29.5 + i * 22, 3.5, PLUM, {
              strokeWidth: 1.5,
              opacity: 0.3,
            }),
          ]),
        ],
      }),
      slide({
        id: "lang-3",
        layout: "blank",
        notes:
          "Say each word, class repeats twice. Point out the accent on café and the silent h in horchata.",
        elements: [
          heading("lang-3-a", [7.5, 7, 85, 10], "Vocabulario"),
          ...card(
            "lang-3-b",
            7.5,
            24,
            "un café con leche",
            "a milky coffee",
            PLUM,
            WHITE,
          ),
          ...card(
            "lang-3-c",
            36.5,
            24,
            "un cortado",
            "espresso with a dash of milk",
            WHITE,
            PLUM,
          ),
          ...card(
            "lang-3-d",
            65.5,
            24,
            "una horchata",
            "tiger nut milk drink",
            "accent",
            WHITE,
          ),
          ...card(
            "lang-3-e",
            7.5,
            60,
            "un zumo de naranja",
            "an orange juice",
            WHITE,
            PLUM,
          ),
          ...card(
            "lang-3-f",
            36.5,
            60,
            "una tostada",
            "toast with tomato",
            ROSE,
            PLUM,
          ),
          ...card("lang-3-g", 65.5, 60, "la cuenta", "the bill", PLUM, WHITE),
        ],
      }),
      slide({
        id: "lang-4",
        layout: "blank",
        notes:
          "Two volunteers read the dialogue. Then everyone practises in pairs, swapping roles.",
        elements: [
          heading("lang-4-a", [7.5, 6, 85, 10], "En la barra"),
          ...line(
            "lang-4-b",
            20,
            "CAMARERO",
            "Buenos días, ¿qué le pongo?",
            "Good morning, what can I get you?",
            false,
          ),
          ...line(
            "lang-4-c",
            40,
            "TÚ",
            "Quisiera un cortado, por favor.",
            "I would like a cortado, please.",
            true,
          ),
          ...line(
            "lang-4-d",
            60,
            "CAMARERO",
            "¿Algo más?",
            "Anything else?",
            false,
          ),
          ...line(
            "lang-4-e",
            78,
            "TÚ",
            "No, gracias. ¿Cuánto es?",
            "No, thanks. How much is it?",
            true,
          ),
        ],
      }),
      slide({
        id: "lang-5",
        layout: "blank",
        notes:
          "Quiero is not rude, but quisiera sounds softer. Me pone is what you will hear most often in Spain.",
        elements: [
          kicker("lang-5-a", [7.5, 10, 40, 5], "GRAMÁTICA"),
          heading(
            "lang-5-b",
            [7.5, 15, 85, 10],
            "Three ways to ask for something",
          ),
          ...table(
            "lang-5-c",
            [7.5, 30, 85],
            [3, 3, 2],
            [
              ["SPANISH", "ENGLISH", "HOW IT SOUNDS"],
              ["Quiero un café", "I want a coffee", "Direct"],
              ["Quisiera un café", "I would like a coffee", "Polite"],
              [
                "¿Me pone un café?",
                "Will you get me a coffee?",
                "Natural in Spain",
              ],
            ],
            { rowH: 14, size: 26, band: WHITE },
          ),
        ],
      }),
      slide({
        id: "lang-6",
        layout: "blank",
        background: PLUM,
        notes:
          "Pronunciation tip. In most of Spain and Latin America, ll sounds like the y in yes. Practise: tortilla, bollo, me llamo.",
        elements: [
          kicker("lang-6-a", [7.5, 12, 40, 5], "PRONUNCIACIÓN", GOLD),
          text("lang-6-b", [6, 18, 40, 50], p("ll"), {
            font: "title",
            size: 300,
            color: "accent",
          }),
          icon("lang-6-c", "arrow-right", 42, 38, 6, WHITE, {
            strokeWidth: 1.5,
          }),
          text("lang-6-d", [54, 18, 40, 50], p("y"), {
            font: "title",
            size: 300,
            color: WHITE,
          }),
          text(
            "lang-6-e",
            [7.5, 78, 85, 8],
            p("tortilla / bollo / me llamo / la calle"),
            { font: "mono", size: 30, color: ROSE },
          ),
        ],
      }),
      slide({
        id: "lang-7",
        layout: "blank",
        notes:
          "Five minutes, on your own. Then compare with your partner before we go through the answers.",
        elements: [
          heading("lang-7-a", [7.5, 8, 60, 10], "¡A practicar!"),
          icon("lang-7-b", "pencil", 86, 9, 5, "accent", { strokeWidth: 1.75 }),
          text(
            "lang-7-c",
            [7.5, 26, 80, 62],
            ol(
              "_______ un café con leche, por favor.",
              "¿Me _______ una tostada con tomate?",
              "¿Cuánto _______?",
              "La _______, por favor.",
              "No, gracias. Nada _______.",
            ),
            { size: 32 },
          ),
        ],
      }),
      slide({
        id: "lang-8",
        layout: "blank",
        notes:
          "Homework is on the class page. Next lesson: directions in the city.",
        elements: [
          shape("lang-8-a", "circle", [56, 6, 50, sq(50)], "accent"),
          text("lang-8-b", [60, 32, 36, 24], pc("¡Hasta luego!"), {
            font: "title",
            size: 64,
            color: WHITE,
          }),
          kicker("lang-8-c", [7.5, 16, 40, 5], "PARA EL JUEVES"),
          text(
            "lang-8-d",
            [7.5, 24, 42, 50],
            p(
              "Write a six-line dialogue ordering breakfast for two.",
              "Record yourself reading it aloud and upload it to the class page.",
            ),
            { size: 28 },
          ),
        ],
      }),
    ],
  },
};
