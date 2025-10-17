import Fuse from "fuse.js";
import templatesData from "@/data/templates.json";
import type { SearchableItem } from "@/hooks/use-search-data";
import type { SearchResult, SearchResultType } from "@/state/search";

// Import judgment data
const judgmentsData = [
  {
    id: "1",
    title: "Federation of Pakistan v. Molvi Tamizuddin Khan",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1955 FC 240",
    judge: "Chief Justice Muhammad Munir",
    date: "1955-03-21",
    category: "Constitutional Law",
    summary:
      "Landmark constitutional case regarding dissolution of Constituent Assembly and doctrine of necessity.",
    tags: ["Constitutional", "Dissolution", "Assembly", "Necessity"],
    pageCount: 72,
    fileSize: "3.8 MB",
  },
  {
    id: "2",
    title: "State v. Dosso",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1958 SC 533",
    judge: "Chief Justice Muhammad Munir",
    date: "1958-10-07",
    category: "Constitutional Law",
    summary:
      "Revolutionary legality and validation of martial law through doctrine of necessity.",
    tags: ["Martial Law", "Revolutionary Legality", "Necessity", "Validation"],
    pageCount: 45,
    fileSize: "2.4 MB",
  },
  {
    id: "3",
    title: "Asma Jilani v. Government of Punjab",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1972 SC 139",
    judge: "Justice Hamoodur Rahman",
    date: "1972-04-03",
    category: "Constitutional Law",
    summary:
      "Rejection of doctrine of necessity and restoration of constitutional supremacy.",
    tags: [
      "Constitutional Supremacy",
      "Doctrine of Necessity",
      "Fundamental Rights",
    ],
    pageCount: 68,
    fileSize: "3.2 MB",
  },
  {
    id: "4",
    title: "Zafar Ali Shah v. General Pervez Musharraf",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 2000 SC 869",
    judge: "Chief Justice Saeeduzzaman Siddiqui",
    date: "2000-05-12",
    category: "Constitutional Law",
    summary:
      "Constitutional validation of 1999 military coup and provisional constitutional order.",
    tags: ["Military Coup", "PCO", "Constitutional Validation", "Emergency"],
    pageCount: 89,
    fileSize: "4.1 MB",
  },
  {
    id: "5",
    title: "Muhammad Nawaz Sharif v. President of Pakistan",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1993 SC 473",
    judge: "Chief Justice Nasim Hasan Shah",
    date: "1993-05-26",
    category: "Constitutional Law",
    summary:
      "Prime Minister's dismissal case and powers of President under Article 58(2)(b).",
    tags: ["Presidential Powers", "Dismissal", "Article 58", "Parliamentary"],
    pageCount: 156,
    fileSize: "6.2 MB",
  },
  {
    id: "6",
    title: "Al-Jehad Trust v. Federation of Pakistan",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1996 SC 324",
    judge: "Chief Justice Sajjad Ali Shah",
    date: "1996-11-18",
    category: "Constitutional Law",
    summary:
      "Judicial independence and contempt of court proceedings against government officials.",
    tags: [
      "Judicial Independence",
      "Contempt",
      "Government Officials",
      "Separation",
    ],
    pageCount: 201,
    fileSize: "7.8 MB",
  },
  {
    id: "7",
    title: "Lawyers Movement Case (Iftikhar Muhammad Chaudhry)",
    court: "Supreme Court of Pakistan",
    caseNumber: "Constitution Petition No. 21 of 2007",
    judge: "Justice Iftikhar Muhammad Chaudhry",
    date: "2007-07-20",
    category: "Constitutional Law",
    summary:
      "Chief Justice's reference case and restoration of judiciary movement.",
    tags: [
      "Chief Justice",
      "Reference",
      "Judicial Independence",
      "Lawyers Movement",
    ],
    pageCount: 324,
    fileSize: "12.1 MB",
  },
  {
    id: "8",
    title: "Suo Motu Case No. 1 of 2005 (Missing Persons)",
    court: "Supreme Court of Pakistan",
    caseNumber: "SMC No. 1 of 2005",
    judge: "Chief Justice Iftikhar Muhammad Chaudhry",
    date: "2005-12-14",
    category: "Human Rights",
    summary:
      "Landmark case on enforced disappearances and missing persons in Pakistan.",
    tags: [
      "Missing Persons",
      "Enforced Disappearance",
      "Human Rights",
      "Suo Motu",
    ],
    pageCount: 478,
    fileSize: "18.3 MB",
  },
  {
    id: "9",
    title: "Mehram Ali v. Federation of Pakistan",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1998 SC 1445",
    judge: "Chief Justice Ajmal Mian",
    date: "1998-09-15",
    category: "Criminal Law",
    summary:
      "Death penalty and Islamic provisions in Pakistan Penal Code interpretation.",
    tags: ["Death Penalty", "Islamic Law", "Penal Code", "Qisas"],
    pageCount: 67,
    fileSize: "3.4 MB",
  },
  {
    id: "10",
    title: "Benazir Bhutto v. Federation of Pakistan",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1989 SC 66",
    judge: "Chief Justice Muhammad Haleem",
    date: "1989-02-08",
    category: "Constitutional Law",
    summary:
      "Constitutional interpretation regarding women's eligibility as Prime Minister in Islamic state.",
    tags: ["Women Rights", "Prime Minister", "Islamic State", "Constitutional"],
    pageCount: 89,
    fileSize: "4.2 MB",
  },
  {
    id: "11",
    title: "Hakim Khan v. Government of Pakistan",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1992 SC 595",
    judge: "Justice Shafiur Rahman",
    date: "1992-08-11",
    category: "Administrative Law",
    summary:
      "Service law and government employees' fundamental rights in dismissal proceedings.",
    tags: [
      "Service Law",
      "Government Employees",
      "Dismissal",
      "Fundamental Rights",
    ],
    pageCount: 43,
    fileSize: "2.1 MB",
  },
  {
    id: "12",
    title: "Darshan Masih v. State",
    court: "Supreme Court of Pakistan",
    caseNumber: "PLD 1990 SC 513",
    judge: "Chief Justice Afzal Zullah",
    date: "1990-06-30",
    category: "Criminal Law",
    summary:
      "Blasphemy law application and religious minorities' protection under Pakistani law.",
    tags: ["Blasphemy Law", "Religious Minorities", "Protection", "Criminal"],
    pageCount: 78,
    fileSize: "3.7 MB",
  },
];

// Judgment data for judgments page
const searchableJudgments: SearchableItem[] = judgmentsData.map((judgment) => ({
  id: judgment.id,
  title: judgment.title,
  subtitle: `${judgment.court} • ${judgment.caseNumber}`,
  description: judgment.summary,
  type: "file" as const,
  tags: [
    ...judgment.tags,
    "judgment",
    "legal",
    judgment.category.toLowerCase(),
  ],
  category: judgment.category,
  path: `/judgments#${judgment.id}`,
  meta: {
    ...judgment,
    type: { mime: "application/pdf" },
    isJudgment: true,
  },
}));

// Templates data
const searchableTemplates: SearchableItem[] = templatesData.map(
  (template: any) => ({
    id: template.id,
    title: template.name,
    subtitle: template.group,
    description: template.description,
    type: "template" as any,
    tags: template.tags,
    category: template.group,
    path: `/new?template=${template.id}`,
    meta: template,
  }),
);

/**
 * Get searchable items based on current page and user data
 * User data should be passed in from the hook
 */
const getSearchableItems = (
  currentPage: string,
  userItems: SearchableItem[] = [],
): SearchableItem[] => {
  // Templates page: only show templates
  if (currentPage === "templates") {
    return searchableTemplates;
  }

  // Judgments page: show judgments + user files + user folders (no templates)
  if (currentPage === "judgments" || currentPage.includes("judgment")) {
    return [...searchableJudgments, ...userItems];
  }

  // All other pages: show user files + user folders (no templates)
  return userItems;
};

const fuseOptions = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "description", weight: 0.3 },
    { name: "tags", weight: 0.2 },
    { name: "category", weight: 0.1 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 1,
};

export const getSearchIcon = (type: SearchResultType, meta?: any): string => {
  switch (type) {
    case "file":
      if (meta?.isJudgment) return "file-text";
      if (meta?.type?.mime?.includes("image")) return "image";
      if (meta?.type?.mime?.includes("pdf")) return "file-text";
      if (meta?.type?.mime?.includes("word")) return "file-text";
      return "file";
    case "folder":
      return meta?.icon || "folder";
    case "template":
      return "file-plus";
    case "action":
      return "plus";
    default:
      return "file";
  }
};

/**
 * Perform search with user's real data
 * @param query - Search query
 * @param currentPage - Current page context
 * @param userItems - User's files and folders from hook
 */
export const performSearch = (
  query: string,
  currentPage: string = "home",
  userItems: SearchableItem[] = [],
): SearchResult[] => {
  const searchableItems = getSearchableItems(currentPage, userItems);
  const fuse = new Fuse(searchableItems, fuseOptions);

  if (!query.trim()) {
    return getQuickActions(currentPage);
  }

  const results = fuse.search(query);

  const searchResults: SearchResult[] = results.map((result) => ({
    id: result.item.id,
    title: result.item.title,
    subtitle: result.item.subtitle,
    description: result.item.description,
    type: result.item.type as SearchResultType,
    icon: getSearchIcon(result.item.type as SearchResultType, result.item.meta),
    path: result.item.path,
    tags: result.item.tags,
    category: result.item.category,
    onClick: () => {
      if (result.item.path) {
        window.location.href = result.item.path;
      }
    },
  }));

  return prioritizeResultsByContext(searchResults, currentPage);
};

const getQuickActions = (_currentPage: string): SearchResult[] => {
  // Return empty array for all pages - no quick actions
  return [];
};

const prioritizeResultsByContext = (
  results: SearchResult[],
  currentPage: string,
): SearchResult[] => {
  if (currentPage === "judgments") {
    return results.sort((a, b) => {
      // Prioritize judgments first, then other content
      const aIsJudgment = a.tags?.includes("judgment") || false;
      const bIsJudgment = b.tags?.includes("judgment") || false;

      if (aIsJudgment && !bIsJudgment) return -1;
      if (bIsJudgment && !aIsJudgment) return 1;
      return 0;
    });
  }

  if (currentPage === "home") {
    return results.sort((a, b) => {
      const typeOrder: Record<SearchResultType, number> = {
        action: 0,
        folder: 1,
        file: 2,
        template: 3,
        client: 4,
      };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }

  if (currentPage.startsWith("folder/")) {
    return results.sort((a, b) => {
      if (a.type === "file" && b.type !== "file") return -1;
      if (b.type === "file" && a.type !== "file") return 1;
      return 0;
    });
  }

  return results;
};
