import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AgoraTokenResponse {
  token: string;
  appId: string;
  channel: string;
  uid: string;
  expiresIn: number;
}

interface UseAgoraTokenReturn {
  token: string | null;
  appId: string | null;
  loading: boolean;
  error: string | null;
  fetchToken: (channelName: string, role?: "publisher" | "subscriber") => Promise<AgoraTokenResponse | null>;
  clearToken: () => void;
}

export function useAgoraToken(): UseAgoraTokenReturn {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async (
    channelName: string,
    role: "publisher" | "subscriber" = "publisher"
  ): Promise<AgoraTokenResponse | null> => {
    if (!user) {
      setError("You must be logged in to get an Agora token");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[useAgoraToken] Fetching token for channel:", channelName);

      const { data, error: fnError } = await supabase.functions.invoke("generate-agora-token", {
        body: {
          channelName,
          uid: user.id,
          role,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("[useAgoraToken] Token received successfully");
      
      setToken(data.token);
      setAppId(data.appId);
      
      return data as AgoraTokenResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch Agora token";
      setError(message);
      console.error("[useAgoraToken] Error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearToken = useCallback(() => {
    setToken(null);
    setAppId(null);
    setError(null);
  }, []);

  return {
    token,
    appId,
    loading,
    error,
    fetchToken,
    clearToken,
  };
}
