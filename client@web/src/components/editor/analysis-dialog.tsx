import { AlertTriangle, CheckCircle } from "lucide-react";
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
    if (score < 30) return "text-green-600 dark:text-green-400";
    if (score < 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return "Low risk";
    if (score < 70) return "Medium risk";
    return "High risk";
  };

  const sections = [
    {
      title: "Red flags",
      flags: data.red_flags,
      Icon: AlertTriangle,
      tone: "text-red-600 dark:text-red-400",
      edge: "border-l-red-500",
      showRecommendation: true,
    },
    {
      title: "Green flags",
      flags: data.green_flags,
      Icon: CheckCircle,
      tone: "text-green-600 dark:text-green-400",
      edge: "border-l-green-500",
      showRecommendation: false,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-medium">
            Contract analysis
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-5 pr-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
              <div className="bg-popover p-4">
                <p className="text-xs text-muted-foreground">Risk score</p>
                <p
                  className={`text-2xl font-semibold tabular-nums ${getRiskColor(data.risk_score)}`}
                >
                  {data.risk_score}
                  <span className="text-sm font-normal text-muted-foreground">
                    /100
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {getRiskLabel(data.risk_score)}
                </p>
              </div>
              <div className="bg-popover p-4">
                <p className="text-xs text-muted-foreground">
                  Clauses analyzed
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {data.total_clauses_analyzed}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-1 text-[13px] font-medium">Summary</h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {data.summary}
              </p>
            </div>

            {sections.map(
              ({ title, flags, Icon, tone, edge, showRecommendation }) =>
                flags.length > 0 && (
                  <div key={title} className="space-y-2">
                    <h3
                      className={`flex items-center gap-1.5 text-[13px] font-medium ${tone}`}
                    >
                      <Icon className="size-4" />
                      {title}
                      <span className="tabular-nums text-muted-foreground">
                        {flags.length}
                      </span>
                    </h3>
                    {flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className={`rounded-[2px] border border-l-2 border-border ${edge} bg-paper p-3`}
                      >
                        <p className="mb-1 text-[13px] font-medium text-foreground">
                          {flag.flagged_text}
                        </p>
                        <p className="mb-1 text-xs text-muted-foreground">
                          {flag.reason}
                        </p>
                        {showRecommendation && flag.recommendation && (
                          <p className="mb-1 text-xs text-foreground">
                            Recommendation: {flag.recommendation}
                          </p>
                        )}
                        <span className={`text-xs font-medium capitalize ${tone}`}>
                          {flag.severity} severity
                        </span>
                      </div>
                    ))}
                  </div>
                ),
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
