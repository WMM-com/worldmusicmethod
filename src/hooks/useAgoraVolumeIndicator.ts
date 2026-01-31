import { useEffect, useMemo, useState } from "react";
import { agoraClient } from "@/lib/agora/agoraClient";

interface UseAgoraVolumeIndicatorOptions {
  enabled: boolean;
  speakingThreshold?: number; // Agora volume level (0-100)
}

/**
 * Uses Agora's built-in volume indicator to detect who is speaking.
 * Docs: client.enableAudioVolumeIndicator() + "volume-indicator" event.
 */
export function useAgoraVolumeIndicator({
  enabled,
  speakingThreshold = 6,
}: UseAgoraVolumeIndicatorOptions) {
  const [levelsByUid, setLevelsByUid] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) {
      setLevelsByUid({});
      return;
    }

    // Enable volume indicator (SDK provides this)
    (agoraClient as any).enableAudioVolumeIndicator?.();

    const handler = (volumes: Array<{ uid: string | number; level: number }>) => {
      const next: Record<string, number> = {};
      for (const v of volumes ?? []) {
        if (v?.uid === undefined || v?.uid === null) continue;
        next[String(v.uid)] = Number(v.level ?? 0);
      }
      setLevelsByUid((prev) => ({ ...prev, ...next }));
    };

    (agoraClient as any).on?.("volume-indicator", handler);

    return () => {
      (agoraClient as any).off?.("volume-indicator", handler);
    };
  }, [enabled]);

  const speakingByUid = useMemo(() => {
    const speaking: Record<string, boolean> = {};
    for (const [uid, level] of Object.entries(levelsByUid)) {
      speaking[uid] = level >= speakingThreshold;
    }
    return speaking;
  }, [levelsByUid, speakingThreshold]);

  return { levelsByUid, speakingByUid };
}
