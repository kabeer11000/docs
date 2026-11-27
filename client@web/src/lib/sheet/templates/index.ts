import { buildWorkbook, type SheetTemplate } from "./build";
import {
  eventBudget,
  expenseTracker,
  invoice,
  loanCalculator,
  monthlyBudget,
  savingsGoal,
} from "./finance";
import { gradeBook, habitTracker, workoutLog } from "./personal";
import {
  contentCalendar,
  inventory,
  okrTracker,
  projectTracker,
  salesPipeline,
  simpleCrm,
  timesheet,
} from "./work";

export {
  buildWorkbook,
  SHEET_TEMPLATE_CATEGORIES,
  type SheetTemplate,
  type SheetTemplateCategory,
} from "./build";

/** Gallery order: most useful first. */
export const SHEET_TEMPLATES: SheetTemplate[] = [
  monthlyBudget,
  expenseTracker,
  invoice,
  projectTracker,
  salesPipeline,
  habitTracker,
  timesheet,
  gradeBook,
  loanCalculator,
  savingsGoal,
  inventory,
  okrTracker,
  workoutLog,
  eventBudget,
  contentCalendar,
  simpleCrm,
];

export const getSheetTemplate = (id: string) =>
  SHEET_TEMPLATES.find((t) => t.id === id);

/** A fresh workbook snapshot for a template (built on demand), or null for an unknown id. */
export function sheetTemplateData(id: string) {
  const template = getSheetTemplate(id);
  return template ? buildWorkbook(template) : null;
}
