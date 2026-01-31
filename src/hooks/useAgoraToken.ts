import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AgoraTokenResponse {
  token: string;
  appId: string;
  channel: string;
  uid: number;
  expiresIn: number;
}

interface UseAgoraTokenReturn {
  token: string | null;
  appId: string | null;
  uid: number | null;
  loading: boolean;
  error: string | null;
  fetchToken: (channelName: string, options?: FetchTokenOptions) => Promise<AgoraTokenResponse | null>;
  clearToken: () => void;
}

interface FetchTokenOptions {
  role?: "publisher" | "subscriber";
  uid?: number | null;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

export function useAgoraToken(): UseAgoraTokenReturn {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [uid, setUid] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchToken = useCallback(async (
    channelName: string,
    options: FetchTokenOptions = {}
  ): Promise<AgoraTokenResponse | null> => {
    const {
      role = "publisher",
      uid: requestedUid = null, // null => backend auto-generates a unique numeric uid
      maxRetries = DEFAULT_MAX_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
    } = options;

    if (!user) {
      setError("You must be logged in to get an Agora token");
      return null;
    }

    setLoading(true);
    setError(null);
    retryCountRef.current = 0;

    const attemptFetch = async (): Promise<AgoraTokenResponse | null> => {
      try {
        console.log("[useAgoraToken] Fetching token for channel:", channelName);
        console.log("[useAgoraToken] Attempt:", retryCountRef.current + 1, "of", maxRetries);
        console.log("[useAgoraToken] UID:", requestedUid ?? "(auto-generated)");

        const { data, error: fnError } = await supabase.functions.invoke("generate-agora-token", {
          body: {
            channelName,
            uid: requestedUid,
            role,
          },
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data.error) {
          // Check for specific error types that shouldn't be retried
          if (data.error.includes("Invalid Agora App ID") || 
              data.error.includes("Missing Agora App Certificate")) {
            console.error("[useAgoraToken] Configuration error - not retrying:", data.error);
            throw new Error(data.error);
          }
          throw new Error(data.error);
        }

        console.log("[useAgoraToken] ✓ Token received successfully");
        console.log("[useAgoraToken] App ID:", data.appId ? `${data.appId.slice(0, 8)}...` : "N/A");
        console.log("[useAgoraToken] Assigned UID:", data.uid);
        
        setToken(data.token);
        setAppId(data.appId);
        setUid(data.uid);
        
        return data as AgoraTokenResponse;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch Agora token";
        
        // Check if we should retry
        const isRetryable = !message.includes("Invalid Agora App ID") && 
                           !message.includes("Missing Agora App Certificate") &&
                           !message.includes("Unauthorized");
        
        if (isRetryable && retryCountRef.current < maxRetries - 1) {
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1); // Exponential backoff
          console.warn(`[useAgoraToken] Retry ${retryCountRef.current}/${maxRetries} after ${delay}ms:`, message);
          await sleep(delay);
          return attemptFetch();
        }

        setError(message);
        console.error("[useAgoraToken] Error (no more retries):", err);
        return null;
      }
    };

    try {
      return await attemptFetch();
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearToken = useCallback(() => {
    setToken(null);
    setAppId(null);
    setUid(null);
    setError(null);
    retryCountRef.current = 0;
  }, []);

  return {
    token,
    appId,
    uid,
    loading,
    error,
    fetchToken,
    clearToken,
  };
}
