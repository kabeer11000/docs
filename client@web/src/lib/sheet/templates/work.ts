import { columnName } from "../chart";
import {
  DATE,
  date,
  HOURS,
  MONEY,
  PCT,
  type Raw,
  type SheetTemplate,
  TIME,
  WHOLE,
} from "./build";

const STAGES: Array<[string, number]> = [
  ["Lead", 0.1],
  ["Qualified", 0.25],
  ["Proposal", 0.5],
  ["Negotiation", 0.75],
  ["Won", 1],
  ["Lost", 0],
];
const DEALS: Array<[string, string, string, string, number, number, string]> = [
  [
    "Annual plan, 50 seats",
    "Northwind",
    "Sam",
    "Proposal",
    24000,
    date(2026, 4, 15),
    "Send revised quote",
  ],
  [
    "Pilot",
    "Contoso",
    "Priya",
    "Qualified",
    6000,
    date(2026, 4, 30),
    "Demo with IT team",
  ],
  [
    "Expansion",
    "Fabrikam",
    "Sam",
    "Negotiation",
    18000,
    date(2026, 4, 10),
    "Legal review",
  ],
  [
    "New team",
    "Tailspin",
    "Alex",
    "Lead",
    9000,
    date(2026, 5, 20),
    "Discovery call",
  ],
  [
    "Renewal",
    "Adventure Works",
    "Priya",
    "Won",
    12000,
    date(2026, 3, 28),
    "Kickoff",
  ],
];
const P_END = 200;
const STAGE_TABLE = `$L$2:$M$${STAGES.length + 1}`;

export const salesPipeline: SheetTemplate = {
  id: "sales-pipeline",
  name: "Sales pipeline",
  description: "Deals by stage with weighted forecast",
  category: "Work",
  tags: ["CRM", "forecast", "deals"],
  accent: "#0E7C86",
  sheets: [
    {
      name: "Pipeline",
      rows: [
        [
          "Deal",
          "Company",
          "Owner",
          "Stage",
          "Value",
          "Probability",
          "Weighted",
          "Expected close",
          "Next step",
          null,
          null,
          "Stage",
          "Probability",
          "Deals",
          "Value",
        ],
        ...Array.from(
          { length: Math.max(DEALS.length, STAGES.length + 2) },
          (_, i): Raw[] => {
            const r = i + 2;
            const deal = DEALS[i];
            const left: Raw[] = deal
              ? [
                  deal[0],
                  deal[1],
                  deal[2],
                  deal[3],
                  deal[4],
                  `=IFERROR(VLOOKUP(D${r},${STAGE_TABLE},2,FALSE),0)`,
                  `=E${r}*F${r}`,
                  deal[5],
                  deal[6],
                ]
              : Array(9).fill(null);
            const stage = STAGES[i];
            if (stage) {
              return [
                ...left,
                null,
                null,
                stage[0],
                stage[1],
                `=COUNTIF($D$2:$D$${P_END},L${r})`,
                `=SUMIF($D$2:$D$${P_END},L${r},$E$2:$E$${P_END})`,
              ];
            }
            if (i === STAGES.length)
              return [
                ...left,
                null,
                null,
                "Open pipeline",
                null,
                null,
                `=SUM(E2:E${P_END})-O6-O7`,
              ];
            if (i === STAGES.length + 1)
              return [
                ...left,
                null,
                null,
                "Weighted forecast",
                null,
                null,
                `=SUM(G2:G${P_END})-O6`,
              ];
            return left;
          },
        ),
      ],
      widths: [
        190, 140, 90, 110, 100, 90, 100, 120, 180, 24, 24, 150, 90, 70, 110,
      ],
      formats: [
        [`E2:E${P_END}`, MONEY],
        [`F2:F${P_END}`, PCT],
        [`G2:G${P_END}`, MONEY],
        [`H2:H${P_END}`, DATE],
        [`M2:M${STAGES.length + 1}`, PCT],
        [`O2:O${STAGES.length + 3}`, MONEY],
      ],
      totals: [`L${STAGES.length + 2}:O${STAGES.length + 3}`],
    },
  ],
};

const START = date(2026, 1, 5); // a Monday
const WEEKS = 10;
const PROJECT_TASKS: Array<[string, string, number, number, string, number]> = [
  ["Kickoff and goals", "Dana", 0, 2, "Done", 1],
  ["Research and interviews", "Lee", 3, 14, "Done", 1],
  ["Design concepts", "Ana", 10, 24, "In progress", 0.6],
  ["Build first version", "Tom", 21, 45, "In progress", 0.2],
  ["User testing", "Lee", 42, 52, "Not started", 0],
  ["Fixes and polish", "Tom", 49, 59, "Not started", 0],
  ["Launch", "Dana", 63, 63, "Not started", 0],
];
const FIRST_WEEK_COL = 8; // column I

export const projectTracker: SheetTemplate = {
  id: "project-tracker",
  name: "Project tracker",
  description: "Tasks, owners, dates and a week-by-week timeline",
  category: "Work",
  tags: ["gantt", "timeline", "plan"],
  accent: "#5B5BD6",
  sheets: [
    {
      name: "Timeline",
      rows: [
        [
          "Task",
          "Owner",
          "Start",
          "End",
          "Days",
          "Status",
          "Done",
          null,
          ...Array.from(
            { length: WEEKS },
            (_, w): Raw =>
              w === 0 ? START : `=${columnName(FIRST_WEEK_COL + w - 1)}1+7`,
          ),
        ],
        ...PROJECT_TASKS.map(([task, owner, s, e, status, done], i): Raw[] => {
          const r = i + 2;
          return [
            task,
            owner,
            START + s,
            START + e,
            `=D${r}-C${r}+1`,
            status,
            done,
            null,
            ...Array.from({ length: WEEKS }, (_, w): Raw => {
              const col = columnName(FIRST_WEEK_COL + w);
              return `=IF(AND(${col}$1<=$D${r},${col}$1+6>=$C${r}),"■","")`;
            }),
          ];
        }),
      ],
      widths: [200, 90, 100, 100, 60, 110, 70, 16, ...Array(WEEKS).fill(56)],
      formats: [
        ["C2:D200", DATE],
        ["G2:G200", PCT],
        [
          `${columnName(FIRST_WEEK_COL)}1:${columnName(FIRST_WEEK_COL + WEEKS - 1)}1`,
          "mmm d",
        ],
      ],
    },
  ],
};

const KRS: Array<[string | null, string, string, number, number, number]> = [
  [
    "Make onboarding effortless",
    "7-day activation rate",
    "Priya",
    0.38,
    0.55,
    0.47,
  ],
  [null, "Median days to first value", "Sam", 3, 1, 2],
  [null, "Onboarding tickets per week", "Alex", 120, 60, 85],
  [
    "Grow revenue from existing customers",
    "Net revenue retention",
    "Dana",
    1.02,
    1.1,
    1.05,
  ],
  [null, "Accounts on annual plans", "Sam", 140, 220, 168],
  ["Ship faster with fewer incidents", "Deploys per week", "Tom", 4, 12, 9],
  [null, "Incidents per month", "Tom", 6, 2, 3],
];
const K_LAST = KRS.length + 1;

export const okrTracker: SheetTemplate = {
  id: "okr-tracker",
  name: "OKR tracker",
  description: "Key results with progress from start to target",
  category: "Work",
  tags: ["goals", "objectives", "quarter"],
  accent: "#D6409F",
  sheets: [
    {
      name: "OKRs",
      rows: [
        [
          "Objective",
          "Key result",
          "Owner",
          "Start",
          "Target",
          "Current",
          "Progress",
          "Status",
        ],
        ...KRS.map(([obj, kr, owner, start, target, current], i): Raw[] => {
          const r = i + 2;
          return [
            obj,
            kr,
            owner,
            start,
            target,
            current,
            `=IF(E${r}=D${r},0,MAX(0,MIN(1,(F${r}-D${r})/(E${r}-D${r}))))`,
            `=IF(G${r}>=0.7,"On track",IF(G${r}>=0.4,"At risk","Off track"))`,
          ];
        }),
        [],
        [
          "Overall progress",
          null,
          null,
          null,
          null,
          null,
          `=AVERAGE(G2:G${K_LAST})`,
        ],
      ],
      widths: [240, 220, 90, 80, 80, 80, 90, 100],
      formats: [[`G2:G${K_LAST + 2}`, PCT]],
      bold: [`A2:A${K_LAST}`],
      totals: [`A${K_LAST + 2}:H${K_LAST + 2}`],
    },
  ],
};

const T_FIRST = 2;
const T_DAYS = 5;
const T_LAST = T_FIRST + T_DAYS - 1;
const T_TOTAL = T_LAST + 2;

export const timesheet: SheetTemplate = {
  id: "timesheet",
  name: "Timesheet",
  description: "Daily hours, breaks, overtime and pay",
  category: "Work",
  tags: ["hours", "payroll", "overtime"],
  accent: "#0071E3",
  sheets: [
    {
      name: "Timesheet",
      rows: [
        [
          "Date",
          "Day",
          "Start",
          "End",
          "Break (min)",
          "Hours",
          "Overtime",
          "Notes",
        ],
        ...Array.from({ length: T_DAYS }, (_, i): Raw[] => {
          const r = T_FIRST + i;
          const [start, end, brk] = [
            [9, 17.5, 30],
            [8.5, 18, 45],
            [9, 17, 30],
            [9, 19, 30],
            [9, 16, 30],
          ][i];
          return [
            date(2026, 3, 2) + i,
            `=TEXT(A${r},"dddd")`,
            start / 24,
            end / 24,
            brk,
            `=MAX(0,(D${r}-C${r})*24-E${r}/60)`,
            `=MAX(0,F${r}-$B$${T_TOTAL + 4})`,
            null,
          ];
        }),
        [],
        [
          "Total",
          null,
          null,
          null,
          null,
          `=SUM(F${T_FIRST}:F${T_LAST})`,
          `=SUM(G${T_FIRST}:G${T_LAST})`,
        ],
        [],
        ["Hourly rate", 25],
        ["Overtime multiplier", 1.5],
        ["Overtime after (hours per day)", 8],
        [],
        ["Regular pay", `=(F${T_TOTAL}-G${T_TOTAL})*B${T_TOTAL + 2}`],
        ["Overtime pay", `=G${T_TOTAL}*B${T_TOTAL + 2}*B${T_TOTAL + 3}`],
        ["Total pay", `=B${T_TOTAL + 6}+B${T_TOTAL + 7}`],
      ],
      widths: [210, 100, 80, 80, 100, 80, 90, 220],
      formats: [
        [`A${T_FIRST}:A${T_LAST}`, DATE],
        [`C${T_FIRST}:D${T_LAST}`, TIME],
        [`F${T_FIRST}:G${T_TOTAL}`, HOURS],
        [`B${T_TOTAL + 2}`, MONEY],
        [`B${T_TOTAL + 6}:B${T_TOTAL + 8}`, MONEY],
      ],
      totals: [`A${T_TOTAL}:H${T_TOTAL}`, `A${T_TOTAL + 8}:B${T_TOTAL + 8}`],
    },
  ],
};

const STOCK: Array<[string, string, string, number, number, number, string]> = [
  ["SKU-001", "Notebook, A5 lined", "Stationery", 140, 50, 2.4, "Paper Co"],
  ["SKU-002", "Ballpoint pen, black", "Stationery", 35, 100, 0.3, "Paper Co"],
  ["SKU-003", "Desk lamp", "Furniture", 12, 5, 18, "Brightline"],
  ["SKU-004", "USB-C cable, 1 m", "Electronics", 8, 20, 3.5, "Cablehouse"],
  ["SKU-005", "Monitor stand", "Furniture", 22, 10, 24, "Brightline"],
  ["SKU-006", "Sticky notes", "Stationery", 260, 80, 0.9, "Paper Co"],
];
const I_END = 300;

export const inventory: SheetTemplate = {
  id: "inventory",
  name: "Inventory",
  description: "Stock levels, value and what to reorder",
  category: "Work",
  tags: ["stock", "warehouse", "small business"],
  accent: "#475569",
  sheets: [
    {
      name: "Inventory",
      rows: [
        [
          "SKU",
          "Item",
          "Category",
          "In stock",
          "Reorder at",
          "Unit cost",
          "Stock value",
          "Status",
          "Supplier",
          null,
          "Summary",
        ],
        ...STOCK.map(
          ([sku, item, cat, qty, reorder, cost, supplier], i): Raw[] => {
            const r = i + 2;
            const row: Raw[] = [
              sku,
              item,
              cat,
              qty,
              reorder,
              cost,
              `=D${r}*F${r}`,
              `=IF(D${r}<=E${r},"Reorder","OK")`,
              supplier,
            ];
            const summary: Raw[][] = [
              ["Items", `=COUNTA(A2:A${I_END})`],
              ["Units in stock", `=SUM(D2:D${I_END})`],
              ["Stock value", `=SUM(G2:G${I_END})`],
              ["Items to reorder", `=COUNTIF(H2:H${I_END},"Reorder")`],
            ];
            return summary[i] ? [...row, null, ...summary[i]] : row;
          },
        ),
      ],
      widths: [90, 200, 120, 80, 90, 90, 110, 90, 130, 24, 140, 100],
      formats: [
        [`D2:E${I_END}`, WHOLE],
        [`F2:G${I_END}`, MONEY],
        ["L3", WHOLE],
        ["L4", MONEY],
      ],
      totals: ["K5:L5"],
    },
  ],
};

export const contentCalendar: SheetTemplate = {
  id: "content-calendar",
  name: "Content calendar",
  description: "Plan posts by date, channel, owner and status",
  category: "Work",
  tags: ["marketing", "social media", "editorial"],
  accent: "#7C3AED",
  sheets: [
    {
      name: "Calendar",
      rows: [
        [
          "Publish date",
          "Day",
          "Title",
          "Channel",
          "Format",
          "Owner",
          "Status",
          "Link",
          null,
          "Status",
          "Count",
        ],
        ...(
          [
            [
              date(2026, 4, 6),
              "Spring product update",
              "Blog",
              "Article",
              "Maya",
              "Published",
            ],
            [
              date(2026, 4, 7),
              "Product update highlights",
              "LinkedIn",
              "Carousel",
              "Maya",
              "Scheduled",
            ],
            [
              date(2026, 4, 9),
              "Customer story: Northwind",
              "Blog",
              "Case study",
              "Omar",
              "In review",
            ],
            [
              date(2026, 4, 13),
              "How we plan a launch",
              "Newsletter",
              "Email",
              "Omar",
              "Drafting",
            ],
            [
              date(2026, 4, 15),
              "Behind the scenes",
              "Instagram",
              "Short video",
              "Lina",
              "Idea",
            ],
            [
              date(2026, 4, 20),
              "Five tips for faster reports",
              "Blog",
              "Article",
              "Lina",
              "Idea",
            ],
          ] as Array<[number, string, string, string, string, string]>
        ).map(([d, title, channel, format, owner, status], i): Raw[] => {
          const r = i + 2;
          const statuses = [
            "Idea",
            "Drafting",
            "In review",
            "Scheduled",
            "Published",
          ];
          const row: Raw[] = [
            d,
            `=TEXT(A${r},"ddd")`,
            title,
            channel,
            format,
            owner,
            status,
            null,
          ];
          return statuses[i]
            ? [...row, null, statuses[i], `=COUNTIF($G$2:$G$500,J${r})`]
            : row;
        }),
      ],
      widths: [110, 60, 260, 110, 110, 90, 100, 200, 24, 110, 70],
      formats: [["A2:A500", DATE]],
    },
  ],
};

const CONTACTS: Array<
  [string, string, string, string, string, number, string]
> = [
  [
    "Maria Garcia",
    "Northwind",
    "maria@northwind.example",
    "+1 555 0101",
    "Customer",
    date(2026, 3, 2),
    "Renewal due in June",
  ],
  [
    "James Chen",
    "Contoso",
    "james@contoso.example",
    "+1 555 0102",
    "Proposal",
    date(2026, 3, 9),
    "Waiting on budget sign-off",
  ],
  [
    "Aisha Khan",
    "Fabrikam",
    "aisha@fabrikam.example",
    "+44 20 5550 103",
    "Qualified",
    date(2026, 2, 24),
    "Interested in team plan",
  ],
  [
    "Lucas Martin",
    "Tailspin",
    "lucas@tailspin.example",
    "+33 1 5550 104",
    "Lead",
    date(2026, 3, 12),
    "Met at conference",
  ],
];

export const simpleCrm: SheetTemplate = {
  id: "simple-crm",
  name: "Simple CRM",
  description: "Contacts, stages and who to follow up with",
  category: "Work",
  tags: ["contacts", "customers", "sales"],
  accent: "#0894B3",
  sheets: [
    {
      name: "Contacts",
      rows: [
        [
          "Name",
          "Company",
          "Email",
          "Phone",
          "Stage",
          "Last contact",
          "Follow up on",
          "Days since",
          "Notes",
          null,
          "Stage",
          "Contacts",
        ],
        ...CONTACTS.map(
          ([name, company, email, phone, stage, last, notes], i): Raw[] => {
            const r = i + 2;
            const stages = ["Lead", "Qualified", "Proposal", "Customer"];
            return [
              name,
              company,
              email,
              phone,
              stage,
              last,
              `=IF(F${r}="","",F${r}+14)`,
              `=IF(F${r}="","",TODAY()-F${r})`,
              notes,
              null,
              stages[i],
              `=COUNTIF($E$2:$E$500,K${r})`,
            ];
          },
        ),
      ],
      widths: [150, 130, 220, 140, 100, 110, 110, 90, 240, 24, 110, 80],
      formats: [
        ["F2:G500", DATE],
        ["H2:H500", WHOLE],
      ],
    },
  ],
};
