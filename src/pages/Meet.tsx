import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoRooms } from "@/hooks/useVideoRooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Users, UserRound, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Meet() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { createRoom, loading, error } = useVideoRooms();
  
  const [roomType, setRoomType] = useState<"group" | "1on1">("group");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (!user) {
      toast.error("Please sign in to create a room");
      return;
    }

    setIsCreating(true);
    try {
      const room = await createRoom({ type: roomType });
      if (room) {
        toast.success("Room created successfully!");
        navigate(`/meet/${room.room_name}`);
      } else {
        toast.error(error || "Failed to create room");
      }
    } catch (err) {
      toast.error("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      toast.error("Please enter a room ID");
      return;
    }
    navigate(`/meet/${joinRoomId.trim()}`);
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <Video className="h-16 w-16 mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold mb-2">Video Meetings</h1>
            <p className="text-muted-foreground mb-6">
              Sign in to create or join video meetings.
            </p>
            <Button onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <Video className="h-12 w-12 mx-auto text-primary mb-4" />
            <h1 className="text-3xl font-bold">Video Meetings</h1>
            <p className="text-muted-foreground mt-2">
              Create or join a video call with other members
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Create Room Card - Only for tutors */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Create Room
                  </CardTitle>
                  <CardDescription>
                    Start a new video meeting room
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Room Type</Label>
                    <Select
                      value={roomType}
                      onValueChange={(v) => setRoomType(v as "group" | "1on1")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Group Call
                          </div>
                        </SelectItem>
                        <SelectItem value="1on1">
                          <div className="flex items-center gap-2">
                            <UserRound className="h-4 w-4" />
                            1-on-1 Call
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleCreateRoom}
                    disabled={isCreating || loading}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Video className="mr-2 h-4 w-4" />
                        Create Room
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Join Room Card */}
            <Card className={!isAdmin ? "md:col-span-2 max-w-md mx-auto w-full" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  Join Room
                </CardTitle>
                <CardDescription>
                  Enter a room ID to join an existing meeting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomId">Room ID</Label>
                  <Input
                    id="roomId"
                    placeholder="Enter room ID..."
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  />
                </div>

                <Button
                  onClick={handleJoinRoom}
                  variant="secondary"
                  className="w-full"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Join Room
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info section */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3 text-center">
                <div>
                  <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium">HD Video</h3>
                  <p className="text-sm text-muted-foreground">
                    Crystal clear video quality
                  </p>
                </div>
                <div>
                  <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium">Group Calls</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with multiple users
                  </p>
                </div>
                <div>
                  <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium">Private Sessions</h3>
                  <p className="text-sm text-muted-foreground">
                    1-on-1 tutoring sessions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
