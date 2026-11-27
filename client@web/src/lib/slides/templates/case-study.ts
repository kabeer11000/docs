import { chart, icon, p, shape, slide, sq, text } from "./build";
import type { SlideTemplate } from "./types";

const DARK = "#1C0D04";
const WHITE = "#FFFFFF";

const stat = (id: string, x: number, value: string, label: string) => [
  text(`${id}-a`, [x, 34, 26, 16], p(value), {
    font: "title",
    size: 88,
    color: WHITE,
  }),
  shape(`${id}-b`, "rect", [x, 54, 8, 0.8], DARK),
  text(`${id}-c`, [x, 58, 25, 24], p(label), { size: 22 }),
];

export const caseStudy: SlideTemplate = {
  id: "case-study",
  name: "Case Study",
  category: "Business",
  description:
    "Loud tangerine agency case study: headline result, brief, research, before and after, results chart and takeaways.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "tangerine",
    transition: "slide",
    slides: [
      slide({
        id: "case-1",
        layout: "blank",
        notes:
          "Lead with the result. Everything after this slide explains how we got the 38 percent.",
        elements: [
          text("case-1-a", [7.5, 10, 50, 5], p("CASE STUDY / FERNWAY"), {
            font: "mono",
            size: 20,
            color: DARK,
          }),
          text("case-1-b", [5.5, 14, 70, 50], p("-38%"), {
            font: "title",
            size: 300,
            color: WHITE,
          }),
          shape("case-1-c", "rect", [0, 72, 100, 28], DARK),
          text(
            "case-1-d",
            [7.5, 77, 70, 16],
            p("How Fernway cut checkout drop-off in eight weeks"),
            {
              font: "title",
              size: 44,
              color: WHITE,
            },
          ),
          shape("case-1-e", "circle", [84, 8, 12, sq(12)], DARK),
          icon("case-1-f", "shopping-cart", 87, 13.5, 6, "#FF6A1F", {
            strokeWidth: 1.75,
          }),
        ],
      }),
      slide({
        id: "case-2",
        layout: "title-body",
        notes:
          "Fernway sells houseplants online across the Benelux. Their mobile checkout had not changed since 2019.",
        html: {
          title: p("The brief"),
          body: `<blockquote><p>Mobile traffic doubled in two years. Mobile revenue did not. Find out why, and fix it before peak season.</p></blockquote>${p(
            "<strong>Fernway</strong>, online plant shop. 2.4M visits a month, 74% on mobile. Engagement: 8 weeks, July to September 2026.",
          )}`,
        },
      }),
      slide({
        id: "case-3",
        layout: "big-number",
        notes:
          "The single most important finding. Delivery is where people left, and almost always on the postcode lookup.",
        html: {
          stat: p("71%"),
          caption: p(
            "of mobile shoppers who abandoned checkout left on the delivery step, most of them at the postcode lookup.",
          ),
        },
        elements: [
          text("case-3-a", [7.5, 7, 40, 5], p("THE PROBLEM"), {
            font: "mono",
            size: 18,
            color: DARK,
          }),
        ],
      }),
      slide({
        id: "case-4",
        layout: "blank",
        notes:
          "Three research streams in the first three weeks. The session recordings found the bug; the interviews explained the trust problem.",
        elements: [
          text("case-4-a", [7.5, 10, 85, 10], p("What we did first"), {
            font: "title",
            size: 60,
          }),
          ...stat(
            "case-4-b",
            7.5,
            "24",
            "customer interviews, half of them people who had abandoned a basket",
          ),
          ...stat(
            "case-4-c",
            37,
            "3,800",
            "checkout session recordings reviewed and tagged",
          ),
          ...stat(
            "case-4-d",
            66.5,
            "6 wks",
            "diary study with 15 repeat customers",
          ),
        ],
      }),
      slide({
        id: "case-5",
        layout: "blank",
        notes:
          "Before and after. We cut the flow to two steps, made delivery address lookup work offline-first, and moved account creation to after payment.",
        elements: [
          shape("case-5-a", "rounded", [7.5, 12, 38, 76], DARK, { radius: 28 }),
          shape("case-5-b", "rounded", [54.5, 12, 38, 76], WHITE, {
            radius: 28,
          }),
          shape("case-5-c", "circle", [46.5, 43, 7, sq(7)], DARK),
          shape("case-5-d", "arrow", [48, 47.5, 4, 3], WHITE),
          text("case-5-e", [11, 18, 30, 5], p("BEFORE"), {
            font: "mono",
            size: 18,
            color: "#FF6A1F",
          }),
          text("case-5-f", [11, 25, 32, 26], p("5 steps, 14 fields"), {
            font: "title",
            size: 56,
            color: WHITE,
          }),
          text(
            "case-5-g",
            [11, 54, 30, 30],
            p(
              "Forced sign-up, a postcode lookup that timed out on 4G, and surprise delivery fees on the last screen.",
            ),
            {
              size: 20,
              color: WHITE,
            },
          ),
          text("case-5-h", [58, 18, 30, 5], p("AFTER"), {
            font: "mono",
            size: 18,
            color: "#FF6A1F",
          }),
          text("case-5-i", [58, 25, 32, 26], p("2 steps, 6 fields"), {
            font: "title",
            size: 56,
            color: DARK,
          }),
          text(
            "case-5-j",
            [58, 54, 30, 30],
            p(
              "Guest checkout, instant address search, delivery cost shown in the basket and Apple Pay first.",
            ),
            {
              size: 20,
              color: DARK,
            },
          ),
        ],
      }),
      slide({
        id: "case-6",
        layout: "blank",
        notes:
          "Mobile conversion by week after launch. The step change in week three is when Apple Pay went live for everyone.",
        elements: [
          text("case-6-a", [7.5, 10, 30, 5], p("RESULTS"), {
            font: "mono",
            size: 18,
            color: DARK,
          }),
          text(
            "case-6-b",
            [7.5, 16, 32, 30],
            p("Mobile conversion up from 2.1% to 3.4%"),
            { font: "title", size: 48 },
          ),
          text(
            "case-6-c",
            [7.5, 58, 30, 26],
            p("EUR 1.9M extra revenue in the first quarter after launch."),
            { size: 24 },
          ),
          shape("case-6-d", "rounded", [44, 10, 49, 80], WHITE, { radius: 28 }),
          chart(
            "case-6-e",
            "line",
            [47, 16, 43, 68],
            ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
            [2.1, 2.2, 2.6, 2.9, 3, 3.2, 3.3, 3.4],
            DARK,
          ),
        ],
      }),
      slide({
        id: "case-7",
        layout: "quote",
        background: "grad-sunset",
        notes:
          "Sanne signed off a second engagement on the strength of these results.",
        html: {
          quote: p(
            "They found the problem in week two that we had been guessing about for three years.",
          ),
          attribution: p("Sanne de Wit, Head of E-commerce, Fernway"),
        },
      }),
      slide({
        id: "case-8",
        layout: "title-body",
        background: "grad-peach",
        notes:
          "Three lessons we now apply on every checkout project. Offer to share the research playbook afterwards.",
        html: {
          title: p("What we would tell any retailer"),
          body: `<ol><li><p><strong>Watch sessions before you redesign.</strong> The biggest leak was a bug, not a layout.</p></li><li><p><strong>Show every cost early.</strong> Surprise fees cost more than the fee itself.</p></li><li><p><strong>Ask for an account after payment</strong>, when people are happy to give one.</p></li></ol>`,
        },
      }),
    ],
  },
};
