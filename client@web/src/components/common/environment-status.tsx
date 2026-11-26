import type React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { API_CONFIG } from "@/lib/api-config";

interface EnvironmentStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const EnvironmentStatus: React.FC<EnvironmentStatusProps> = ({
  className = "",
  showDetails = false,
}) => {
  // Only show in development mode
  if (!API_CONFIG.IS_DEVELOPMENT) {
    return null;
  }

  // Quiet by default; only non-development environments get a warning tint.
  const getEnvironmentColor = () => {
    switch (API_CONFIG.ENVIRONMENT) {
      case "production":
        return "border-transparent bg-red-500/10 text-red-600 dark:text-red-400";
      case "staging":
        return "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400";
      default:
        return "border-border bg-background text-muted-foreground";
    }
  };

  const statusDetails = {
    environment: API_CONFIG.ENVIRONMENT,
    backend: API_CONFIG.BACKEND.BASE_URL,
    ai: API_CONFIG.AI.BASE_URL,
    features: {
      aiChat: API_CONFIG.FEATURES.AI_CHAT_ENABLED,
      collaboration: API_CONFIG.FEATURES.COLLABORATION_ENABLED,
      fileUpload: API_CONFIG.FEATURES.FILE_UPLOAD_ENABLED,
      debug: API_CONFIG.FEATURES.DEBUG_MODE,
      reactScan: API_CONFIG.FEATURES.REACT_SCAN_ENABLED,
    },
  };

  if (showDetails) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-xs font-medium text-muted-foreground">
          Environment Status
        </div>
        <div className="space-y-1">
          <Badge variant="outline" className={getEnvironmentColor()}>
            ENV: {API_CONFIG.ENVIRONMENT.toUpperCase()}
          </Badge>
          <div className="text-xs text-muted-foreground">
            Backend: {API_CONFIG.BACKEND.BASE_URL}
          </div>
          <div className="text-xs text-muted-foreground">
            AI: {API_CONFIG.AI.BASE_URL}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {API_CONFIG.FEATURES.AI_CHAT_ENABLED && (
              <Badge variant="secondary" className="text-xs">
                AI Chat
              </Badge>
            )}
            {API_CONFIG.FEATURES.COLLABORATION_ENABLED && (
              <Badge variant="secondary" className="text-xs">
                Collaboration
              </Badge>
            )}
            {API_CONFIG.FEATURES.FILE_UPLOAD_ENABLED && (
              <Badge variant="secondary" className="text-xs">
                File Upload
              </Badge>
            )}
            {API_CONFIG.FEATURES.DEBUG_MODE && (
              <Badge variant="secondary" className="text-xs">
                Debug
              </Badge>
            )}
            {API_CONFIG.FEATURES.REACT_SCAN_ENABLED && (
              <Badge variant="secondary" className="text-xs">
                React Scan
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
            <Badge
              variant="outline"
              className={`h-5 px-1.5 text-[11px] font-medium tracking-wide cursor-help ${getEnvironmentColor()}`}
            >
              {API_CONFIG.ENVIRONMENT.toUpperCase()}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">
              Environment: {API_CONFIG.ENVIRONMENT}
            </div>
            <div className="space-y-1 text-xs">
              <div>Backend: {API_CONFIG.BACKEND.BASE_URL}</div>
              <div>AI: {API_CONFIG.AI.BASE_URL}</div>
              <div className="border-t border-current/20 pt-1 mt-2">
                <div className="font-medium mb-1">Features:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(statusDetails.features).map(
                    ([key, enabled]) =>
                      enabled && (
                        <span
                          key={key}
                          className="rounded-sm bg-green-500/15 px-1 py-0.5 text-xs"
                        >
                          {key}
                        </span>
                      ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const switchButton =
  "h-7 rounded-md border border-border px-2 text-xs text-foreground transition-colors hover:bg-accent";

// Environment switcher for development (localStorage-based)
export const EnvironmentSwitcher: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  if (!API_CONFIG.IS_DEVELOPMENT) {
    return null;
  }

  const switchEnvironment = (env: "development" | "staging" | "production") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lexa-env-override", env);
      window.location.reload();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs font-medium text-muted-foreground">
        Switch Environment (Dev Only)
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => switchEnvironment("development")}
          className={switchButton}
        >
          Development
        </button>
        <button
          type="button"
          onClick={() => switchEnvironment("staging")}
          className={switchButton}
        >
          Staging
        </button>
        <button
          type="button"
          onClick={() => switchEnvironment("production")}
          className={switchButton}
        >
          Production
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        Note: This only affects client-side environment detection in development
      </div>
    </div>
  );
};
