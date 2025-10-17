import type { IAnalysis } from "@shared-types";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AnalysesHistoryProps {
  analyses: IAnalysis[];
  onDelete?: (analysisId: string) => void;
  onView?: (analysis: IAnalysis) => void;
}

export function AnalysesHistory({
  analyses = [],
  onDelete,
  onView,
}: AnalysesHistoryProps) {
  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return "High Risk";
    if (score >= 40) return "Medium Risk";
    return "Low Risk";
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Analysis History</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Contract Analysis History</SheetTitle>
          <SheetDescription>
            View all past contract analyses for this document
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {analyses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No analyses yet</p>
              <p className="text-sm mt-2">
                Select text and click "Analyze" to get started
              </p>
            </div>
          ) : (
            analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onView?.(analysis)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-lg font-bold ${getRiskColor(analysis.riskScore)}`}
                      >
                        {analysis.riskScore}/100
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getRiskLabel(analysis.riskScore)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(analysis.timestamp.createdAt),
                        { addSuffix: true },
                      )}
                    </p>
                  </div>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(analysis.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {analysis.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {analysis.summary}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    {analysis.redFlags?.length > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{analysis.redFlags.length} red flags</span>
                      </div>
                    )}
                    {analysis.greenFlags?.length > 0 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{analysis.greenFlags.length} green flags</span>
                      </div>
                    )}
                  </div>

                  {analysis.selectedText && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono line-clamp-2">
                      {analysis.selectedText}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
