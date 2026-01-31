import { useCallback, useState } from "react";

type MediaPreflightStatus = "unknown" | "granted" | "denied" | "skipped";

/**
 * Browser permission prompts typically require a user gesture.
 * This hook provides an explicit "request" action and remembers the outcome.
 */
export function useMediaPreflight() {
  const [status, setStatus] = useState<MediaPreflightStatus>("unknown");
  const [error, setError] = useState<string | null>(null);

  const hasDecided = status !== "unknown";

  const request = useCallback(async () => {
    try {
      setError(null);

      if (!navigator?.mediaDevices?.getUserMedia) {
        setStatus("denied");
        setError("getUserMedia is not available in this browser");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      // Immediately stop tracks; Agora will re-acquire when creating local tracks.
      stream.getTracks().forEach((t) => t.stop());

      setStatus("granted");
      return true;
    } catch (e) {
      const message = e instanceof Error ? `${e.name}: ${e.message}` : "Permission request failed";
      setStatus("denied");
      setError(message);
      return false;
    }
  }, []);

  const skip = useCallback(() => {
    setError(null);
    setStatus("skipped");
  }, []);

  return {
    status,
    error,
    hasDecided,
    request,
    skip,
  };
}
