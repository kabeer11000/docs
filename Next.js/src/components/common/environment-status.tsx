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

  const getEnvironmentColor = () => {
    switch (API_CONFIG.ENVIRONMENT) {
      case "production":
        return "bg-red-600 text-white";
      case "staging":
        return "bg-yellow-600 text-white";
      case "development":
        return "bg-blue-600 text-white";
      default:
        return "bg-neutral-600 text-white";
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
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Environment Status
        </div>
        <div className="space-y-1">
          <Badge variant="outline" className={getEnvironmentColor()}>
            ENV: {API_CONFIG.ENVIRONMENT.toUpperCase()}
          </Badge>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            Backend: {API_CONFIG.BACKEND.BASE_URL}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
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
            <Badge className={`${getEnvironmentColor()} cursor-help`}>
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
              <div className="border-t pt-1 mt-2">
                <div className="font-medium mb-1">Features:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(statusDetails.features).map(
                    ([key, enabled]) =>
                      enabled && (
                        <span
                          key={key}
                          className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs"
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
      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Switch Environment (Dev Only)
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => switchEnvironment("development")}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Development
        </button>
        <button
          onClick={() => switchEnvironment("staging")}
          className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Staging
        </button>
        <button
          onClick={() => switchEnvironment("production")}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
        >
          Production
        </button>
      </div>
      <div className="text-xs text-neutral-500">
        Note: This only affects client-side environment detection in development
      </div>
    </div>
  );
};
