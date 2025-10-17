import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import type React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalysisFlag {
  flagged_text: string;
  reason: string;
  severity: string;
  recommendation?: string;
}

interface AnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    risk_score: number;
    summary: string;
    total_clauses_analyzed: number;
    red_flags: AnalysisFlag[];
    green_flags: AnalysisFlag[];
  } | null;
}

export const AnalysisDialog: React.FC<AnalysisDialogProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!data) return null;

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-600";
    if (score < 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return "Low Risk";
    if (score < 70) return "Medium Risk";
    return "High Risk";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            Contract Analysis
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Risk Score */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Risk Score</p>
                <p
                  className={`text-2xl font-bold ${getRiskColor(data.risk_score)}`}
                >
                  {data.risk_score}/100
                </p>
                <p className="text-xs text-muted-foreground">
                  {getRiskLabel(data.risk_score)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Clauses Analyzed
                </p>
                <p className="text-2xl font-bold">
                  {data.total_clauses_analyzed}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Summary</h3>
                  <p className="text-sm text-blue-800">{data.summary}</p>
                </div>
              </div>
            </div>

            {/* Red Flags */}
            {data.red_flags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Red Flags ({data.red_flags.length})
                </h3>
                {data.red_flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <p className="font-medium text-red-900 text-sm mb-1">
                      "{flag.flagged_text}"
                    </p>
                    <p className="text-xs text-red-800 mb-1">{flag.reason}</p>
                    {flag.recommendation && (
                      <p className="text-xs text-red-700 italic">
                        💡 {flag.recommendation}
                      </p>
                    )}
                    <span className="text-xs text-red-600 font-medium">
                      Severity: {flag.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Green Flags */}
            {data.green_flags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Green Flags ({data.green_flags.length})
                </h3>
                {data.green_flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <p className="font-medium text-green-900 text-sm mb-1">
                      "{flag.flagged_text}"
                    </p>
                    <p className="text-xs text-green-800 mb-1">{flag.reason}</p>
                    <span className="text-xs text-green-600 font-medium">
                      Severity: {flag.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
