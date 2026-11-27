import {
  DATE,
  date,
  MONEY,
  PCT,
  PCT2,
  type Raw,
  type SheetTemplate,
  WHOLE,
} from "./build";

const BUDGET_ITEMS: Array<[string, "Income" | "Expense", number, number]> = [
  ["Salary", "Income", 4200, 4200],
  ["Side projects", "Income", 600, 450],
  ["Rent", "Expense", 1500, 1500],
  ["Utilities", "Expense", 180, 164],
  ["Groceries", "Expense", 450, 512],
  ["Transport", "Expense", 160, 140],
  ["Phone and internet", "Expense", 70, 70],
  ["Insurance", "Expense", 120, 120],
  ["Eating out", "Expense", 200, 265],
  ["Health and fitness", "Expense", 60, 60],
  ["Subscriptions", "Expense", 45, 52],
  ["Savings", "Expense", 800, 800],
  ["Other", "Expense", 100, 74],
];
const B_LAST = BUDGET_ITEMS.length + 1;

export const monthlyBudget: SheetTemplate = {
  id: "monthly-budget",
  name: "Monthly budget",
  description: "Planned against actual, with what is left over",
  category: "Finance",
  tags: ["money", "household", "personal finance"],
  accent: "#1F8A4C",
  sheets: [
    {
      name: "Budget",
      rows: [
        [
          "Category",
          "Type",
          "Planned",
          "Actual",
          "Difference",
          null,
          "Summary",
          "Planned",
          "Actual",
        ],
        ...BUDGET_ITEMS.map(([name, type, planned, actual], i): Raw[] => {
          const r = i + 2;
          const row: Raw[] = [
            name,
            type,
            planned,
            actual,
            `=IF(B${r}="Income",D${r}-C${r},C${r}-D${r})`,
          ];
          const summary: Raw[][] = [
            [
              "Income",
              `=SUMIF($B$2:$B$${B_LAST},"Income",C$2:C$${B_LAST})`,
              `=SUMIF($B$2:$B$${B_LAST},"Income",D$2:D$${B_LAST})`,
            ],
            [
              "Expenses",
              `=SUMIF($B$2:$B$${B_LAST},"Expense",C$2:C$${B_LAST})`,
              `=SUMIF($B$2:$B$${B_LAST},"Expense",D$2:D$${B_LAST})`,
            ],
            ["Left over", "=H2-H3", "=I2-I3"],
            ["Share of income spent", "=IF(H2=0,0,H3/H2)", "=IF(I2=0,0,I3/I2)"],
          ];
          return summary[i] ? [...row, null, ...summary[i]] : row;
        }),
        [],
        [
          "A positive difference is good: income above plan, or spending below it.",
        ],
      ],
      widths: [170, 90, 100, 100, 100, 32, 170, 100, 100],
      formats: [
        [`C2:E${B_LAST}`, MONEY],
        ["H2:I4", MONEY],
        ["H5:I5", PCT],
      ],
      totals: ["G4:I4"],
    },
  ],
};

const EXPENSES: Array<[number, string, string, string, number]> = [
  [date(2026, 3, 1), "Weekly shop", "Groceries", "Card", 86.4],
  [date(2026, 3, 2), "Train pass", "Transport", "Card", 54],
  [date(2026, 3, 4), "Dinner with friends", "Eating out", "Cash", 38.5],
  [date(2026, 3, 5), "Electricity", "Bills", "Direct debit", 72.1],
  [date(2026, 3, 8), "Weekly shop", "Groceries", "Card", 91.2],
  [date(2026, 3, 10), "Gym membership", "Health", "Direct debit", 35],
  [date(2026, 3, 12), "Birthday present", "Gifts", "Card", 45],
  [date(2026, 3, 15), "Weekly shop", "Groceries", "Card", 78.9],
];
const EXPENSE_CATEGORIES = [
  "Groceries",
  "Transport",
  "Eating out",
  "Bills",
  "Health",
  "Gifts",
  "Other",
];
const E_END = 500;

export const expenseTracker: SheetTemplate = {
  id: "expense-tracker",
  name: "Expense tracker",
  description: "Log spending and see totals by category",
  category: "Finance",
  tags: ["spending", "receipts"],
  accent: "#D9480F",
  sheets: [
    {
      name: "Expenses",
      rows: [
        [
          "Date",
          "Description",
          "Category",
          "Paid with",
          "Amount",
          null,
          "Category",
          "Total",
          "Share",
        ],
        ...Array.from(
          { length: Math.max(EXPENSES.length, EXPENSE_CATEGORIES.length + 1) },
          (_, i): Raw[] => {
            const r = i + 2;
            const entry: Raw[] = EXPENSES[i] ?? [null, null, null, null, null];
            const cat = EXPENSE_CATEGORIES[i];
            if (cat) {
              return [
                ...entry,
                null,
                cat,
                `=SUMIF($C$2:$C$${E_END},G${r},$E$2:$E$${E_END})`,
                `=IF($H$${EXPENSE_CATEGORIES.length + 2}=0,0,H${r}/$H$${EXPENSE_CATEGORIES.length + 2})`,
              ];
            }
            if (i === EXPENSE_CATEGORIES.length)
              return [...entry, null, "Total", `=SUM(E2:E${E_END})`];
            return entry;
          },
        ),
      ],
      widths: [100, 200, 120, 120, 100, 32, 120, 100, 80],
      formats: [
        [`A2:A${E_END}`, DATE],
        [`E2:E${E_END}`, MONEY],
        [`H2:H${EXPENSE_CATEGORIES.length + 2}`, MONEY],
        [`I2:I${EXPENSE_CATEGORIES.length + 1}`, PCT],
      ],
      totals: [
        `G${EXPENSE_CATEGORIES.length + 2}:I${EXPENSE_CATEGORIES.length + 2}`,
      ],
    },
  ],
};

export const invoice: SheetTemplate = {
  id: "invoice",
  name: "Invoice",
  description: "Line totals, tax and amount due calculated for you",
  category: "Finance",
  tags: ["billing", "client", "freelance"],
  accent: "#3B5BFD",
  sheets: [
    {
      name: "Invoice",
      rows: [
        ["Invoice"],
        [],
        ["Invoice number", "INV-0001", null, "Bill to"],
        ["Issue date", date(2026, 3, 1), null, "Client name"],
        ["Due date", "=B4+30", null, "Street address"],
        ["From", "Your business name", null, "City, postcode"],
        [],
        ["Description", "Quantity", "Unit price", "Amount"],
        ["Design work", 20, 75, '=IF(B9="","",B9*C9)'],
        ["Website hosting, annual", 1, 240, '=IF(B10="","",B10*C10)'],
        ["Copywriting", 6, 60, '=IF(B11="","",B11*C11)'],
        [null, null, null, '=IF(B12="","",B12*C12)'],
        [null, null, null, '=IF(B13="","",B13*C13)'],
        [null, null, null, '=IF(B14="","",B14*C14)'],
        [],
        [null, null, "Subtotal", "=SUM(D9:D14)"],
        [null, null, "Tax rate", 0.2],
        [null, null, "Tax", "=D16*D17"],
        [null, null, "Total due", "=D16+D18"],
        [],
        ["Payment details"],
        ["Bank and account number"],
        ["Please use the invoice number as the payment reference."],
      ],
      widths: [240, 140, 110, 160],
      header: [7],
      freeze: 0,
      formats: [
        ["B4:B5", DATE],
        ["C9:D14", MONEY],
        ["D16", MONEY],
        ["D17", PCT],
        ["D18:D19", MONEY],
      ],
      bold: ["A3:A6", "D3", "C16:C18", "A21"],
      totals: ["C19:D19"],
      title: ["A1"],
    },
  ],
};

/** Amortisation rows for up to 30 years of monthly payments; rows past the term stay blank. */
const SCHEDULE_START = 14;
const SCHEDULE_ROWS = 360;
const schedule: Raw[][] = Array.from({ length: SCHEDULE_ROWS }, (_, i) => {
  const r = SCHEDULE_START + i;
  if (i === 0)
    return [1, "=$B$8", "=$B$3*$B$4/$B$6", `=B${r}-C${r}`, `=$B$3-D${r}`];
  const p = r - 1;
  return [
    `=IF(A${p}="","",IF(A${p}+1>$B$9,"",A${p}+1))`,
    `=IF(A${r}="","",$B$8)`,
    `=IF(A${r}="","",E${p}*$B$4/$B$6)`,
    `=IF(A${r}="","",B${r}-C${r})`,
    `=IF(A${r}="","",E${p}-D${r})`,
  ];
});

export const loanCalculator: SheetTemplate = {
  id: "loan-calculator",
  name: "Loan and mortgage calculator",
  description: "Payment, total interest and a full amortisation schedule",
  category: "Finance",
  tags: ["mortgage", "PMT", "amortization", "interest"],
  accent: "#1E40AF",
  sheets: [
    {
      name: "Loan",
      rows: [
        ["Loan calculator"],
        ["Change the inputs in B3:B6 and everything else updates."],
        ["Loan amount", 250000],
        ["Annual interest rate", 0.065],
        ["Term (years)", 30],
        ["Payments per year", 12],
        [],
        ["Payment per period", "=PMT(B4/B6,B5*B6,-B3)"],
        ["Number of payments", "=B5*B6"],
        ["Total paid", "=B8*B9"],
        ["Total interest", "=B10-B3"],
        [],
        ["Period", "Payment", "Interest", "Principal", "Balance"],
        ...schedule,
      ],
      widths: [180, 130, 120, 120, 140],
      header: [12],
      freeze: 0,
      formats: [
        ["B3", MONEY],
        ["B4", PCT2],
        ["B8", MONEY],
        ["B10:B11", MONEY],
        [`B${SCHEDULE_START}:E${SCHEDULE_START + SCHEDULE_ROWS - 1}`, MONEY],
      ],
      totals: ["A8:B8"],
      title: ["A1"],
    },
  ],
};

const GOALS: Array<[string, number, number]> = [
  ["Emergency fund", 6000, 400],
  ["Summer holiday", 1800, 250],
  ["New laptop", 1400, 150],
  ["House deposit", 25000, 600],
];
const G_LAST = GOALS.length + 1;
const D_END = 500;

export const savingsGoal: SheetTemplate = {
  id: "savings-goal",
  name: "Savings goals",
  description: "Track deposits and see when you will reach each goal",
  category: "Finance",
  tags: ["saving", "money"],
  accent: "#0E9F6E",
  sheets: [
    {
      name: "Goals",
      rows: [
        [
          "Goal",
          "Target",
          "Saved",
          "Remaining",
          "Progress",
          "Monthly saving",
          "Months to go",
          "Reached by",
        ],
        ...GOALS.map(([name, target, monthly], i): Raw[] => {
          const r = i + 2;
          return [
            name,
            target,
            `=SUMIF(Deposits!$B$2:$B$${D_END},A${r},Deposits!$C$2:$C$${D_END})`,
            `=MAX(0,B${r}-C${r})`,
            `=IF(B${r}=0,0,MIN(1,C${r}/B${r}))`,
            monthly,
            `=IF(D${r}=0,0,IF(F${r}<=0,"",ROUNDUP(D${r}/F${r},0)))`,
            `=IF(G${r}="","",EDATE(TODAY(),G${r}))`,
          ];
        }),
        [
          "Total",
          `=SUM(B2:B${G_LAST})`,
          `=SUM(C2:C${G_LAST})`,
          `=SUM(D2:D${G_LAST})`,
          `=IF(B${G_LAST + 1}=0,0,C${G_LAST + 1}/B${G_LAST + 1})`,
          `=SUM(F2:F${G_LAST})`,
        ],
      ],
      widths: [170, 110, 110, 110, 90, 120, 110, 110],
      formats: [
        [`B2:D${G_LAST + 1}`, MONEY],
        [`E2:E${G_LAST + 1}`, PCT],
        [`F2:F${G_LAST + 1}`, MONEY],
        [`H2:H${G_LAST}`, DATE],
      ],
      totals: [`A${G_LAST + 1}:H${G_LAST + 1}`],
    },
    {
      name: "Deposits",
      rows: [
        ["Date", "Goal", "Amount", "Note"],
        [date(2026, 1, 31), "Emergency fund", 1500, "Starting balance"],
        [date(2026, 1, 31), "Summer holiday", 300, null],
        [date(2026, 2, 28), "Emergency fund", 400, null],
        [date(2026, 2, 28), "Summer holiday", 250, null],
        [date(2026, 2, 28), "New laptop", 150, null],
        [date(2026, 2, 28), "House deposit", 2000, "Bonus"],
      ],
      widths: [110, 170, 110, 220],
      formats: [
        [`A2:A${D_END}`, DATE],
        [`C2:C${D_END}`, MONEY],
      ],
    },
  ],
};

const EVENT_ITEMS: Array<[string, string, number, number | null, string]> = [
  ["Venue hire", "Venue", 4500, 4500, "Yes"],
  ["Catering, per head", "Food and drink", 3600, 3720, "Deposit"],
  ["Drinks package", "Food and drink", 1200, null, "No"],
  ["Photographer", "Services", 1100, 1100, "Yes"],
  ["Music", "Services", 800, null, "No"],
  ["Flowers and decoration", "Decoration", 650, 590, "Yes"],
  ["Invitations and printing", "Stationery", 180, 165, "Yes"],
  ["Transport", "Logistics", 400, null, "No"],
  ["Contingency", "Other", 750, null, "No"],
];
const EV_LAST = EVENT_ITEMS.length + 1;

export const eventBudget: SheetTemplate = {
  id: "event-budget",
  name: "Event budget",
  description: "Estimated against actual, with cost per guest",
  category: "Finance",
  tags: ["wedding", "party", "conference"],
  accent: "#C2255C",
  sheets: [
    {
      name: "Event budget",
      rows: [
        [
          "Item",
          "Category",
          "Estimated",
          "Actual",
          "Difference",
          "Paid",
          null,
          "Summary",
        ],
        ...EVENT_ITEMS.map(([item, cat, est, act, paid], i): Raw[] => {
          const r = i + 2;
          const row: Raw[] = [
            item,
            cat,
            est,
            act,
            `=IF(D${r}="","",C${r}-D${r})`,
            paid,
          ];
          const summary: Raw[][] = [
            ["Budget", 15000],
            ["Estimated total", `=SUM(C2:C${EV_LAST})`],
            ["Spent so far", `=SUM(D2:D${EV_LAST})`],
            ["Left to allocate", "=I2-I3"],
            ["Guests", 80],
            ["Estimated cost per guest", "=IF(I6=0,0,I3/I6)"],
          ];
          return summary[i] ? [...row, null, ...summary[i]] : row;
        }),
        ["Total", null, `=SUM(C2:C${EV_LAST})`, `=SUM(D2:D${EV_LAST})`],
      ],
      widths: [200, 140, 100, 100, 100, 80, 32, 180, 100],
      formats: [
        [`C2:E${EV_LAST + 1}`, MONEY],
        ["I2:I5", MONEY],
        ["I6", WHOLE],
        ["I7", MONEY],
      ],
      totals: [`A${EV_LAST + 1}:F${EV_LAST + 1}`, "H5:I5"],
    },
  ],
};
