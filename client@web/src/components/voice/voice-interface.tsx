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

  const statusText = {
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
    connecting: "Connecting",
  }[state as string] ?? "Ready";

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-background text-foreground">
      {/* Hidden audio track */}
      {agentTrack && <AudioTrack trackRef={agentTrack} />}

      {/* Shader-based Orb visualization */}
      <div className="absolute inset-x-0 top-0 bottom-[180px] flex items-center justify-center">
        <div
          style={{
            width: "min(70vw, calc(100vh - 280px))",
            height: "min(70vw, calc(100vh - 280px))",
            maxWidth: "640px",
            maxHeight: "640px",
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

      <div className="fixed bottom-14 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-6">
        <div
          role="status"
          className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground"
        >
          <span
            className={`size-1.5 rounded-full ${
              isOrbActive ? "animate-pulse bg-primary" : "bg-muted-foreground/50"
            }`}
          />
          {statusText}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={toggleMicrophone}
            aria-label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
            aria-pressed={!isMicEnabled}
            className={`flex size-12 items-center justify-center rounded-full border transition-colors duration-150 ${
              isMicEnabled
                ? "border-border bg-background text-foreground hover:bg-accent"
                : "border-transparent bg-accent text-foreground"
            }`}
          >
            {isMicEnabled ? (
              <Mic className="size-5" />
            ) : (
              <MicOff className="size-5" />
            )}
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            aria-label="End voice session"
            className="flex size-12 items-center justify-center rounded-full bg-destructive text-white transition-opacity duration-150 hover:opacity-90"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
