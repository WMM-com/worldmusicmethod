import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import { LocalVideoTile } from "@/components/video/LocalVideoTile";
import { RemoteVideoGrid } from "@/components/video/RemoteVideoGrid";
import { VideoControls } from "@/components/video/VideoControls";
import { NetworkQualityIndicator } from "@/components/video/NetworkQualityIndicator";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

  const {
    isJoined,
    isConnecting,
    localTracks,
    remoteUsers,
    error: agoraError,
    isMuted,
    isVideoOff,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
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

  // Fetch room details
  useEffect(() => {
    if (!roomId) {
      setRoomError("Room ID is required");
      setRoomLoading(false);
      return;
    }

    const fetchRoom = async () => {
      try {
        const { data, error } = await supabase
          .from("video_rooms")
          .select("*")
          .eq("room_name", roomId)
          .single();

        if (error) throw error;

        if (!data) {
          setRoomError("Room not found");
          return;
        }

        if (!data.is_active) {
          setRoomError("This room is no longer active");
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setRoomError("This room has expired");
          return;
        }

        setRoom(data as VideoRoom);
      } catch (err) {
        console.error("[VideoCall] Error fetching room:", err);
        setRoomError("Failed to load room details");
      } finally {
        setRoomLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  // Join the call when room is loaded and user is authenticated
  useEffect(() => {
    if (room && user && !isJoined && !isConnecting) {
      // For testing, we use null token (requires Agora app to allow no auth)
      // In production, generate token server-side
      joinChannel(room.room_name, null, user.id);
    }
  }, [room, user, isJoined, isConnecting, joinChannel]);

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

  // Agora error
  if (agoraError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Connection Error</h2>
          <p className="mt-2 text-muted-foreground">{agoraError}</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-800/50 backdrop-blur-sm border-b border-zinc-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-white font-medium">
              {room?.type === "1on1" ? "Private Call" : "Group Call"}
            </h1>
            {isConnecting && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Connecting...
              </span>
            )}
            {isJoined && (
              <span className="text-xs text-green-400">● Connected</span>
            )}
          </div>
          <NetworkQualityIndicator quality={networkQuality} />
        </div>
      </header>

      {/* Video Grid */}
      <main className="flex-1 p-4 relative">
        <div className="max-w-7xl mx-auto h-full">
          {/* Remote Users Grid */}
          <RemoteVideoGrid 
            remoteUsers={remoteUsers} 
            networkQuality={networkQuality}
          />

          {/* Local Video (Picture-in-Picture style) */}
          <LocalVideoTile
            videoTrack={localTracks.videoTrack}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            networkQuality={networkQuality}
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
      />
    </div>
  );
}
