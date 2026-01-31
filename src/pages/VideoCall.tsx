import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import { useAgoraToken } from "@/hooks/useAgoraToken";
import { useMediaPreflight } from "@/hooks/useMediaPreflight";
import { useAgoraVolumeIndicator } from "@/hooks/useAgoraVolumeIndicator";
import { LocalVideoTile } from "@/components/video/LocalVideoTile";
import { RemoteVideoGrid } from "@/components/video/RemoteVideoGrid";
import { VideoControls } from "@/components/video/VideoControls";
import { NetworkQualityIndicator } from "@/components/video/NetworkQualityIndicator";
import { Loader2, AlertCircle, RefreshCw, Copy, Check, ExternalLink, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isAuthError, isNetworkError } from "@/lib/agora/errorMessages";

// Import debug utilities (available in window for console debugging)
import "@/lib/agora/debugUtils";

interface VideoRoom {
  id: string;
  room_name: string;
  is_active: boolean;
  type: "group" | "1on1";
  host_user_id: string;
  expires_at: string;
}

export default function VideoCall() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [room, setRoom] = useState<VideoRoom | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState<number>(0);
  const [tokenFetched, setTokenFetched] = useState(false);
  
  // Agora token hook
  const { 
    token: agoraToken, 
    appId: dynamicAppId,
    uid: agoraUid,
    loading: tokenLoading, 
    error: tokenError, 
    fetchToken 
  } = useAgoraToken();

  const mediaPreflight = useMediaPreflight();
  
  // Check if current user is the host
  const isHost = room && user ? room.host_user_id === user.id : false;

  const {
    isJoined,
    isConnecting,
    localTracks,
    remoteUsers,
    error: agoraError,
    mediaPermissionDenied,
    mediaPermissionError,
    isMuted,
    isVideoOff,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
    muteRemoteUser,
    retryMedia,
  } = useAgoraCall({
    onUserJoined: (user) => {
      toast.info(`User ${user.uid} joined the call`);
    },
    onUserLeft: (user) => {
      toast.info(`User ${user.uid} left the call`);
    },
    onError: (error) => {
      toast.error(`Call error: ${error.message}`);
    },
  });

  const { speakingByUid } = useAgoraVolumeIndicator({ enabled: isJoined });
  const isLocalSpeaking = !!(agoraUid !== null && speakingByUid[String(agoraUid)]);
  
  // Handler for host to mute/unmute remote users
  const handleMuteRemoteUser = async (uid: string | number, mute: boolean) => {
    if (!isHost) {
      throw new Error("Only the host can mute participants");
    }
    await muteRemoteUser(uid, mute);
  };

  const hasShownMediaPermissionToast = useRef(false);

  useEffect(() => {
    if (mediaPermissionDenied && !hasShownMediaPermissionToast.current) {
      hasShownMediaPermissionToast.current = true;
      toast.warning(
        "Camera/microphone permission blocked. You joined the room, but you may need to allow permissions to speak/share video."
      );
      if (mediaPermissionError) {
        console.warn("[VideoCall] mediaPermissionError:", mediaPermissionError);
      }
    }
  }, [mediaPermissionDenied, mediaPermissionError]);

  const handleRetryMedia = useCallback(async () => {
    const ok = await retryMedia();
    if (ok) {
      toast.success("Camera/microphone enabled");
    } else {
      toast.error("Camera/microphone still blocked. Please allow permissions in your browser settings.");
    }
  }, [retryMedia]);

  // Fetch room details
  useEffect(() => {
    if (!roomId) {
      setRoomError("Room ID is required");
      setRoomLoading(false);
      return;
    }

    const fetchRoom = async () => {
      try {
        console.log("[VideoCall] Fetching room:", roomId);
        // Use backend function to avoid direct table access issues for non-hosts.
        const { data, error } = await supabase.functions.invoke("join-video-room", {
          body: { room_name: roomId },
        });

        console.log("[VideoCall] Response:", { data, error });

        if (error) {
          console.error("[VideoCall] Function invoke error:", error);
          throw error;
        }

        if (!data?.success) {
          console.error("[VideoCall] API returned failure:", data);
          setRoomError(data?.error || "Failed to load room details");
          return;
        }

        const roomData = data.room as VideoRoom;
        console.log("[VideoCall] Room data:", roomData);

        if (!roomData) {
          setRoomError("Room not found");
          return;
        }

        if (!roomData.is_active) {
          setRoomError("This room is no longer active");
          return;
        }

        if (new Date(roomData.expires_at) < new Date()) {
          setRoomError("This room has expired");
          return;
        }

        setRoom(roomData);
      } catch (err) {
        console.error("[VideoCall] Error fetching room:", err);
        const message = err instanceof Error ? err.message : "Failed to load room details";
        setRoomError(message);
      } finally {
        setRoomLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  // Fetch Agora token when room is loaded
  useEffect(() => {
    // Browsers often block permission prompts without a user gesture.
    // We gate token/join behind a user decision (enable mic/cam or continue without).
    if (!mediaPreflight.hasDecided) return;

    if (room && user && !tokenFetched && !tokenLoading) {
      console.log("[VideoCall] === TOKEN FETCH DEBUG ===");
      console.log("[VideoCall] Room name (channel):", room.room_name);
      console.log("[VideoCall] User ID:", user.id);
      console.log("[VideoCall] Media preflight:", mediaPreflight.status);
      console.log("[VideoCall] ===========================");
      
      // Let backend generate a unique numeric UID for this session.
      fetchToken(room.room_name, { role: "publisher", uid: null }).then((result) => {
        if (result) {
          setTokenFetched(true);
          console.log("[VideoCall] ✓ Token fetched successfully");
          console.log("[VideoCall] App ID received:", result.appId ? `${result.appId.slice(0, 8)}...` : "NONE");
          console.log("[VideoCall] UID received:", result.uid);
        } else {
          console.error("[VideoCall] ✗ Token fetch failed");
        }
      });
    }
  }, [room, user, tokenFetched, tokenLoading, fetchToken, mediaPreflight.hasDecided, mediaPreflight.status]);

  // Join the call when token is ready
  useEffect(() => {
    if (room && user && agoraToken && dynamicAppId && agoraUid !== null && !isJoined && !isConnecting) {
      console.log("[VideoCall] === JOINING CHANNEL ===");
      console.log("[VideoCall] Channel:", room.room_name);
      console.log("[VideoCall] App ID:", dynamicAppId.slice(0, 8) + "...");
      console.log("[VideoCall] Token:", agoraToken.slice(0, 20) + "...");
      console.log("[VideoCall] UID:", agoraUid);
      console.log("[VideoCall] =========================");
      
      joinChannel(room.room_name, agoraToken, agoraUid, dynamicAppId);
    }
  }, [room, user, agoraToken, dynamicAppId, agoraUid, isJoined, isConnecting, joinChannel]);

  // Handle network quality updates
  useEffect(() => {
    if (!isJoined) return;

    const handleNetworkQuality = (stats: { uplinkNetworkQuality: number; downlinkNetworkQuality: number }) => {
      // Use the worse of uplink/downlink quality
      const quality = Math.max(stats.uplinkNetworkQuality, stats.downlinkNetworkQuality);
      setNetworkQuality(quality);
    };

    // Listen for network quality events from the Agora client
    const interval = setInterval(() => {
      // Simulated network quality for demo - in production use client.on('network-quality')
      setNetworkQuality(Math.floor(Math.random() * 3) + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [isJoined]);

  // Handle leave
  const handleLeave = useCallback(async () => {
    await leaveChannel();
    navigate("/");
  }, [leaveChannel, navigate]);

  // Loading states
  if (authLoading || roomLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  // Auth required
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Authentication Required</h2>
          <p className="mt-2 text-muted-foreground">
            You need to be logged in to join this call.
          </p>
          <Button onClick={() => navigate("/auth")} className="mt-4">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Room error
  if (roomError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Unable to Join</h2>
          <p className="mt-2 text-muted-foreground">{roomError}</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Agora error with helpful troubleshooting
  if (agoraError || tokenError) {
    const displayError = agoraError || tokenError || "Connection error";
    const isAuth = isAuthError({ message: displayError });
    const isNetwork = isNetworkError({ message: displayError });
    const isInvalidVendorKey = displayError.toLowerCase().includes("invalid vendor key") ||
                               displayError.toLowerCase().includes("can_not_get_gateway_server");
    
    const handleRunDiagnostics = () => {
      console.log("Running Agora diagnostics...");
      // @ts-expect-error - debugAgora is attached to window
      if (typeof window !== "undefined" && window.debugAgora) {
        // @ts-expect-error - debugAgora is attached to window
        window.debugAgora(room?.room_name || "test-room");
      }
      toast.info("Diagnostics running - check browser console (F12)");
    };
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-lg p-6">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Connection Error</h2>
          <p className="mt-2 text-muted-foreground font-mono text-sm break-all">{displayError}</p>
          
          {/* Specific error guidance */}
          {isInvalidVendorKey && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-left">
              <p className="font-semibold text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Invalid Agora App ID Detected
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                The Agora SDK cannot authenticate with the provided App ID. This typically means:
              </p>
              <ul className="mt-2 text-sm space-y-1 text-muted-foreground list-disc list-inside">
                <li>App ID is incorrect or has typos</li>
                <li>The Agora project is disabled or deleted</li>
                <li>App Certificate is not enabled</li>
                <li>Token was generated with a different App ID</li>
              </ul>
            </div>
          )}
          
          {/* Troubleshooting checklist */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left text-sm">
            <p className="font-medium mb-2">Troubleshooting Checklist:</p>
            <ul className="space-y-2 text-muted-foreground">
              {(isAuth || isInvalidVendorKey) && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">1.</span>
                    <span>
                      Go to{" "}
                      <a 
                        href="https://console.agora.io/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline inline-flex items-center gap-1"
                      >
                        Agora Console <ExternalLink className="h-3 w-3" />
                      </a>{" "}
                      and verify your project is <strong>active</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">2.</span>
                    <span>Copy App ID exactly (32 hex characters, no spaces)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">3.</span>
                    <span>Ensure "App Certificate" is enabled (for token authentication)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">4.</span>
                    <span>Update <code className="bg-muted px-1 rounded">AGORA_APP_ID</code> and <code className="bg-muted px-1 rounded">AGORA_APP_CERTIFICATE</code> in backend secrets</span>
                  </li>
                </>
              )}
              {isNetwork && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Check your internet connection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Try refreshing the page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Check if Agora services are operational</span>
                  </li>
                </>
              )}
              {!isAuth && !isNetwork && !isInvalidVendorKey && (
                <>
                  <li>• Refresh the page and try again</li>
                  <li>• Check browser console (F12) for details</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            <Button variant="outline" onClick={handleRunDiagnostics}>
              <Bug className="w-4 h-4 mr-2" />
              Run Diagnostics
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => navigate("/")}>
              Go Home
            </Button>
          </div>
          
          <p className="mt-4 text-xs text-muted-foreground">
            Open browser console (F12) and run <code className="bg-muted px-1 rounded">debugAgora("channel-name")</code> for detailed diagnostics
          </p>
        </div>
      </div>
    );
  }

  // Preflight: ask for camera/mic permission before joining (requires user gesture)
  if (!mediaPreflight.hasDecided) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-lg p-6">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Enable camera & microphone</h2>
          <p className="mt-2 text-muted-foreground">
            To join the call, your browser needs permission to access your camera and microphone.
          </p>

          {mediaPreflight.error && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left text-sm">
              <p className="font-medium">Permission error</p>
              <p className="mt-1 text-muted-foreground font-mono break-all">{mediaPreflight.error}</p>
              <p className="mt-2 text-muted-foreground">
                If this keeps happening, click the lock icon in your browser address bar and allow Camera/Microphone.
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-center mt-6 flex-wrap">
            <Button onClick={mediaPreflight.request}>
              Enable camera & mic
            </Button>
            <Button variant="outline" onClick={mediaPreflight.skip}>
              Continue without
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-muted/50 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-foreground font-medium">
              {room?.type === "1on1" ? "Private Call" : "Group Call"}
            </h1>
            {isConnecting && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Connecting...
              </span>
            )}
            {isJoined && (
              <span className="text-xs text-emerald-500">● Connected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {mediaPermissionDenied && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Camera/mic blocked</span>
                <Button variant="secondary" size="sm" onClick={handleRetryMedia}>
                  Try again
                </Button>
              </div>
            )}
            <NetworkQualityIndicator quality={networkQuality} />
          </div>
        </div>
      </header>

      {/* Video Grid */}
      <main className="flex-1 p-4 relative">
        <div className="max-w-7xl mx-auto h-full">
          {/* Remote Users Grid */}
          <RemoteVideoGrid 
            remoteUsers={remoteUsers} 
            networkQuality={networkQuality}
            isHost={isHost}
            onMuteUser={handleMuteRemoteUser}
            speakingByUid={speakingByUid}
          />

          {/* Local Video (Picture-in-Picture style) */}
          <LocalVideoTile
            videoTrack={localTracks.videoTrack}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            networkQuality={networkQuality}
            isSpeaking={isLocalSpeaking}
          />
        </div>
      </main>

      {/* Controls */}
      <VideoControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onLeave={handleLeave}
        isSpeaking={isLocalSpeaking}
      />
    </div>
  );
}
