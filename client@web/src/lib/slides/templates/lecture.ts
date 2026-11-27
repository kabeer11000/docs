import { accent, chart, p, shape, slide, text } from "./build";
import type { SlideTemplate } from "./types";

export const lecture: SlideTemplate = {
  id: "lecture",
  name: "University Lecture",
  category: "Education",
  description:
    "Editorial serif lecture with a numbered cover, agenda, classic experiment, class results chart and a seminar question.",
  deck: {
    version: 1,
    aspect: "16:9",
    theme: "editorial",
    transition: "fade",
    slides: [
      slide({
        id: "lec-1",
        layout: "title",
        notes:
          "Welcome back. Last week was heuristics in general; today we zoom in on the one with the most real-world evidence. Remind everyone the problem set is due Friday.",
        html: {
          title: p("Anchoring and adjustment"),
          subtitle: p(
            "PSY 214 Behavioural Economics. Lecture 4 of 12. Dr Ruth Adebayo",
          ),
        },
        elements: [
          text("lec-1-a", [7.5, 8, 40, 5], p("LECTURE 04 / AUTUMN TERM"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          shape("lec-1-b", "rect", [7.5, 14, 85, 0.3], "fg"),
          text("lec-1-c", [62, 12, 32, 40], p("04"), {
            font: "title",
            size: 220,
            align: "right",
            color: "accent",
            opacity: 0.9,
          }),
        ],
      }),
      slide({
        id: "lec-2",
        layout: "agenda",
        notes:
          "Six parts. The warm-up results are from the survey you filled in last week, so stay for slide six.",
        html: {
          title: p("Today"),
          body: p(
            "Warm-up: your guesses from last week",
            "What counts as an anchor?",
            "The wheel of fortune experiment",
            "Two explanations: adjustment and priming",
            "Anchors in the wild",
            "Seminar question for Thursday",
          ),
        },
        elements: [shape("lec-2-a", "rect", [96, 0, 4, 100], "accent")],
      }),
      slide({
        id: "lec-3",
        layout: "quote",
        notes:
          "This is the definition we will test all lecture. Note the word 'adjusted': the claim is that the adjustment is usually too small.",
        html: {
          quote: p(
            "People make estimates by starting from an initial value that is adjusted to yield the final answer.",
          ),
          attribution: p("Amos Tversky and Daniel Kahneman, Science, 1974"),
        },
      }),
      slide({
        id: "lec-4",
        layout: "big-number",
        notes:
          "The rigged wheel stopped at 10 or 65. Participants knew it was random. Still, the median estimate of African countries in the UN was 25 percent after a 10 and 45 percent after a 65.",
        html: {
          stat: p("25 vs 45"),
          caption: p(
            "Median estimates of the share of UN members that are African, after a wheel of fortune landed on 10 or on 65. A number everyone knew was random moved the answer by 20 points.",
          ),
        },
        elements: [
          text("lec-4-a", [7.5, 7, 60, 5], p("THE WHEEL OF FORTUNE, 1974"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
        ],
      }),
      slide({
        id: "lec-5",
        layout: "two-column",
        notes:
          "Both accounts predict anchoring; they differ on what happens when people are warned. Ask the room which they find more convincing before revealing the evidence.",
        html: {
          title: p("Why do anchors stick?"),
          left: p(
            accent("<strong>Insufficient adjustment</strong>"),
            "We start at the anchor and move away until the answer feels plausible, then stop too early. Effortful, and weaker when we are rushed.",
          ),
          right: p(
            accent("<strong>Selective accessibility</strong>"),
            "The anchor primes information consistent with it. We search memory for reasons the answer could be near the anchor, and find them.",
          ),
        },
        elements: [
          shape("lec-5-a", "rect", [48.7, 30, 0.2, 56], "fg", { opacity: 0.3 }),
        ],
      }),
      slide({
        id: "lec-6",
        layout: "blank",
        notes:
          "Your data. Half of you saw 'Is the Danube longer or shorter than 500 km?', half saw 5,000 km. Same class, same lecture, a 1,470 km gap in the mean answer. The true length is 2,850 km.",
        elements: [
          text("lec-6-a", [7.5, 9, 40, 5], p("WARM-UP RESULTS, N = 184"), {
            font: "mono",
            size: 18,
            color: "accent",
          }),
          text("lec-6-b", [7.5, 16, 34, 40], p("How long is the Danube?"), {
            font: "title",
            size: 60,
          }),
          text(
            "lec-6-c",
            [7.5, 58, 32, 32],
            p(
              "Mean estimate in kilometres after a low anchor (500 km) or a high anchor (5,000 km), against the true length.",
            ),
            { size: 22, opacity: 0.75 },
          ),
          shape("lec-6-d", "rect", [45, 12, 0.2, 76], "fg", { opacity: 0.2 }),
          chart(
            "lec-6-e",
            "bar",
            [49, 14, 44, 74],
            ["Low anchor", "High anchor", "True length"],
            [1140, 2610, 2850],
            "accent",
          ),
        ],
      }),
      slide({
        id: "lec-7",
        layout: "three-column",
        notes:
          "One example per column, about two minutes each. The courtroom study always sparks debate; leave time.",
        html: {
          title: p("Anchors in the wild"),
          left: p(
            "<strong>Pricing</strong>",
            "A EUR 1,200 coat on the rack makes the EUR 400 one look reasonable. Menus use decoy dishes the same way.",
          ),
          middle: p(
            "<strong>Negotiation</strong>",
            "The first offer predicts the final price better than almost anything else said at the table.",
          ),
          right: p(
            "<strong>Courtrooms</strong>",
            "Experienced judges gave longer sentences after rolling loaded dice that showed higher numbers.",
          ),
        },
        elements: [shape("lec-7-a", "rect", [7.5, 27.4, 85, 0.3], "accent")],
      }),
      slide({
        id: "lec-8",
        layout: "section",
        background: "pat-grid",
        notes:
          "Write this on the board too. Seminar groups are posted on the course page. Thanks, see you Thursday.",
        html: {
          title: p(
            "Can an expert be anchored? Bring one example from your own field to Thursday's seminar.",
          ),
        },
      }),
    ],
  },
};
