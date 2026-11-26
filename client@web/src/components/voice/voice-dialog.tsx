import { UpliftAIRoom } from "@upliftai/assistants-react";
import { useEffect, useState } from "react";
import { VoiceInterface } from "./voice-interface";
import { voiceTools } from "./voice-tools";

interface VoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantId: string;
}

export function VoiceDialog({
  open,
  onOpenChange,
  assistantId,
}: VoiceDialogProps) {
  const [sessionData, setSessionData] = useState<{
    token: string;
    wsUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log tools registration when dialog opens
  useEffect(() => {
    if (open && !sessionData) {
      console.log("=== VOICE DIALOG OPENED ===");
      console.log("Voice Tools Available:", voiceTools.length);
      console.log(
        "Tool Names:",
        voiceTools.map((t) => t.name),
      );
      console.log(
        "Tool Descriptions:",
        voiceTools.map((t) => ({ name: t.name, description: t.description })),
      );
    }
  }, [open, sessionData]);

  const connectToAssistant = async () => {
    if (!assistantId.trim()) {
      setError("Assistant ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    console.log("[VOICE DIALOG] Connecting to assistant:", assistantId);

    try {
      const response = await fetch(
        `https://api.upliftai.org/v1/realtime-assistants/${assistantId}/createPublicSession`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantName: "User",
          }),
        },
      );

      console.log(
        "[VOICE DIALOG] Session API response status:",
        response.status,
      );

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      console.log("[VOICE DIALOG] Session created:", {
        hasToken: !!data.token,
        wsUrl: data.wsUrl,
      });
      setSessionData(data);
    } catch (err: any) {
      setError(err.message || "Failed to connect to assistant");
      console.error("[VOICE DIALOG] Connection error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setSessionData(null);
    setError(null);
    onOpenChange(false);
  };

  // Auto-connect when dialog opens
  useEffect(() => {
    if (open && !sessionData && !loading) {
      connectToAssistant();
    }
  }, [open, connectToAssistant, loading, sessionData]);

  // Cleanup on unmount
  useEffect(() => {
    if (!open) {
      setSessionData(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="voice-dialog-overlay"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog Content */}
      <div
        className="voice-dialog-content"
       
      >
        {error && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 text-center">
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8 rounded-md border border-border px-3 text-sm text-foreground hover:bg-accent"
            >
              Close
            </button>
          </div>
        )}

        {loading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center">
            <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Connecting to voice assistant...
            </p>
          </div>
        )}

        {sessionData && (
          <UpliftAIRoom
            token={sessionData.token}
            serverUrl={sessionData.wsUrl}
            connect={true}
            audio={true}
            video={false}
            tools={voiceTools}
            onDisconnected={handleDisconnect}
            onToolsChange={(tools) => {
              console.log(
                "[VOICE DIALOG] Tools changed:",
                tools.map((t) => t.name),
              );
            }}
            onConnectionChange={(connected, agentIdentity) => {
              console.log("[VOICE DIALOG] Connection changed:", {
                connected,
                agentIdentity,
              });
            }}
          >
            <VoiceInterface onDisconnect={handleDisconnect} />
          </UpliftAIRoom>
        )}
      </div>
    </>
  );
}
