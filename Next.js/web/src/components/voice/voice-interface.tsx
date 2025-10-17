import {
  AudioTrack,
  useLocalParticipant,
  useTracks,
  useVoiceAssistant,
} from "@upliftai/assistants-react";
import { Track } from "livekit-client";
import { Mic, MicOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { VoiceOrb } from "./voice-orb";

interface VoiceInterfaceProps {
  onDisconnect: () => void;
}

export function VoiceInterface({ onDisconnect }: VoiceInterfaceProps) {
  const { state } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [_volumeLevel, setVolumeLevel] = useState(0);

  // Get audio tracks for visualization
  const tracks = useTracks([Track.Source.Microphone], {
    onlySubscribed: true,
  });
  const agentTrack = tracks.find((t) => !t.participant.isLocal);

  // Track audio volume for orb reactivity
  useEffect(() => {
    const track = agentTrack?.publication?.track;
    if (!track) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85; // Smooth out volume changes more

    const mediaStream = new MediaStream([track.mediaStreamTrack]);
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationFrameId: number;
    let frameCount = 0;

    const updateVolume = () => {
      frameCount++;

      // Only update every 3rd frame (20fps instead of 60fps)
      if (frameCount % 3 === 0) {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = average / 255;

        // Only update if change is significant (debounce minor changes)
        setVolumeLevel((prev) => {
          const diff = Math.abs(normalized - prev);
          return diff > 0.1 ? normalized : prev;
        });
      }

      animationFrameId = requestAnimationFrame(updateVolume);
    };

    updateVolume();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [agentTrack]);

  // Sync mic state with actual track state
  useEffect(() => {
    if (!localParticipant) return;

    const micTrack = localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    if (micTrack) {
      setIsMicEnabled(!micTrack.isMuted);
    }
  }, [localParticipant]);

  // Toggle microphone function
  const toggleMicrophone = async () => {
    if (!localParticipant) return;

    const micTrack = localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    if (micTrack) {
      if (micTrack.isMuted) {
        await micTrack.unmute();
        setIsMicEnabled(true);
      } else {
        await micTrack.mute();
        setIsMicEnabled(false);
      }
    }
  };

  // Determine orb properties based on voice state
  const isOrbActive =
    state === "speaking" || state === "thinking" || state === "listening";

  // Use a fixed intensity to avoid constant re-renders
  const orbIntensity = useMemo(() => {
    return isOrbActive ? 0.8 : 0.2;
  }, [isOrbActive]);

  // Get status text and color based on state
  const statusInfo = useMemo(() => {
    switch (state) {
      case "listening":
        return { text: "Listening...", color: "#3b82f6" };
      case "thinking":
        return { text: "Thinking...", color: "#f59e0b" };
      case "speaking":
        return { text: "Speaking...", color: "#10b981" };
      case "connecting":
        return { text: "Connecting...", color: "#6b7280" };
      default:
        return { text: "Ready", color: "#9ca3af" };
    }
  }, [state]);

  return (
    <div
      style={{
        background: "white",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "0",
      }}
    >
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes gentle-scale {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .voice-orb-container {
          filter: drop-shadow(0 0 60px rgba(16, 185, 129, 0.3));
          transition: filter 0.3s ease-out;
        }

        .voice-orb-container.active {
          animation: gentle-scale 3s ease-in-out infinite;
          filter: drop-shadow(0 0 100px rgba(16, 185, 129, 0.6));
        }
      `}</style>
      {/* Hidden audio track */}
      {agentTrack && <AudioTrack trackRef={agentTrack} />}

      {/* Status Label */}
      <div
        style={{
          position: "fixed",
          bottom: "180px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            padding: "12px 32px",
            borderRadius: "24px",
            background: "white",
            border: `2px solid ${statusInfo.color}`,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: statusInfo.color,
              animation: isOrbActive ? "pulse 2s infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: statusInfo.color,
            }}
          >
            {statusInfo.text}
          </span>
        </div>
      </div>

      {/* Shader-based Orb visualization */}
      <div
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100vw",
          height: "calc(100vh - 180px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className={`voice-orb-container ${isOrbActive ? "active" : ""}`}
          style={{
            width: "min(90vw, calc(100vh - 240px))",
            height: "min(90vw, calc(100vh - 240px))",
            maxWidth: "1000px",
            maxHeight: "1000px",
          }}
        >
          <VoiceOrb
            hue={160}
            hoverIntensity={orbIntensity}
            rotateOnHover={true}
            forceHoverState={isOrbActive}
          />
        </div>
      </div>

      {/* Controls at bottom */}
      <div
        style={{
          position: "fixed",
          bottom: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "24px",
          zIndex: 9999,
        }}
      >
        <button
          onClick={toggleMicrophone}
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            border: "3px solid #10b981",
            background: "white",
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#10b981";
            e.currentTarget.style.color = "white";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.color = "#10b981";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isMicEnabled ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={onDisconnect}
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            border: "3px solid #ef4444",
            background: "white",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#ef4444";
            e.currentTarget.style.color = "white";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.color = "#ef4444";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
