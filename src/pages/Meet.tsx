import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Users, UserRound, LogIn } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Meet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [joinRoomId, setJoinRoomId] = useState("");

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
              Sign in to join video meetings.
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
        <div className="max-w-lg mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <Video className="h-12 w-12 mx-auto text-primary mb-4" />
            <h1 className="text-3xl font-bold">Join a Meeting</h1>
            <p className="text-muted-foreground mt-2">
              Enter the room ID provided by your tutor to join a video session
            </p>
          </div>

          {/* Join Room Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Join Room
              </CardTitle>
              <CardDescription>
                Enter the room ID shared by your tutor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomId">Room ID</Label>
                <Input
                  id="roomId"
                  placeholder="Enter room ID (e.g., sunny-mountain-1234)"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                />
              </div>

              <Button
                onClick={handleJoinRoom}
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Join Room
              </Button>
            </CardContent>
          </Card>

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