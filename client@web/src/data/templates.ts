// Document templates. Each is designed content in the editor's own HTML: an abstract SVG banner or a
// coloured title, a muted meta line, accent-coloured section headings, tables, callouts and realistic
// sample text. Colours are inline text colours (the editor's Color mark) at mid-tones, so they read on
// light and dark paper. Every template must parse through the editor schema without losing anything
// (see templates.test.ts). The first six are featured in the gallery.

export const TEMPLATE_CATEGORIES = [
  "Work",
  "Writing",
  "School",
  "Personal",
  "Business",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags?: string[];
  content: string;
}

// ---------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------

const MUTED = "#7C838F";
const SERIF = "Georgia";

const span = (style: string, t: string) => `<span style="${style}">${t}</span>`;
const color = (hex: string, t: string) => span(`color: ${hex}`, t);
const muted = (t: string) => color(MUTED, t);

const p = (...lines: string[]) => `<p>${lines.join("<br>")}</p>`;
const center = (...lines: string[]) =>
  `<p style="text-align: center">${lines.join("<br>")}</p>`;
const right = (...lines: string[]) =>
  `<p style="text-align: right">${lines.join("<br>")}</p>`;
const li = (items: string[]) =>
  items.map((t) => `<li><p>${t}</p></li>`).join("");
const ul = (...items: string[]) => `<ul>${li(items)}</ul>`;
const ol = (...items: string[]) => `<ol>${li(items)}</ol>`;
const tasks = (...items: Array<string | [string, boolean]>) =>
  `<ul data-type="taskList">${items
    .map((item) => {
      const [t, done] = typeof item === "string" ? [item, false] : item;
      return `<li data-type="taskItem" data-checked="${done}"><p>${t}</p></li>`;
    })
    .join("")}</ul>`;
const callout = (tone: "note" | "tip" | "warning", ...blocks: string[]) =>
  `<div data-callout="${tone}">${blocks.join("")}</div>`;
const quote = (t: string) => `<blockquote><p>${t}</p></blockquote>`;
const hr = "<hr>";
const doc = (...blocks: string[]) => blocks.join("\n");

type Cell = string | { text: string; width: number };
const cell = (tag: "th" | "td", c: Cell, style?: (t: string) => string) => {
  const text = typeof c === "string" ? c : c.text;
  const width = typeof c === "string" ? "" : ` colwidth="${c.width}"`;
  const body = /^<(p|h\d|ul|ol|div)[\s>]/.test(text)
    ? text
    : `<p>${style && text ? style(text) : text}</p>`;
  return `<${tag}${width}>${body}</${tag}>`;
};
const row = (tag: "th" | "td", cells: Cell[], style?: (t: string) => string) =>
  `<tr>${cells.map((c) => cell(tag, c, style)).join("")}</tr>`;

// Banners: abstract shapes in the template's accent, drawn as small SVGs (no text, so nothing in
// them needs editing). Transparent where unpainted, so tinted styles adapt to light and dark paper.
const W = 672;
type BannerStyle =
  | "bands"
  | "circles"
  | "waves"
  | "blocks"
  | "dots"
  | "arcs"
  | "peaks"
  | "stripes"
  | "rule";

function bannerSvg(style: BannerStyle, a: string, h: number): string {
  const f = (o: number, fill = a) => `fill='${fill}' fill-opacity='${o}'`;
  const bg = `<rect width='${W}' height='${h}' fill='${a}'/>`;
  const soft = `<rect width='${W}' height='${h}' ${f(0.1)}/>`;
  const shapes: Record<BannerStyle, string> = {
    bands: `${bg}<path d='M380 0h120L380 ${h}H260z' ${f(0.14, "#fff")}/><path d='M520 0h44L444 ${h}h-44z' ${f(0.22, "#fff")}/><path d='M600 0h72v${h}H480z' ${f(0.1, "#fff")}/>`,
    circles: `${soft}<circle cx='560' cy='${h * 0.15}' r='${h * 0.95}' ${f(0.9)}/><circle cx='430' cy='${h}' r='${h * 0.62}' ${f(0.45)}/><circle cx='648' cy='${h * 0.95}' r='${h * 0.38}' ${f(0.35, "#fff")}/>`,
    waves: `${bg}<path d='M0 ${h * 0.62}C170 ${h * 0.3} 330 ${h * 0.98} 500 ${h * 0.58}S640 ${h * 0.36} ${W} ${h * 0.46}V${h}H0z' ${f(0.16, "#fff")}/><path d='M0 ${h * 0.82}C190 ${h * 0.6} 360 ${h * 1.05} 520 ${h * 0.78}S650 ${h * 0.64} ${W} ${h * 0.7}V${h}H0z' ${f(0.2, "#fff")}/>`,
    blocks: [
      0.95, 0.55, 0.25, 0.8, 0.4, 0.15, 0.7, 0.3, 0.5, 0.2, 0.9, 0.35, 0.6,
      0.12, 0.75, 0.45,
    ]
      .map(
        (o, i) =>
          `<rect x='${(i % 8) * 84}' y='${Math.floor(i / 8) * (h / 2)}' width='84' height='${h / 2}' ${f(o)}/>`,
      )
      .join(""),
    dots: `<defs><pattern id='d' width='14' height='14' patternUnits='userSpaceOnUse'><circle cx='3' cy='3' r='1.8' ${f(0.4)}/></pattern></defs><rect width='${W}' height='${h}' fill='url(#d)'/><circle cx='580' cy='${h / 2}' r='${h * 0.42}' ${f(1)}/><circle cx='500' cy='${h * 0.7}' r='${h * 0.2}' ${f(0.5)}/>`,
    arcs: `${bg}${[0.3, 0.6, 0.9, 1.2, 1.5]
      .map(
        (k) =>
          `<circle cx='${W}' cy='${h}' r='${h * k}' fill='none' stroke='#fff' stroke-opacity='.22' stroke-width='${h * 0.1}'/>`,
      )
      .join("")}`,
    peaks: `${soft}<circle cx='520' cy='${h * 0.34}' r='${h * 0.16}' ${f(0.55)}/><path d='M0 ${h}L150 ${h * 0.38}L260 ${h * 0.7}L390 ${h * 0.22}L560 ${h}z' ${f(0.55)}/><path d='M300 ${h}L470 ${h * 0.5}L560 ${h * 0.72}L640 ${h * 0.42}L${W} ${h * 0.6}V${h}z' ${f(0.9)}/>`,
    stripes: `${bg}${[0.55, 0.68, 0.78, 0.86, 0.92]
      .map(
        (y, i) =>
          `<rect y='${h * y}' width='${W}' height='${h * (0.05 - i * 0.008)}' ${f(0.3, "#fff")}/>`,
      )
      .join("")}`,
    rule: `<rect width='${W}' height='${h}' ${f(1)}/><rect width='120' height='${h}' ${f(0.45, "#fff")} x='${W - 120}'/>`,
  };
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${h}' width='${W}' height='${h}'>${shapes[style]}</svg>`;
}

const banner = (style: BannerStyle, a: string, h = 112) =>
  `<img src="data:image/svg+xml,${encodeURIComponent(bannerSvg(style, a, Math.round(h)))}" alt="">`;

/** Helpers bound to one template's accent colour. */
function kit(a: string) {
  const ac = (t: string) => color(a, t);
  return {
    ac,
    banner: (style: BannerStyle, h?: number) => banner(style, a, h),
    title: (t: string) => `<h1 class="title">${t}</h1>`,
    accentTitle: (t: string) => `<h1 class="title">${ac(t)}</h1>`,
    subtitle: (t: string) => `<h2 class="subtitle">${t}</h2>`,
    h2: (t: string) => `<h2>${ac(t)}</h2>`,
    h3: (t: string) => `<h3>${ac(t)}</h3>`,
    /** "01  Section" with the number in the accent. */
    num: (n: number, t: string) =>
      `<h2>${ac(String(n).padStart(2, "0"))}&nbsp;&nbsp;${t}</h2>`,
    table: (head: Cell[], ...rows: Cell[][]) =>
      `<table><tbody>${row("th", head, ac)}${rows.map((r) => row("td", r)).join("")}</tbody></table>`,
    /** A strip of labelled facts: labels in a shaded header row, values beneath. */
    facts: (...pairs: Array<[string, string]>) =>
      `<table><tbody>${row(
        "th",
        pairs.map(([k]) => k),
        ac,
      )}${row(
        "td",
        pairs.map(([, v]) => v),
      )}</tbody></table>`,
  };
}

// ---------------------------------------------------------------------------------------------
// Templates. Gallery order: the first six are featured.
// ---------------------------------------------------------------------------------------------

const newsletter = (() => {
  const k = kit("#E5484D");
  return doc(
    k.banner("stripes", 132),
    `<h1 class="title">${span(`font-family: ${SERIF}`, "The Field Notes")}</h1>`,
    k.subtitle(
      "Issue 24, March 2026. Ideas, tools and good reads for small teams.",
    ),
    p(
      "Hi all, spring is here and so is our biggest issue yet. This month: why the best teams write things down, three tools we could not do without, and a reader question about running meetings across time zones.",
    ),
    hr,
    k.h2("The big story: write it down"),
    p(
      "Every team we spoke to this quarter said the same thing: the projects that went well had a written plan. Not a long one, often a single page, but it named the goal, the owner and the date. When people disagreed, they argued with the page, not with each other.",
    ),
    quote(
      "A one-page plan saved us three weeks of meetings. Everyone could see what we had agreed. <br>Priya Shah, Head of Operations at Northwind",
    ),
    p(
      "Try it on your next project: before anyone starts work, write down what done looks like, and share it.",
    ),
    k.h2("Worth your time"),
    k.table(
      ["Read", "Why it matters", "Time"],
      [
        "<strong>The two-pizza rule, revisited</strong>",
        "Smaller teams ship faster, with data from 400 companies",
        "6 min",
      ],
      [
        "<strong>Async by default</strong>",
        "A practical guide to fewer, better meetings",
        "9 min",
      ],
      [
        "<strong>Writing for busy people</strong>",
        "Lead with the ask, cut the rest",
        "4 min",
      ],
    ),
    k.h2("Quick updates"),
    ul(
      "<strong>New:</strong> our templates library now has 30 starting points for plans and reports.",
      "<strong>Event:</strong> the spring meetup is on 18 April in Manchester. Reply to save a seat.",
      "<strong>Hiring:</strong> we are looking for an editor who loves clear sentences.",
    ),
    callout(
      "tip",
      p(
        "<strong>Reader question.</strong> How do you run a weekly meeting across three time zones? Rotate the slot each month so nobody is always up late, and keep a written agenda everyone can add to.",
      ),
    ),
    hr,
    center(
      muted("Thanks for reading. Forward this to someone who would enjoy it."),
    ),
  );
})();

const resume = (() => {
  const k = kit("#0894B3");
  return doc(
    k.banner("rule", 10),
    k.title("Jordan Lee"),
    `<h2 class="subtitle">${k.ac("Senior Product Manager")}</h2>`,
    p(
      muted(
        "London, UK&nbsp;&nbsp;jordan.lee@email.com&nbsp;&nbsp;+44 7700 900123&nbsp;&nbsp;linkedin.com/in/jordanlee",
      ),
    ),
    `<table><tbody><tr>${cell("td", {
      width: 200,
      text: [
        k.h3("Skills"),
        ul(
          "Product discovery",
          "Roadmapping",
          "Pricing and packaging",
          "SQL and analytics",
          "User research",
          "Stakeholder management",
        ),
        k.h3("Education"),
        p(
          "<strong>BSc Computer Science</strong>",
          "University of Leeds",
          muted("2015 to 2019"),
        ),
        k.h3("Languages"),
        p("English, native", "Spanish, fluent"),
        k.h3("Certifications"),
        p("Reforge Product Strategy, 2023"),
      ].join(""),
    })}${cell("td", {
      width: 472,
      text: [
        k.h3("Profile"),
        p(
          "Product manager with seven years in B2B software. I lead teams that grow revenue and cut churn by shipping simpler products, and I measure everything.",
        ),
        k.h3("Experience"),
        p(
          "<strong>Senior Product Manager, Northwind</strong>",
          muted("2022 to present, London"),
        ),
        ul(
          "Led a team of eight to rebuild onboarding, raising 30-day activation from 41% to 63%",
          "Introduced quarterly customer councils, now the main input to the roadmap",
          "Cut time to first value from 9 days to 2 with a guided setup",
        ),
        p(
          "<strong>Product Manager, Contoso</strong>",
          muted("2019 to 2022, Manchester"),
        ),
        ul(
          "Launched usage-based pricing, adding 18% to annual revenue",
          "Cut support tickets by a third by redesigning account settings",
        ),
        p(
          "<strong>Associate Product Manager, Fabrikam</strong>",
          muted("2017 to 2019, Leeds"),
        ),
        ul("Shipped the mobile app used by 120,000 field engineers"),
      ].join(""),
    })}</tr></tbody></table>`,
  );
})();

const invoice = (() => {
  const k = kit("#3B5BFD");
  return doc(
    k.banner("bands", 96),
    k.title("Invoice"),
    k.subtitle("Lumen Studio, design and web development"),
    k.facts(
      ["Invoice number", "INV-2026-031"],
      ["Issue date", "2 March 2026"],
      ["Due date", "1 April 2026"],
      ["Amount due", "<strong>$2,520.00</strong>"],
    ),
    k.table(
      [
        { text: "From", width: 336 },
        { text: "Bill to", width: 336 },
      ],
      [
        p(
          "<strong>Lumen Studio Ltd</strong>",
          "14 Canal Street",
          "Manchester M1 3HE",
          "hello@lumen.studio",
        ),
        p(
          "<strong>Northwind Traders</strong>",
          "Attn: Priya Shah",
          "200 Market Road",
          "Leeds LS1 4AP",
        ),
      ],
    ),
    k.h2("Services"),
    k.table(
      ["Description", "Qty", "Rate", "Amount"],
      ["Website design, 6 pages", "20 h", "$75.00", "$1,500.00"],
      ["Hosting and maintenance, annual", "1", "$240.00", "$240.00"],
      ["Copywriting", "6 h", "$60.00", "$360.00"],
    ),
    k.table(
      [
        { text: "Summary", width: 472 },
        { text: "Amount", width: 200 },
      ],
      ["Subtotal", "$2,100.00"],
      ["VAT at 20%", "$420.00"],
      [
        `<strong>${k.ac("Total due")}</strong>`,
        `<strong>${k.ac("$2,520.00")}</strong>`,
      ],
    ),
    callout(
      "note",
      p("<strong>Payment details</strong>"),
      p(
        "Bank transfer to Lumen Studio Ltd, sort code 20-00-00, account 12345678. Please use the invoice number as the reference.",
      ),
    ),
    center(muted("Thank you for your business.")),
  );
})();

const eventFlyer = (() => {
  const k = kit("#F76B15");
  return doc(
    k.banner("circles", 220),
    `<h1 class="title" style="text-align: center">${span(`color: #F76B15; font-size: 48px`, "Summer Night Market")}</h1>`,
    `<h2 class="subtitle" style="text-align: center">Street food, live music and makers from across the city</h2>`,
    center(
      `<strong>${k.ac("Saturday 20 June 2026")}</strong>`,
      "5 pm until late, Riverside Park, Bristol",
    ),
    hr,
    k.table(
      ["Eat", "Listen", "Shop"],
      [
        "Forty stalls from Lebanese wraps to Korean fried chicken, plus a vegan corner",
        "Three stages: brass bands, local DJs and a late acoustic set by the river",
        "Prints, ceramics, vintage clothes and plants from sixty independent makers",
      ],
    ),
    `<h2 style="text-align: center">${k.ac("Programme")}</h2>`,
    k.table(
      ["Time", "Main stage", "River stage"],
      ["5:00 pm", "Gates open, Bristol Brass Collective", "Open mic"],
      ["7:00 pm", "Neon Harbour", "The Lantern Trio"],
      ["9:00 pm", "DJ Okafor", "Fire dancers"],
      ["10:30 pm", "Fireworks over the water", "Acoustic close"],
    ),
    callout(
      "tip",
      center(
        "<strong>Free entry.</strong> Bring a reusable cup and get your first drink half price.",
      ),
    ),
    center(
      muted(
        "Step-free access, quiet zone and family area. nightmarket.example.com",
      ),
    ),
  );
})();

const travelItinerary = (() => {
  const k = kit("#0E9F6E");
  return doc(
    k.banner("peaks", 150),
    k.title("Five days in Lisbon"),
    k.subtitle("Trams, tiles and pastéis de nata. 12 to 16 May 2026"),
    k.facts(
      ["Travellers", "Sam and Alex"],
      ["Stay", "Casa do Largo, Alfama"],
      ["Budget", "€1,400"],
      ["Weather", "22°C, sunny"],
    ),
    k.h2("Bookings"),
    k.table(
      ["What", "Details", "Reference"],
      ["Flight out", "Tue 12 May, LHR 07:40 to LIS 10:25, TP1351", "QX7R2M"],
      ["Hotel", "Casa do Largo, check-in from 15:00", "88213904"],
      ["Day trip", "Sintra palaces, Thu 14 May, 09:00 pickup", "SNT-4471"],
      ["Flight home", "Sat 16 May, LIS 18:05 to LHR 20:50, TP1366", "QX7R2M"],
    ),
    k.h2("Day by day"),
    k.h3("Tuesday: arrive and wander"),
    ul(
      "Drop bags, coffee at the Miradouro de Santa Luzia",
      "Tram 28 through Alfama and Graça",
      "Dinner at Taberna da Rua das Flores, 20:00",
    ),
    k.h3("Wednesday: Belém"),
    ul(
      "Jerónimos Monastery when it opens at 09:30",
      "Pastéis de Belém for breakfast number two",
      "Sunset at the MAAT riverside",
    ),
    k.h3("Thursday: Sintra"),
    ul(
      "Pena Palace and the Moorish Castle",
      "Lunch in Sintra village",
      "Back for fado in the evening",
    ),
    k.h2("Packing"),
    tasks(
      ["Passports and travel insurance", true],
      ["Adapter and chargers", true],
      "Comfortable walking shoes",
      "Sunscreen and hat",
      "Light jacket for evenings",
    ),
    callout(
      "note",
      p(
        "<strong>Good to know.</strong> Emergency number 112. A Viva Viagem card covers trams, buses and the metro. Many small restaurants are cash only.",
      ),
    ),
  );
})();

const productOnePager = (() => {
  const k = kit("#5B5BD6");
  return doc(
    k.banner("blocks", 120),
    k.title("Relay"),
    `<h2 class="subtitle">${k.ac("Team inbox for customer support that answers itself")}</h2>`,
    p(
      "Relay brings email, chat and social messages into one shared inbox, drafts replies from your help centre, and routes the hard questions to the right person. Teams answer twice as fast without hiring.",
    ),
    k.facts(
      ["Launch", "April 2026"],
      ["Price", "$29 per seat"],
      ["For", "Support teams of 3 to 50"],
      ["Status", "Beta, 40 teams"],
    ),
    k.h2("The problem"),
    p(
      "Support teams juggle four tools and copy the same answers fifty times a day. Customers wait hours for replies that take a minute to write.",
    ),
    k.h2("What Relay does"),
    k.table(
      ["Feature", "What it means for you"],
      [
        "<strong>One inbox</strong>",
        "Email, chat, WhatsApp and Instagram in a single queue",
      ],
      [
        "<strong>Suggested replies</strong>",
        "Drafts from your help centre, ready to edit and send",
      ],
      [
        "<strong>Smart routing</strong>",
        "Billing to finance, bugs to engineering, automatically",
      ],
      [
        "<strong>Live metrics</strong>",
        "First response time and satisfaction, per teammate",
      ],
    ),
    k.h2("Results from the beta"),
    ul(
      "<strong>52% faster</strong> first response across 40 teams",
      "<strong>3 in 10</strong> conversations resolved with a suggested reply",
      "<strong>4.8 out of 5</strong> average customer satisfaction",
    ),
    quote(
      "We cleared a two-week backlog in three days. <br>Marta Silva, Support Lead at Fabrikam",
    ),
    callout(
      "tip",
      p(
        "<strong>Get started:</strong> a 14-day trial with your own inbox takes five minutes. relay.example.com",
      ),
    ),
  );
})();

export const TEMPLATES: Template[] = [
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Masthead, lead story, reading list and updates",
    category: "Writing",
    tags: ["email", "digest", "issue"],
    content: newsletter,
  },
  {
    id: "resume",
    name: "Resume",
    description: "Two columns: skills on the side, experience in focus",
    category: "Personal",
    tags: ["CV", "job", "career"],
    content: resume,
  },
  {
    id: "invoice",
    name: "Invoice",
    description: "Line items, tax and amount due, ready to send",
    category: "Business",
    tags: ["billing", "client", "freelance"],
    content: invoice,
  },
  {
    id: "event-flyer",
    name: "Event flyer",
    description: "A bold poster with programme and practical details",
    category: "Personal",
    tags: ["poster", "party", "festival", "invitation"],
    content: eventFlyer,
  },
  {
    id: "travel-itinerary",
    name: "Travel itinerary",
    description: "Bookings, day-by-day plan and packing list",
    category: "Personal",
    tags: ["trip", "vacation", "packing"],
    content: travelItinerary,
  },
  {
    id: "product-one-pager",
    name: "Product one-pager",
    description: "Problem, features and proof on a single page",
    category: "Business",
    tags: ["launch", "sales", "marketing", "fact sheet"],
    content: productOnePager,
  },

  // Work
  {
    id: "meeting-notes",
    name: "Meeting notes",
    description: "Agenda, decisions and action items",
    category: "Work",
    tags: ["agenda", "minutes"],
    content: (() => {
      const k = kit("#3B5BFD");
      return doc(
        k.banner("dots", 96),
        k.title("Product sync"),
        k.subtitle("Weekly, Tuesdays at 10:00"),
        k.facts(
          ["Date", "10 March 2026"],
          ["Facilitator", "Priya Shah"],
          ["Attendees", "Sam, Alex, Mei, Tom"],
          ["Notes by", "Mei Chen"],
        ),
        callout(
          "note",
          p(
            "<strong>Goal:</strong> agree the scope of the April release and who owns each part.",
          ),
        ),
        k.h2("Agenda"),
        ol(
          "Updates since last week (5 min)",
          "April release scope (20 min)",
          "Owners and next steps (5 min)",
        ),
        k.h2("Notes"),
        ul(
          "Onboarding redesign is on track; usability tests found two confusing steps",
          "Billing export slipped a week while we wait on the finance API",
          "Support asked for a status page before the release",
        ),
        k.h2("Decisions"),
        k.table(
          ["Decision", "Why", "Owner"],
          [
            "Ship onboarding and status page in April",
            "Highest impact, both ready",
            "Priya",
          ],
          ["Move billing export to May", "Blocked on finance API", "Tom"],
        ),
        k.h2("Action items"),
        tasks(
          ["Share usability test clips with the team, Mei, Wed", true],
          "Draft status page copy, Alex, Fri",
          "Confirm finance API date, Tom, Thu",
        ),
      );
    })(),
  },
  {
    id: "one-on-one",
    name: "1:1 meeting",
    description: "A running doc for regular one-on-ones",
    category: "Work",
    tags: ["manager", "check-in"],
    content: (() => {
      const k = kit("#8E4EC6");
      return doc(
        k.accentTitle("Sam and Priya"),
        k.subtitle(
          "Weekly 1:1. Newest meeting at the top; either of us can add topics.",
        ),
        hr,
        k.h2("12 March 2026"),
        k.table(
          [
            { text: "Sam's topics", width: 336 },
            { text: "Priya's topics", width: 336 },
          ],
          [
            ul(
              "Feeling stretched across two projects",
              "Feedback on the roadmap review",
            ),
            ul(
              "Promotion timeline and what is missing",
              "Kudos for the onboarding demo",
            ),
          ],
        ),
        k.h3("Check-in"),
        ul(
          "Energy this week: 3 of 5, mostly from context switching",
          "Going well: the new design review format",
          "In the way: too many status meetings",
        ),
        k.h3("Growth"),
        p(
          "Goal: lead a project end to end. Next step: Sam drafts the brief for the billing export.",
        ),
        k.h3("Follow-ups"),
        tasks(
          "Priya: drop Sam from two status meetings",
          "Sam: share the billing brief by Friday",
        ),
        hr,
        k.h2("5 March 2026"),
        p(muted("Earlier notes stay below for reference.")),
      );
    })(),
  },
  {
    id: "project-brief",
    name: "Project brief",
    description: "Goal, scope, milestones and risks",
    category: "Work",
    tags: ["kickoff", "plan"],
    content: (() => {
      const k = kit("#0E7C86");
      return doc(
        k.banner("arcs", 112),
        k.title("Self-serve onboarding"),
        k.subtitle("Get new teams to their first win without a sales call"),
        k.facts(
          ["Owner", "Priya Shah"],
          ["Status", "Approved"],
          ["Target", "30 June 2026"],
          ["Updated", "3 March 2026"],
        ),
        k.num(1, "Problem"),
        p(
          "New teams wait an average of nine days for a setup call. A third never come back after signing up.",
        ),
        k.num(2, "Goal and measures"),
        ul(
          "<strong>Primary:</strong> 30-day activation from 41% to 60%",
          "<strong>Guardrail:</strong> support tickets per new team do not rise",
        ),
        k.num(3, "Scope"),
        k.table(
          ["In scope", "Out of scope"],
          [
            ul(
              "Guided setup checklist",
              "Sample data on first login",
              "Invite flow",
            ),
            ul("Enterprise SSO setup", "Data migration service"),
          ],
        ),
        k.num(4, "Milestones"),
        k.table(
          ["Milestone", "Owner", "Date"],
          ["Kickoff", "Priya", "10 Mar"],
          ["Prototype tested with 8 teams", "Mei", "4 Apr"],
          ["Beta to 10% of sign-ups", "Tom", "15 May"],
          ["Launch", "Priya", "30 Jun"],
        ),
        k.num(5, "Risks"),
        callout(
          "warning",
          p(
            "<strong>Sample data confuses real data.</strong> Mitigation: label it clearly and offer one-click removal.",
          ),
        ),
      );
    })(),
  },
  {
    id: "prd",
    name: "Product requirements",
    description: "A PRD: problem, users, requirements, release plan",
    category: "Work",
    tags: ["spec", "requirements", "PRD"],
    content: (() => {
      const k = kit("#5B5BD6");
      return doc(
        k.banner("bands", 96),
        k.title("PRD: Shared folders"),
        k.subtitle(
          "Let teams organise files together, with permissions that make sense",
        ),
        k.facts(
          ["Author", "Mei Chen"],
          ["Reviewers", "Priya, Tom"],
          ["Status", "In review"],
          ["Release", "Q2 2026"],
        ),
        k.h2("Summary"),
        p(
          "Today every file belongs to one person. Teams copy links into chat to share work. Shared folders give a team one place for its files, with access granted once.",
        ),
        k.h2("Users and jobs to be done"),
        k.table(
          ["User", "Job to be done", "How they do it today"],
          [
            "Team lead",
            "Give the whole team access to project files",
            "Shares each file one by one",
          ],
          [
            "New hire",
            "Find everything for their project on day one",
            "Asks in chat",
          ],
          [
            "Admin",
            "Remove a leaver's access everywhere",
            "Audits files manually",
          ],
        ),
        k.h2("Requirements"),
        k.table(
          ["Priority", "Requirement"],
          [
            `<strong>${k.ac("Must")}</strong>`,
            "Create a folder, add members, files inherit access",
          ],
          [
            `<strong>${k.ac("Must")}</strong>`,
            "Move existing files in, keeping links working",
          ],
          [
            `<strong>${k.ac("Should")}</strong>`,
            "Per-folder roles: viewer, editor, manager",
          ],
          [`<strong>${k.ac("Could")}</strong>`, "Folder activity feed"],
        ),
        k.h2("Success metrics"),
        ul(
          "40% of active teams create a shared folder within 60 days",
          "Share-link messages in chat drop by a quarter",
        ),
        k.h2("Open questions"),
        callout(
          "warning",
          p(
            "What happens to a shared folder when its creator leaves? Proposal: ownership moves to the workspace.",
          ),
        ),
      );
    })(),
  },
  {
    id: "design-doc",
    name: "Design doc / RFC",
    description: "Technical proposal with alternatives and rollout",
    category: "Work",
    tags: ["engineering", "RFC", "architecture"],
    content: (() => {
      const k = kit("#475569");
      return doc(
        k.banner("blocks", 80),
        k.title("RFC 042: Move search to a dedicated index"),
        k.subtitle(
          "Faster search for large workspaces, without slowing writes",
        ),
        k.facts(
          ["Author", "Tom Okafor"],
          ["Status", "Proposed"],
          ["Reviewers", "Platform team"],
          ["Decide by", "20 March"],
        ),
        k.num(1, "Context"),
        p(
          "Search runs as SQL LIKE queries on the main database. Workspaces over 50,000 files see p95 latency above 4 seconds, and heavy searches slow down saves.",
        ),
        k.num(2, "Goals and non-goals"),
        k.table(
          ["Goals", "Non-goals"],
          [
            ul(
              "p95 search under 300 ms at 1M files",
              "No extra load on the primary database",
            ),
            ul("Semantic search", "Searching inside images"),
          ],
        ),
        k.num(3, "Proposal"),
        p(
          "Stream changes from the database to a search index through a queue. The API queries the index and falls back to SQL if it is unavailable.",
        ),
        callout(
          "note",
          p(
            "<code>save</code> → outbox table → queue → indexer → search index",
            "<code>search</code> → index, falling back to SQL",
          ),
        ),
        k.num(4, "Alternatives considered"),
        k.table(
          ["Option", "Pros", "Cons"],
          ["Postgres full-text", "No new service", "Still loads the primary"],
          ["Dedicated index", "Fast, isolated", "One more system to run"],
        ),
        k.num(5, "Rollout"),
        ol(
          "Dual-write behind a flag for internal workspaces",
          "Backfill and compare results for two weeks",
          "Switch reads, keep SQL fallback for a month",
        ),
      );
    })(),
  },
  {
    id: "okrs",
    name: "OKRs",
    description: "Quarterly objectives and measurable key results",
    category: "Work",
    tags: ["goals", "objectives", "quarter"],
    content: (() => {
      const k = kit("#D6409F");
      return doc(
        k.banner("circles", 112),
        k.title("Growth team OKRs"),
        k.subtitle("Q2 2026, reviewed every two weeks"),
        callout(
          "note",
          p(
            "An objective is a qualitative direction. Each key result is a number with a start and a target. Score 0.7 and above is a good quarter.",
          ),
        ),
        k.h2("Objective 1: Make onboarding effortless"),
        k.table(
          ["Key result", "Start", "Target", "Now", "Score"],
          ["30-day activation", "41%", "60%", "52%", k.ac("0.6")],
          ["Time to first value", "9 days", "2 days", "4 days", k.ac("0.7")],
          ["Setup calls needed", "100%", "20%", "45%", k.ac("0.7")],
        ),
        k.h2("Objective 2: Grow from word of mouth"),
        k.table(
          ["Key result", "Start", "Target", "Now", "Score"],
          ["Invites sent per team", "1.2", "3.0", "2.1", k.ac("0.5")],
          ["Sign-ups from referrals", "8%", "20%", "13%", k.ac("0.4")],
        ),
        k.h2("Not doing this quarter"),
        ul("Paid acquisition experiments", "Enterprise trials"),
      );
    })(),
  },
  {
    id: "weekly-report",
    name: "Weekly report",
    description: "Highlights, numbers, blockers and next week",
    category: "Work",
    tags: ["status", "update", "weekly"],
    content: (() => {
      const k = kit("#0071E3");
      return doc(
        k.banner("waves", 100),
        k.title("Weekly report"),
        k.subtitle("Platform team, week of 9 March 2026"),
        callout(
          "tip",
          p(
            "<strong>In one line:</strong> search index is live for internal workspaces and 12x faster; billing export slips one week.",
          ),
        ),
        k.h2("Numbers"),
        k.table(
          ["Metric", "This week", "Last week", "Change"],
          ["Search p95", "310 ms", "3.8 s", k.ac("-92%")],
          ["Deploys", "23", "19", k.ac("+4")],
          ["Open incidents", "1", "3", k.ac("-2")],
          ["Error rate", "0.08%", "0.11%", k.ac("-27%")],
        ),
        k.h2("Shipped"),
        ul(
          "Search index dual-write behind a flag",
          "New on-call runbook for queue backlogs",
          "Upgraded the database to version 16",
        ),
        k.h2("In progress"),
        ul(
          "Backfill of historical files, 60% done",
          "Billing export, waiting on finance API",
        ),
        k.h2("Blocked"),
        callout(
          "warning",
          p(
            "Finance API credentials still missing. Need: Tom to chase finance by Wednesday.",
          ),
        ),
        k.h2("Next week"),
        tasks(
          "Finish backfill and compare results",
          "Switch reads for 10% of workspaces",
          "Kick off billing export once unblocked",
        ),
      );
    })(),
  },
  {
    id: "retrospective",
    name: "Retrospective",
    description: "What went well, what did not, what to change",
    category: "Work",
    tags: ["retro", "sprint", "agile"],
    content: (() => {
      const k = kit("#C98A00");
      return doc(
        k.accentTitle("Sprint 14 retro"),
        k.subtitle("24 February to 9 March 2026, Onboarding squad"),
        hr,
        callout(
          "note",
          p(
            "The goal is to improve how we work, not to judge anyone. Everyone adds notes before the meeting.",
          ),
        ),
        k.table(
          ["Went well", "Did not go well", "Try next"],
          [
            ul(
              "Usability tests every Friday",
              "Pairing on the checklist",
              "Zero bugs reopened",
            ),
            ul(
              "Two days lost to a flaky test suite",
              "Design changed late in the sprint",
              "Too many meetings on Wednesday",
            ),
            ul(
              "Freeze designs by day 3",
              "Quarantine flaky tests automatically",
              "Meeting-free Wednesday",
            ),
          ],
        ),
        k.h2("Last retro's actions"),
        tasks(
          ["Write the release checklist", true],
          ["Rotate who runs stand-up", true],
          "Book a session on the test suite",
        ),
        k.h2("Actions"),
        k.table(
          ["Action", "Owner", "By"],
          ["Add flaky test quarantine to CI", "Tom", "16 Mar"],
          ["Agree design freeze in planning", "Mei", "Next planning"],
          ["Trial meeting-free Wednesdays", "Priya", "Next sprint"],
        ),
      );
    })(),
  },
  {
    id: "postmortem",
    name: "Incident postmortem",
    description: "Timeline, root cause and follow-ups, blameless",
    category: "Work",
    tags: ["incident", "outage", "SRE"],
    content: (() => {
      const k = kit("#E5484D");
      return doc(
        k.banner("rule", 10),
        k.title("Postmortem: saves failing for EU users"),
        k.subtitle("4 March 2026, 47 minutes, severity 2"),
        k.facts(
          ["Impact", "18% of EU saves failed"],
          ["Detected by", "Alert, 3 min"],
          ["Owner", "Tom Okafor"],
          ["Status", "Actions open"],
        ),
        k.h2("Summary"),
        p(
          "A configuration change lowered the connection limit on the EU database pool. Under the morning peak, saves timed out. Rolling back the change restored service.",
        ),
        k.h2("Timeline"),
        k.table(
          ["Time (UTC)", "Event"],
          [
            "08:02",
            "Config change deployed with a pool size of 20 instead of 200",
          ],
          ["08:41", "Morning peak begins, save errors rise"],
          ["08:44", "Alert fires, on-call acknowledges"],
          ["09:12", "Cause found in deploy log"],
          ["09:29", "Rollback complete, errors back to normal"],
        ),
        k.h2("Root cause"),
        p(
          "The pool size lives in a shared config file with no validation, and the change was reviewed as a typo fix.",
        ),
        k.h2("What went well"),
        ul(
          "Alert fired within three minutes",
          "Rollback took under ten minutes once the cause was found",
        ),
        k.h2("Follow-ups"),
        tasks(
          "Validate pool size range in CI, Tom, 11 Mar",
          "Show config diffs in deploy notifications, Mei, 18 Mar",
          ["Add EU save errors to the status page, Alex", true],
        ),
        callout(
          "note",
          p(
            "Blameless: we look at how the system allowed the mistake, not at who made it.",
          ),
        ),
      );
    })(),
  },
  {
    id: "launch-checklist",
    name: "Launch checklist",
    description: "Everything to tick off before, during and after launch",
    category: "Work",
    tags: ["release", "go-live"],
    content: (() => {
      const k = kit("#0E9F6E");
      return doc(
        k.banner("dots", 96),
        k.title("Launch: Shared folders"),
        k.subtitle("Go live on Tuesday 14 April 2026, 10:00 UK time"),
        k.facts(
          ["Launch lead", "Priya Shah"],
          ["Go / no-go", "13 April, 16:00"],
          ["Rollback owner", "Tom Okafor"],
        ),
        k.h2("Two weeks before"),
        tasks(
          ["Feature complete and behind a flag", true],
          ["Help centre articles drafted", true],
          "Pricing page updated",
          "Sales and support briefed",
        ),
        k.h2("Launch week"),
        tasks(
          "Final QA on staging",
          "Announcement email scheduled",
          "Blog post and social posts ready",
          "Status page and on-call ready",
        ),
        k.h2("Launch day"),
        tasks(
          "Turn on the flag for 10%, then 50%, then everyone",
          "Watch errors and sign-ups for two hours",
          "Post in the community",
        ),
        k.h2("After launch"),
        tasks(
          "Review metrics after one week",
          "Collect feedback from 10 customers",
          "Write the launch retro",
        ),
        callout(
          "warning",
          p(
            "<strong>Rollback plan:</strong> turn off the flag. Files already moved stay put and remain accessible.",
          ),
        ),
      );
    })(),
  },
  {
    id: "onboarding-plan",
    name: "Onboarding plan",
    description: "A new hire's first 30, 60 and 90 days",
    category: "Work",
    tags: ["new hire", "HR", "30-60-90"],
    content: (() => {
      const k = kit("#0894B3");
      return doc(
        k.banner("waves", 100),
        k.title("Welcome, Alex"),
        k.subtitle("Your first 90 days as a Product Designer"),
        k.facts(
          ["Start date", "6 April 2026"],
          ["Manager", "Priya Shah"],
          ["Buddy", "Mei Chen"],
        ),
        k.h2("First week"),
        tasks(
          ["Laptop, accounts and access", true],
          "Coffee with everyone on the team",
          "Read the last two quarters of research",
          "Ship one small fix",
        ),
        k.table(
          [
            "First 30 days: learn",
            "Days 31 to 60: contribute",
            "Days 61 to 90: lead",
          ],
          [
            ul(
              "Shadow five customer calls",
              "Learn the design system",
              "Map the onboarding flow",
            ),
            ul(
              "Own the invite flow redesign",
              "Run a usability test",
              "Present at design review",
            ),
            ul(
              "Lead a project end to end",
              "Propose one process change",
              "Set goals for next quarter",
            ),
          ],
        ),
        k.h2("People to meet"),
        k.table(
          ["Who", "Why"],
          ["Tom, engineering lead", "How we build and ship"],
          ["Marta, support lead", "Top customer pain points"],
          ["Sam, sales", "What prospects ask for"],
        ),
        callout(
          "tip",
          p(
            "Questions are always welcome. There is no such thing as asking too early.",
          ),
        ),
      );
    })(),
  },

  // Writing
  {
    id: "blog-post",
    name: "Blog post",
    description: "Headline, hook, sections and a clear takeaway",
    category: "Writing",
    tags: ["article", "content"],
    content: (() => {
      const k = kit("#F76B15");
      return doc(
        k.banner("waves", 150),
        k.title("Why the best teams write things down"),
        k.subtitle(
          "A one-page plan beats a dozen meetings. Here is how to write one.",
        ),
        p(muted("By Priya Shah, 10 March 2026, 5 minute read")),
        p(
          "Last year we tracked forty projects across six teams. The ones that shipped on time had one thing in common, and it was not talent or budget. It was a page of writing that everyone had read.",
        ),
        k.h2("1. Writing forces decisions"),
        p(
          "You cannot write a vague goal without noticing it is vague. Putting a number and a date on paper turns a wish into a plan.",
        ),
        k.h2("2. Pages scale, meetings do not"),
        p(
          "A meeting reaches the people in the room. A page reaches everyone, including the person who joins next month.",
        ),
        quote("A one-page plan saved us three weeks of meetings."),
        k.h2("3. Keep it to one page"),
        ul(
          "What done looks like, with a number",
          "Who owns it",
          "When it ships",
          "What we are not doing",
        ),
        callout(
          "tip",
          p(
            "<strong>Takeaway:</strong> before your next project starts, write one page and share it. Ask people to argue with the page.",
          ),
        ),
      );
    })(),
  },
  {
    id: "essay",
    name: "Essay",
    description: "Thesis, arguments, counterargument, conclusion",
    category: "Writing",
    tags: ["argument", "opinion"],
    content: (() => {
      const k = kit("#8E4EC6");
      const serif = (t: string) => span(`font-family: ${SERIF}`, t);
      return doc(
        `<h1 class="title" style="text-align: center">${serif("The Case for Slower Cities")}</h1>`,
        `<h2 class="subtitle" style="text-align: center">${serif("Why lower speed limits make streets richer, not poorer")}</h2>`,
        center(muted("Alex Morgan, Urban Studies 201, 14 March 2026")),
        hr,
        p(
          "When Paris lowered its speed limit to 30 km/h in 2021, critics predicted gridlock and empty shops. Three years on, journey times barely changed, accidents fell by a quarter, and footfall on high streets rose. This essay argues that slower streets are not a cost cities pay for safety; they are an investment that pays back in health, commerce and community.",
        ),
        k.h2("Safer streets change who uses them"),
        p(
          "At 30 km/h, a pedestrian hit by a car is five times more likely to survive than at 50 km/h. Parents let children walk to school; older residents cross without fear. A street people feel safe on is a street people use.",
        ),
        k.h2("Slower traffic is good for business"),
        p(
          "Shoppers on foot visit more often and spend more per month than drivers. Lower speeds make stopping easy and lingering pleasant.",
        ),
        k.h2("The best case against"),
        p(
          "Drivers and delivery firms argue that every minute lost adds up. Yet city journeys are limited by junctions, not top speed; average speeds in central London are already below 20 km/h.",
        ),
        k.h2("Conclusion"),
        p(
          "If slower streets are safer, busier and barely slower to cross, the question is not whether cities can afford them, but how long they can afford to wait.",
        ),
      );
    })(),
  },
  {
    id: "press-release",
    name: "Press release",
    description: "Announcement in the standard news format",
    category: "Writing",
    tags: ["PR", "announcement", "media"],
    content: (() => {
      const k = kit("#1E40AF");
      return doc(
        k.banner("rule", 10),
        p(`<strong>${k.ac("FOR IMMEDIATE RELEASE")}</strong>`),
        k.title("Relay launches the support inbox that answers itself"),
        k.subtitle(
          "New tool helps small support teams reply twice as fast without hiring",
        ),
        p(
          `<strong>Manchester, 14 April 2026.</strong> Relay today launched its shared inbox for customer support, which drafts replies from a company's own help centre and routes hard questions to the right person. In a beta with 40 teams, first response times fell by 52%.`,
        ),
        p(
          "Support teams today juggle email, chat and social messages across several tools, copying the same answers dozens of times a day. Relay brings every channel into one queue.",
        ),
        quote(
          "Small teams should not need to hire to keep up. Relay gives every agent a head start on every reply. <br>Dana Reyes, CEO and co-founder of Relay",
        ),
        p(
          "Relay is available today from $29 per seat per month, with a 14-day free trial.",
        ),
        k.h2("About Relay"),
        p(
          "Relay builds tools for customer support teams. Founded in 2024, the company is based in Manchester and backed by Northstar Ventures.",
        ),
        callout(
          "note",
          p(
            "<strong>Media contact</strong>",
            "Jamie Patel, press@relay.example.com, +44 161 496 0000",
          ),
        ),
        center(muted("###")),
      );
    })(),
  },
  {
    id: "book-outline",
    name: "Book outline",
    description: "Premise, characters and chapter-by-chapter plan",
    category: "Writing",
    tags: ["novel", "fiction", "plot"],
    content: (() => {
      const k = kit("#C2255C");
      return doc(
        k.banner("arcs", 130),
        `<h1 class="title">${span(`font-family: ${SERIF}`, "The Lighthouse Keeper's Daughter")}</h1>`,
        k.subtitle("Literary mystery, 85,000 words"),
        callout(
          "note",
          p(
            "<strong>Premise:</strong> when a storm strands a journalist on a remote island, she finds the keeper's logbook stops on the night his daughter vanished, thirty years ago.",
          ),
        ),
        k.h2("Characters"),
        k.table(
          ["Name", "Role", "Wants", "Fears"],
          [
            "Nora Quinn",
            "Journalist",
            "The story that saves her career",
            "Becoming her father",
          ],
          [
            "Elias Ward",
            "Retired keeper",
            "To be left alone",
            "The truth coming out",
          ],
          [
            "Isla Ward",
            "The missing daughter",
            "To leave the island",
            "Never seen",
          ],
        ),
        k.h2("Structure"),
        k.h3("Act one: the storm"),
        ol(
          "Nora arrives on the last ferry before the storm",
          "The keeper refuses to talk; she finds the logbook",
          "The final entry is torn out",
        ),
        k.h3("Act two: the island remembers"),
        ol(
          "Villagers tell three versions of the night",
          "Nora finds Isla's letters hidden in the lamp room",
          "A second storm cuts the island off",
        ),
        k.h3("Act three: the light"),
        ol(
          "Elias confesses what he saw",
          "The truth about Isla, and why she left",
          "Nora chooses what to publish",
        ),
        k.h2("Themes"),
        ul("What we owe the people we leave", "Stories as rescue and as trap"),
      );
    })(),
  },
  {
    id: "short-story",
    name: "Short story",
    description: "A manuscript page with a story to start from",
    category: "Writing",
    tags: ["fiction", "creative writing"],
    content: (() => {
      const k = kit("#0E7C86");
      const serif = (t: string) => span(`font-family: ${SERIF}`, t);
      return doc(
        `<h1 class="title" style="text-align: center">${serif("The Last Tram")}</h1>`,
        center(muted("a story by Mei Chen")),
        center(k.ac("✦")),
        p(
          "The 11:52 was always empty, which is why Ana took it. She liked the way the city slid past the windows like a film nobody else was watching, the shopfronts dark, the river black and glittering under the bridges.",
        ),
        p(
          "Tonight there was a man in the back seat. He wore a coat too heavy for June and held a birdcage on his knees, covered with a cloth.",
        ),
        p("“It's not a bird,” he said, before she could ask."),
        p(
          "She should have moved to the front. Instead she sat across the aisle and watched the cloth rise and fall, very slightly, as if whatever was beneath it was breathing.",
        ),
        center(k.ac("✦")),
        p(
          "At the river stop the tram stopped, and did not start again. The driver's cab was empty. The man stood, tucked the cage under his arm, and held out his other hand.",
        ),
        p("“This is where you get off,” he said. “Same as last time.”"),
        hr,
        p(
          muted(
            "Draft 2. About 1,200 words to go. Notes: who is the man, and what does Ana remember?",
          ),
        ),
      );
    })(),
  },

  // School
  {
    id: "lecture-notes",
    name: "Lecture notes",
    description: "Cornell-style notes with key terms and a summary",
    category: "School",
    tags: ["class", "notes", "Cornell"],
    content: (() => {
      const k = kit("#0071E3");
      return doc(
        k.banner("dots", 90),
        k.title("Photosynthesis"),
        k.subtitle("Biology 101, Lecture 7. Dr Okafor, 12 March 2026"),
        k.table(
          [
            { text: "Cues", width: 190 },
            { text: "Notes", width: 482 },
          ],
          [
            { text: "What goes in and out?", width: 190 },
            {
              text: p(
                "Carbon dioxide + water + light energy → glucose + oxygen. Happens in chloroplasts.",
              ),
              width: 482,
            },
          ],
          [
            { text: "Two stages", width: 190 },
            {
              text: ul(
                "<strong>Light reactions</strong> in the thylakoid membrane make ATP and NADPH and release oxygen",
                "<strong>Calvin cycle</strong> in the stroma uses ATP and NADPH to fix CO₂ into sugar",
              ),
              width: 482,
            },
          ],
          [
            { text: "Why chlorophyll is green", width: 190 },
            {
              text: p("It absorbs red and blue light and reflects green."),
              width: 482,
            },
          ],
        ),
        k.h2("Key terms"),
        k.table(
          ["Term", "Meaning"],
          ["Chloroplast", "Organelle where photosynthesis happens"],
          ["Stroma", "Fluid around the thylakoids; site of the Calvin cycle"],
          ["RuBisCO", "Enzyme that fixes carbon dioxide"],
        ),
        callout(
          "tip",
          p(
            "<strong>Summary:</strong> plants turn light into chemical energy in two linked stages; the light reactions power the Calvin cycle, which builds sugar from CO₂.",
          ),
        ),
        k.h2("Questions for next class"),
        ul("Why do C4 plants do better in hot climates?"),
      );
    })(),
  },
  {
    id: "research-paper",
    name: "Research paper",
    description: "Abstract, methods, results and references",
    category: "School",
    tags: ["academic", "paper", "thesis"],
    content: (() => {
      const k = kit("#1E40AF");
      const serif = (t: string) => span(`font-family: ${SERIF}`, t);
      return doc(
        `<h1 class="title" style="text-align: center">${serif("Sleep and Exam Performance in First-Year Students")}</h1>`,
        center(
          "Alex Morgan, Mei Chen",
          muted("Department of Psychology, University of Leeds"),
        ),
        callout(
          "note",
          p(
            `<strong>Abstract.</strong> We tracked the sleep of 212 first-year students for four weeks before exams. Students averaging seven or more hours scored 8.4 points higher (95% CI 5.1 to 11.7) after controlling for prior grades. Sleep regularity predicted scores more strongly than total sleep.`,
          ),
        ),
        k.num(1, "Introduction"),
        p(
          "Students commonly trade sleep for study time before exams. Prior work links short sleep to weaker memory consolidation, but few studies measure sleep objectively in real exam periods.",
        ),
        k.num(2, "Method"),
        p(
          "Participants wore wrist actigraphs for 28 days. We recorded nightly sleep duration and the variability of sleep onset, and obtained exam scores with consent.",
        ),
        k.num(3, "Results"),
        k.table(
          ["Average sleep", "Students", "Mean exam score"],
          ["Under 6 h", "48", "61.2"],
          ["6 to 7 h", "91", "66.8"],
          ["7 h or more", "73", "71.5"],
        ),
        k.num(4, "Discussion"),
        p(
          "Regular sleep, not only enough sleep, matters. Universities could schedule fewer early exams after late-night deadlines.",
        ),
        k.h2("References"),
        ol(
          "Walker, M. (2017). <em>Why We Sleep</em>. Scribner.",
          "Okano, K. et al. (2019). Sleep quality, duration, and consistency are associated with better academic performance. <em>npj Science of Learning</em>, 4, 16.",
        ),
      );
    })(),
  },
  {
    id: "lab-report",
    name: "Lab report",
    description: "Aim, method, results table and conclusion",
    category: "School",
    tags: ["science", "experiment"],
    content: (() => {
      const k = kit("#0E9F6E");
      return doc(
        k.banner("blocks", 72),
        k.title("Effect of temperature on enzyme activity"),
        k.subtitle("Chemistry practical 4, Group B. 9 March 2026"),
        k.facts(
          ["Students", "Sam, Alex, Mei"],
          ["Enzyme", "Catalase"],
          ["Supervisor", "Dr Silva"],
        ),
        k.h2("Aim"),
        p(
          "To find how temperature affects the rate at which catalase breaks down hydrogen peroxide.",
        ),
        k.h2("Hypothesis"),
        callout(
          "note",
          p(
            "The rate will rise with temperature up to about 37°C, then fall as the enzyme denatures.",
          ),
        ),
        k.h2("Method"),
        ol(
          "Place 5 ml of 3% hydrogen peroxide in a water bath at the test temperature",
          "Add 1 ml of catalase solution and start the timer",
          "Collect oxygen for 60 seconds in an inverted cylinder",
          "Repeat three times at each temperature",
        ),
        k.h2("Results"),
        k.table(
          [
            "Temperature (°C)",
            "Trial 1 (ml)",
            "Trial 2 (ml)",
            "Trial 3 (ml)",
            "Mean (ml)",
          ],
          ["20", "12", "13", "12", "12.3"],
          ["30", "19", "20", "21", "20.0"],
          ["40", "24", "23", "25", "24.0"],
          ["50", "15", "14", "16", "15.0"],
          ["60", "4", "5", "4", "4.3"],
        ),
        k.h2("Conclusion"),
        p(
          "Activity peaked at 40°C and fell sharply above it, supporting the hypothesis. The optimum may lie between 35 and 45°C; testing at 5°C steps would narrow it down.",
        ),
        k.h2("Sources of error"),
        ul(
          "Water bath temperature drifted by up to 2°C",
          "Reading the cylinder by eye",
        ),
      );
    })(),
  },
  {
    id: "study-guide",
    name: "Study guide",
    description: "Topics, key ideas, practice questions and a plan",
    category: "School",
    tags: ["exam", "revision"],
    content: (() => {
      const k = kit("#D6409F");
      return doc(
        k.banner("circles", 112),
        k.title("History final: study guide"),
        k.subtitle("The Cold War, 1945 to 1991. Exam on 2 June 2026"),
        k.h2("Topics and confidence"),
        k.table(
          ["Topic", "Weight", "Confidence"],
          ["Origins and the Iron Curtain", "20%", k.ac("Strong")],
          ["Berlin, Korea and Cuba", "30%", k.ac("Shaky")],
          ["Détente", "20%", k.ac("Not started")],
          ["The end of the Soviet Union", "30%", k.ac("Strong")],
        ),
        k.h2("Key ideas"),
        ul(
          "<strong>Containment:</strong> US policy of stopping the spread of communism",
          "<strong>Brinkmanship:</strong> pushing a crisis to the edge to force the other side back",
          "<strong>Détente:</strong> the 1970s easing of tension, arms control talks",
        ),
        k.h2("Practice questions"),
        ol(
          "How far was the Cuban Missile Crisis a turning point? (20 marks)",
          "Explain two reasons for the building of the Berlin Wall. (8 marks)",
        ),
        k.h2("Plan"),
        tasks(
          ["Week 1: flashcards for key terms", true],
          "Week 2: one timed essay every two days",
          "Week 3: past papers under exam conditions",
        ),
        callout(
          "tip",
          p(
            "Teach a topic out loud to someone else. If you get stuck, that is what to revise.",
          ),
        ),
      );
    })(),
  },
  {
    id: "reading-notes",
    name: "Reading notes",
    description: "Summary, key ideas, quotes and what to do with them",
    category: "School",
    tags: ["book", "summary"],
    content: (() => {
      const k = kit("#C98A00");
      return doc(
        k.accentTitle("Thinking, Fast and Slow"),
        k.subtitle("Daniel Kahneman, 2011. Read in February 2026"),
        k.facts(
          ["Rating", "4 of 5"],
          ["Pages", "499"],
          ["Recommend to", "Anyone who decides things"],
        ),
        k.h2("In one paragraph"),
        p(
          "Our minds run two systems: a fast, intuitive one that is usually right and often overconfident, and a slow, effortful one that is lazy about checking. Most judgement errors come from trusting System 1 when the situation calls for System 2.",
        ),
        k.h2("Key ideas"),
        ol(
          "<strong>Anchoring:</strong> the first number we hear drags our estimates toward it",
          "<strong>Loss aversion:</strong> losses hurt about twice as much as equal gains please",
          "<strong>Planning fallacy:</strong> we underestimate time and cost, so use the outside view",
        ),
        k.h2("Quotes"),
        quote(
          "Nothing in life is as important as you think it is, while you are thinking about it.",
        ),
        k.h2("What I will do differently"),
        tasks(
          "Write my estimate before looking at anyone else's",
          "Check the base rate before planning a project",
        ),
      );
    })(),
  },

  // Personal
  {
    id: "cover-letter",
    name: "Cover letter",
    description: "Short, specific and tailored to the role",
    category: "Personal",
    tags: ["job", "application"],
    content: (() => {
      const k = kit("#0894B3");
      return doc(
        k.banner("rule", 10),
        k.title("Jordan Lee"),
        p(
          muted(
            "jordan.lee@email.com&nbsp;&nbsp;+44 7700 900123&nbsp;&nbsp;London",
          ),
        ),
        hr,
        p("12 March 2026"),
        p("Dana Reyes", "Head of Product, Relay", "Manchester"),
        p("Dear Dana,"),
        p(
          "I am applying for the Senior Product Manager role at Relay. I have spent seven years making B2B software simpler for the people who use it every day, and Relay's focus on small support teams is exactly the problem I want to work on next.",
        ),
        p(
          "At Northwind I led a team of eight to rebuild onboarding. We cut the time to first value from nine days to two and raised 30-day activation from 41% to 63%, by watching fifty customers set up the product and removing every step they stumbled on.",
        ),
        p(
          "I noticed Relay's suggested replies are a big part of your beta results. At Contoso I launched a similar assistive feature and learned how much trust depends on showing where an answer came from. I would love to bring that experience to your team.",
        ),
        p(
          "Thank you for your time. I would welcome a conversation about how I could help Relay grow.",
        ),
        p("Kind regards,"),
        p(`<strong>${k.ac("Jordan Lee")}</strong>`),
      );
    })(),
  },
  {
    id: "recipe-card",
    name: "Recipe card",
    description: "Ingredients, method and notes on one page",
    category: "Personal",
    tags: ["cooking", "food", "recipe"],
    content: (() => {
      const k = kit("#E5484D");
      return doc(
        k.banner("circles", 140),
        `<h1 class="title">${span(`font-family: ${SERIF}`, "Weeknight tomato pasta")}</h1>`,
        k.subtitle(
          "A pantry dinner that tastes like it took longer than it did",
        ),
        k.facts(
          ["Serves", "4"],
          ["Prep", "10 min"],
          ["Cook", "20 min"],
          ["Difficulty", "Easy"],
        ),
        k.table(
          [
            { text: "Ingredients", width: 250 },
            { text: "Method", width: 422 },
          ],
          [
            {
              text: ul(
                "400 g spaghetti",
                "3 tbsp olive oil",
                "4 garlic cloves, sliced",
                "1 tsp chilli flakes",
                "2 tins chopped tomatoes",
                "1 tsp sugar",
                "Handful of basil",
                "50 g parmesan, grated",
              ),
              width: 250,
            },
            {
              text: ol(
                "Boil the pasta in well-salted water until just al dente.",
                "Meanwhile, warm the oil and gently fry the garlic and chilli for 2 minutes.",
                "Add the tomatoes and sugar, then simmer for 15 minutes until thick.",
                "Toss the pasta through the sauce with a splash of pasta water.",
                "Finish with basil and parmesan.",
              ),
              width: 422,
            },
          ],
        ),
        callout(
          "tip",
          p(
            "<strong>Make it yours:</strong> stir in a spoon of mascarpone for a creamy sauce, or add olives and capers for a puttanesca.",
          ),
        ),
        k.h3("Notes"),
        p(
          "Keeps for three days in the fridge. The sauce freezes well for a month.",
        ),
      );
    })(),
  },
  {
    id: "journal",
    name: "Daily journal",
    description: "Gratitude, priorities and a short reflection",
    category: "Personal",
    tags: ["diary", "reflection", "gratitude"],
    content: (() => {
      const k = kit("#8E4EC6");
      return doc(
        k.banner("waves", 90),
        k.title("Thursday, 12 March"),
        k.subtitle("Mood: calm, a little tired. Weather: bright and cold."),
        k.h2("Three things I am grateful for"),
        ol(
          "Coffee with Mei before work",
          "The first warm afternoon of the year",
          "Finishing the hard chapter",
        ),
        k.h2("Today's priorities"),
        tasks(["Send the project brief", true], "30 minute run", "Call Mum"),
        k.h2("Reflection"),
        p(
          "The meeting I was dreading went fine. Next time I will write down what I want to say beforehand; it made me far less nervous.",
        ),
        quote("Small steps every day."),
      );
    })(),
  },
  {
    id: "goal-plan",
    name: "Goal plan",
    description: "One big goal broken into milestones and habits",
    category: "Personal",
    tags: ["goals", "resolution", "habits"],
    content: (() => {
      const k = kit("#0E9F6E");
      return doc(
        k.banner("peaks", 130),
        k.title("Run a half marathon"),
        k.subtitle("Bristol Half, 27 September 2026"),
        callout(
          "tip",
          p(
            "<strong>Why it matters:</strong> I want to prove to myself I can stick with something hard for six months.",
          ),
        ),
        k.h2("Milestones"),
        k.table(
          ["By", "Milestone", "Done"],
          ["30 April", "Run 5 km without stopping", "Yes"],
          ["30 June", "Run 10 km in under 65 min", ""],
          ["31 August", "Long run of 18 km", ""],
          ["27 September", "Finish the half", ""],
        ),
        k.h2("Weekly habits"),
        tasks(
          ["Three runs a week", true],
          ["One strength session", true],
          "Bed by 23:00 before long runs",
        ),
        k.h2("Obstacles and plans"),
        k.table(
          ["If", "Then"],
          ["It is raining", "Run anyway, or do the treadmill session"],
          ["My knee hurts", "Swap to cycling for a week and see the physio"],
        ),
      );
    })(),
  },
  {
    id: "letter",
    name: "Formal letter",
    description: "A formal letter with letterhead, ready to print",
    category: "Personal",
    tags: ["correspondence"],
    content: (() => {
      const k = kit("#475569");
      return doc(
        k.banner("rule", 8),
        right(
          `<strong>${k.ac("Alex Morgan")}</strong>`,
          muted("22 Elm Grove, Bristol BS6 5AB"),
          muted("alex.morgan@email.com"),
        ),
        p("12 March 2026"),
        p(
          "Customer Relations",
          "Northwind Energy",
          "PO Box 4100",
          "Leeds LS1 9XX",
        ),
        p(
          `<strong>Re: Account 4471-2290, incorrect bill for February</strong>`,
        ),
        p("Dear Customer Relations team,"),
        p(
          "I am writing about my February bill, which charges £312.40 for electricity. My usage is normally around £85 a month, and my meter reading on 28 February was 18,442, which does not match the estimated reading of 19,870 on the bill.",
        ),
        p(
          "I have attached a photo of the meter. Please correct the bill using the actual reading and send a revised statement.",
        ),
        p("I would be grateful for a reply within 14 days."),
        p("Yours sincerely,"),
        p("Alex Morgan"),
      );
    })(),
  },

  // Business
  {
    id: "proposal",
    name: "Business proposal",
    description: "Problem, solution, timeline and pricing",
    category: "Business",
    tags: ["pitch", "client", "quote"],
    content: (() => {
      const k = kit("#F76B15");
      return doc(
        k.banner("bands", 130),
        k.title("Website redesign proposal"),
        k.subtitle(
          "Prepared for Northwind Traders by Lumen Studio, 2 March 2026",
        ),
        k.num(1, "The challenge"),
        p(
          "Northwind's website was built in 2018. Two thirds of visitors now arrive on phones, where the checkout takes eleven taps, and online sales have fallen 12% this year.",
        ),
        k.num(2, "Our approach"),
        k.table(
          ["Phase", "What we do", "Weeks"],
          ["Discover", "Interviews, analytics review, competitor scan", "2"],
          ["Design", "Mobile-first designs, tested with 10 customers", "4"],
          ["Build", "New site and three-tap checkout", "6"],
          ["Launch", "Migration, training, 30 days of support", "2"],
        ),
        k.num(3, "Investment"),
        k.table(
          ["Item", "Price"],
          ["Discovery and design", "$12,000"],
          ["Build and launch", "$18,000"],
          [
            `<strong>${k.ac("Total")}</strong>`,
            `<strong>${k.ac("$30,000")}</strong>`,
          ],
        ),
        k.num(4, "Why Lumen"),
        ul(
          "Forty e-commerce sites shipped since 2019",
          "Average 23% lift in mobile conversion after relaunch",
        ),
        callout(
          "tip",
          p(
            "<strong>Next step:</strong> sign and return by 20 March to start on 6 April.",
          ),
        ),
      );
    })(),
  },
  {
    id: "statement-of-work",
    name: "Statement of work",
    description: "Deliverables, timeline, acceptance and fees",
    category: "Business",
    tags: ["SOW", "contract", "agency"],
    content: (() => {
      const k = kit("#3B5BFD");
      return doc(
        k.banner("arcs", 90),
        k.title("Statement of work"),
        k.subtitle("Website redesign for Northwind Traders"),
        k.facts(
          ["Client", "Northwind Traders"],
          ["Supplier", "Lumen Studio Ltd"],
          ["Start", "6 April 2026"],
          ["End", "10 July 2026"],
        ),
        k.num(1, "Deliverables"),
        k.table(
          ["Deliverable", "Description", "Due"],
          [
            "Research report",
            "Findings from interviews and analytics",
            "17 Apr",
          ],
          ["Designs", "Mobile and desktop for 12 templates", "15 May"],
          ["Website", "Built, tested and launched", "26 Jun"],
          ["Handover", "Training and documentation", "10 Jul"],
        ),
        k.num(2, "Acceptance"),
        p(
          "The client has five working days to review each deliverable. Feedback is consolidated by one named person; silence after five days counts as acceptance.",
        ),
        k.num(3, "Fees and payment"),
        k.table(
          ["Milestone", "Amount"],
          ["On signature", "$9,000"],
          ["Designs accepted", "$9,000"],
          ["Launch", "$12,000"],
        ),
        k.num(4, "Assumptions"),
        ul(
          "Client provides content and product data by 1 May",
          "Two rounds of revisions per deliverable",
        ),
        callout(
          "warning",
          p(
            "Changes to scope are agreed in writing and may change fees and dates.",
          ),
        ),
      );
    })(),
  },
  {
    id: "case-study",
    name: "Case study",
    description: "Customer story: challenge, solution, results",
    category: "Business",
    tags: ["customer story", "marketing"],
    content: (() => {
      const k = kit("#0E7C86");
      return doc(
        k.banner("waves", 140),
        k.title("How Fabrikam cleared its support backlog in three days"),
        k.subtitle("A 12-person support team, 4,000 conversations a month"),
        k.facts(
          ["Industry", "Field service software"],
          ["Team", "12 agents"],
          ["Using Relay since", "January 2026"],
        ),
        k.h2("The challenge"),
        p(
          "Fabrikam's support team answered email, chat and phone in three separate tools. A product launch doubled volume and the backlog hit two weeks.",
        ),
        k.h2("The solution"),
        p(
          "Relay moved every channel into one inbox in an afternoon. Suggested replies drew on Fabrikam's 300 help articles, and routing sent billing questions straight to finance.",
        ),
        quote(
          "We cleared a two-week backlog in three days, without overtime. <br>Marta Silva, Support Lead",
        ),
        k.h2("The results"),
        k.table(
          ["Metric", "Before", "After"],
          ["First response time", "19 hours", k.ac("2 hours")],
          ["Backlog", "2 weeks", k.ac("Same day")],
          ["Customer satisfaction", "3.9", k.ac("4.7")],
        ),
        callout(
          "tip",
          p("See what Relay can do for your team: relay.example.com/demo"),
        ),
      );
    })(),
  },
  {
    id: "nda",
    name: "NDA outline",
    description: "Mutual non-disclosure agreement outline",
    category: "Business",
    tags: ["legal", "confidentiality", "agreement"],
    content: (() => {
      const k = kit("#475569");
      return doc(
        k.banner("rule", 8),
        k.title("Mutual non-disclosure agreement"),
        k.subtitle(
          "Outline for discussion. Have a lawyer review before signing.",
        ),
        k.facts(
          ["Party A", "Lumen Studio Ltd"],
          ["Party B", "Northwind Traders"],
          ["Effective date", "1 April 2026"],
          ["Term", "2 years"],
        ),
        k.num(1, "Purpose"),
        p(
          "The parties will share confidential information to evaluate a website redesign partnership (the Purpose).",
        ),
        k.num(2, "Confidential information"),
        p(
          "Any non-public business, technical or financial information disclosed by either party, in any form, that is marked confidential or would reasonably be understood to be.",
        ),
        k.num(3, "Obligations"),
        ul(
          "Use confidential information only for the Purpose",
          "Share it only with staff who need to know and are bound by similar terms",
          "Protect it with at least reasonable care",
        ),
        k.num(4, "Exclusions"),
        ul(
          "Information already public or already known to the recipient",
          "Information independently developed",
          "Disclosure required by law, with prompt notice",
        ),
        k.num(5, "Return and term"),
        p(
          "On request or at the end of the term, each party returns or destroys the other's information. Obligations last two years after the term ends.",
        ),
        k.table(
          ["Signed for Party A", "Signed for Party B"],
          ["Name, title, date", "Name, title, date"],
        ),
      );
    })(),
  },
  {
    id: "job-description",
    name: "Job description",
    description: "Role, responsibilities, requirements and benefits",
    category: "Business",
    tags: ["hiring", "recruiting", "HR"],
    content: (() => {
      const k = kit("#5B5BD6");
      return doc(
        k.banner("dots", 100),
        k.title("Product Designer"),
        k.subtitle("Relay, Manchester or remote in the UK"),
        k.facts(
          ["Team", "Product"],
          ["Type", "Full time"],
          ["Salary", "£55,000 to £68,000"],
          ["Apply by", "30 April 2026"],
        ),
        k.h2("About the role"),
        p(
          "You will design the tools that thousands of support agents use all day. You will work with a product manager and four engineers, from the first sketch to the shipped feature.",
        ),
        k.h2("What you will do"),
        ul(
          "Turn customer research into simple flows and polished interfaces",
          "Prototype and test ideas with real users every week",
          "Help grow our design system",
        ),
        k.h2("What we are looking for"),
        ul(
          "Three or more years designing web products",
          "A portfolio that shows your process, not just final screens",
          "Clear writing and a habit of asking why",
        ),
        k.h2("Benefits"),
        k.table(
          ["Time", "Money and health"],
          ["30 days holiday plus bank holidays", "£1,000 a year for learning"],
          ["Flexible hours and remote work", "Private health cover"],
        ),
        callout(
          "note",
          p(
            "We welcome applicants of every background. Tell us if you need any adjustments during the process.",
          ),
        ),
      );
    })(),
  },
];
