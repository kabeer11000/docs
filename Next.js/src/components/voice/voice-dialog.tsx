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
      console.log("🔧 Voice Tools Available:", voiceTools.length);
      console.log(
        "🔧 Tool Names:",
        voiceTools.map((t) => t.name),
      );
      console.log(
        "🔧 Tool Descriptions:",
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

    console.log("🔌 [VOICE DIALOG] Connecting to assistant:", assistantId);

    try {
      const response = await fetch(
        `https://api.upliftai.org/v1/realtime-assistants/${assistantId}/createPublicSession`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantName: "Lexa User",
          }),
        },
      );

      console.log(
        "📡 [VOICE DIALOG] Session API response status:",
        response.status,
      );

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ [VOICE DIALOG] Session created:", {
        hasToken: !!data.token,
        wsUrl: data.wsUrl,
      });
      setSessionData(data);
    } catch (err: any) {
      setError(err.message || "Failed to connect to assistant");
      console.error("❌ [VOICE DIALOG] Connection error:", err);
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
      <div className="voice-dialog-content">
        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="bg-red-50 border-2 border-red-500 text-red-700 px-6 py-4 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-t-teal-500 border-r-gray-200 border-b-teal-500 border-l-gray-200"></div>
            <p className="mt-6 text-gray-700 text-sm font-medium">
              Connecting to Lexa...
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
                "🔧 [VOICE DIALOG] Tools changed:",
                tools.map((t) => t.name),
              );
            }}
            onConnectionChange={(connected, agentIdentity) => {
              console.log("🔌 [VOICE DIALOG] Connection changed:", {
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
