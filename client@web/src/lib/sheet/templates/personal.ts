import { columnName } from "../chart";
import { DATE, date, PCT, type Raw, type SheetTemplate, WHOLE } from "./build";

const DAYS = 31;
const FIRST_DAY_COL = 4; // column E
const LAST_DAY = columnName(FIRST_DAY_COL + DAYS - 1);
const HABITS: Array<[string, number, number[]]> = [
  ["Walk 8,000 steps", 25, [1, 2, 3, 5, 6, 7, 8, 10]],
  ["Read 20 pages", 20, [1, 2, 4, 5, 7, 8, 9]],
  ["No phone after 22:00", 20, [2, 3, 6, 9]],
  ["Drink 2 litres of water", 28, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  ["Stretch for 10 minutes", 15, [1, 4, 8]],
  ["Write in journal", 20, [1, 2, 3, 5, 9, 10]],
];

export const habitTracker: SheetTemplate = {
  id: "habit-tracker",
  name: "Habit tracker",
  description: "Mark each day with an x and watch progress fill",
  category: "Personal",
  tags: ["routine", "monthly", "goals"],
  accent: "#8E4EC6",
  sheets: [
    {
      name: "This month",
      rows: [
        [
          "Habit",
          "Goal (days)",
          "Done",
          "Progress",
          ...Array.from({ length: DAYS }, (_, d) => d + 1),
        ],
        ...HABITS.map(([habit, goal, done], i): Raw[] => {
          const r = i + 2;
          return [
            habit,
            goal,
            `=COUNTIF(${columnName(FIRST_DAY_COL)}${r}:${LAST_DAY}${r},"x")`,
            `=IF(B${r}=0,0,MIN(1,C${r}/B${r}))`,
            ...Array.from(
              { length: DAYS },
              (_, d): Raw => (done.includes(d + 1) ? "x" : null),
            ),
          ];
        }),
        [],
        [
          "Type x in a day's column when you complete the habit. Duplicate this sheet each month.",
        ],
      ],
      widths: [200, 90, 60, 80, ...Array(DAYS).fill(28)],
      formats: [[`D2:D${HABITS.length + 1}`, PCT]],
    },
  ],
};

const SETS: Array<[number, string, number, number, number]> = [
  [date(2026, 3, 2), "Squat", 4, 8, 80],
  [date(2026, 3, 2), "Bench press", 4, 8, 60],
  [date(2026, 3, 2), "Barbell row", 3, 10, 50],
  [date(2026, 3, 4), "Deadlift", 3, 5, 110],
  [date(2026, 3, 4), "Overhead press", 4, 8, 40],
  [date(2026, 3, 4), "Pull-up", 3, 8, 0],
  [date(2026, 3, 6), "Squat", 4, 8, 82.5],
  [date(2026, 3, 6), "Bench press", 4, 8, 62.5],
];
const EXERCISES = [
  "Squat",
  "Bench press",
  "Deadlift",
  "Overhead press",
  "Barbell row",
  "Pull-up",
];
const W_END = 1000;

export const workoutLog: SheetTemplate = {
  id: "workout-log",
  name: "Workout log",
  description: "Sets, reps and weight, with personal bests",
  category: "Personal",
  tags: ["fitness", "gym", "training"],
  accent: "#E5484D",
  sheets: [
    {
      name: "Log",
      rows: [
        [
          "Date",
          "Exercise",
          "Sets",
          "Reps",
          "Weight (kg)",
          "Volume (kg)",
          "Notes",
          null,
          "Exercise",
          "Best weight",
          "Total volume",
        ],
        ...SETS.map(([d, ex, sets, reps, kg], i): Raw[] => {
          const r = i + 2;
          const row: Raw[] = [
            d,
            ex,
            sets,
            reps,
            kg,
            `=C${r}*D${r}*E${r}`,
            null,
          ];
          const name = EXERCISES[i];
          return name
            ? [
                ...row,
                null,
                name,
                `=MAXIFS($E$2:$E$${W_END},$B$2:$B$${W_END},I${r})`,
                `=SUMIF($B$2:$B$${W_END},I${r},$F$2:$F$${W_END})`,
              ]
            : row;
        }),
      ],
      widths: [100, 160, 60, 60, 100, 110, 200, 24, 150, 100, 110],
      formats: [
        [`A2:A${W_END}`, DATE],
        [`F2:F${W_END}`, WHOLE],
        [`K2:K${EXERCISES.length + 1}`, WHOLE],
      ],
    },
  ],
};

const STUDENTS: Array<[string, number[]]> = [
  ["Amara Okafor", [92, 88, 85, 94, 90]],
  ["Ben Thompson", [78, 82, 74, 80, 77]],
  ["Chloe Dubois", [85, 91, 88, 86, 93]],
  ["Daniel Kim", [65, 70, 58, 72, 66]],
  ["Elena Rossi", [88, 79, 90, 84, 87]],
  ["Farhan Ali", [72, 68, 75, 70, 61]],
  ["Grace Lee", [95, 97, 92, 98, 96]],
  ["Hugo Silva", [55, 62, 60, 58, 64]],
];
const FIRST = 3;
const LAST = FIRST + STUDENTS.length - 1;

export const gradeBook: SheetTemplate = {
  id: "grade-book",
  name: "Grade book",
  description: "Weighted averages and letter grades for a class",
  category: "School",
  tags: ["teacher", "class", "marks"],
  accent: "#B45309",
  sheets: [
    {
      name: "Grades",
      rows: [
        [
          "Student",
          "Homework 1",
          "Homework 2",
          "Midterm",
          "Project",
          "Final exam",
          "Average",
          "Grade",
        ],
        ["Weight", 0.1, 0.1, 0.25, 0.2, 0.35],
        ...STUDENTS.map(([name, scores], i): Raw[] => {
          const r = FIRST + i;
          return [
            name,
            ...scores,
            `=SUMPRODUCT(B${r}:F${r},$B$2:$F$2)/SUM($B$2:$F$2)`,
            `=IF(G${r}>=90,"A",IF(G${r}>=80,"B",IF(G${r}>=70,"C",IF(G${r}>=60,"D","F"))))`,
          ];
        }),
        [],
        [
          "Class average",
          ...["B", "C", "D", "E", "F", "G"].map(
            (c) => `=AVERAGE(${c}${FIRST}:${c}${LAST})`,
          ),
        ],
        [
          "Highest",
          ...["B", "C", "D", "E", "F", "G"].map(
            (c) => `=MAX(${c}${FIRST}:${c}${LAST})`,
          ),
        ],
        [
          "Lowest",
          ...["B", "C", "D", "E", "F", "G"].map(
            (c) => `=MIN(${c}${FIRST}:${c}${LAST})`,
          ),
        ],
      ],
      widths: [170, 100, 100, 90, 90, 100, 90, 70],
      freeze: 2,
      formats: [
        ["B2:F2", PCT],
        [`G${FIRST}:G${LAST}`, "0.0"],
        [`B${LAST + 2}:G${LAST + 4}`, "0.0"],
      ],
      bold: ["A2:F2", `A${LAST + 3}:A${LAST + 4}`],
      totals: [`A${LAST + 2}:H${LAST + 2}`],
    },
  ],
};
