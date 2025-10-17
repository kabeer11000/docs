export interface IRedFlag {
  flagged_text: string;
  reason: string;
  severity: "high" | "medium" | "low";
  recommendation?: string;
}

export interface IGreenFlag {
  flagged_text: string;
  reason: string;
  severity: "high" | "medium" | "low";
}

export interface IAnalysis {
  id: string;
  documentId: string;
  userId: string;
  perspective: "client" | "contractor" | "general";
  contractType: string;
  selectedText: string;
  riskScore: number;
  summary: string;
  redFlags: IRedFlag[];
  greenFlags: IGreenFlag[];
  timestamp: {
    createdAt: Date | string;
  };
}

export interface IAnalysisCreateInput {
  documentId: string;
  perspective: "client" | "contractor" | "general";
  contractType: string;
  selectedText: string;
  riskScore: number;
  summary: string;
  redFlags: IRedFlag[];
  greenFlags: IGreenFlag[];
}
