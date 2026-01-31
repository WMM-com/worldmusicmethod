import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoRooms } from "@/hooks/useVideoRooms";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Video,
  Plus,
  Users,
  UserRound,
  Loader2,
  Copy,
  Trash2,
  ExternalLink,
  RefreshCw,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface VideoRoom {
  id: string;
  room_name: string;
  is_active: boolean;
  type: "group" | "1on1";
  host_user_id: string;
  created_at: string;
  expires_at: string;
}

interface CreateRoomFormData {
  type: "group" | "1on1";
}

export default function TutorRooms() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { createRoom, fetchRooms, deactivateRoom, loading } = useVideoRooms();
  
  const [rooms, setRooms] = useState<VideoRoom[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const form = useForm<CreateRoomFormData>({
    defaultValues: {
      type: "group",
    },
  });

  const siteUrl = window.location.origin;

  const loadRooms = useCallback(async () => {
    setIsRefreshing(true);
    const data = await fetchRooms();
    // Filter to only show rooms hosted by current user
    const myRooms = data.filter((room) => room.host_user_id === user?.id);
    setRooms(myRooms);
    setIsRefreshing(false);
  }, [fetchRooms, user?.id]);

  useEffect(() => {
    if (user && isAdmin) {
      loadRooms();
    }
  }, [user, isAdmin, loadRooms]);

  const handleCreateRoom = async (data: CreateRoomFormData) => {
    setIsCreating(true);
    try {
      const room = await createRoom({ type: data.type });
      if (room) {
        toast.success("Room created successfully!");
        setIsCreateDialogOpen(false);
        form.reset();
        await loadRooms();
      } else {
        toast.error("Failed to create room");
      }
    } catch (err) {
      toast.error("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivateRoom = async (roomId: string) => {
    const success = await deactivateRoom(roomId);
    if (success) {
      toast.success("Room deactivated");
      await loadRooms();
    } else {
      toast.error("Failed to deactivate room");
    }
  };

  const copyRoomLink = (roomName: string) => {
    const link = `${siteUrl}/meet/${roomName}`;
    navigator.clipboard.writeText(link);
    toast.success("Room link copied to clipboard!");
  };

  const openRoom = (roomName: string) => {
    navigate(`/meet/${roomName}`);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Access denied for non-tutors
  if (!user || !isAdmin) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              This page is only accessible to tutors.
            </p>
            <Button onClick={() => navigate("/meet")}>Go to Meeting Lobby</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Video className="h-8 w-8 text-primary" />
                My Rooms
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your video meeting rooms
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadRooms}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Room
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={form.handleSubmit(handleCreateRoom)}>
                    <DialogHeader>
                      <DialogTitle>Create New Room</DialogTitle>
                      <DialogDescription>
                        Create a new video meeting room. You'll receive a shareable link.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="roomType">Room Type</Label>
                        <Select
                          value={form.watch("type")}
                          onValueChange={(v) => form.setValue("type", v as "group" | "1on1")}
                        >
                          <SelectTrigger id="roomType">
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="group">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>Group Call</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="1on1">
                              <div className="flex items-center gap-2">
                                <UserRound className="h-4 w-4" />
                                <span>1-on-1 Session</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Room
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Rooms Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Rooms</CardTitle>
              <CardDescription>
                {rooms.length} active room{rooms.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading || isRefreshing ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active rooms</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a new room to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Room Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell className="font-mono text-sm">
                            {room.room_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              {room.type === "group" ? (
                                <Users className="h-3 w-3" />
                              ) : (
                                <UserRound className="h-3 w-3" />
                              )}
                              {room.type === "group" ? "Group" : "1-on-1"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(room.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(room.expires_at), "MMM d, HH:mm")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyRoomLink(room.room_name)}
                                title="Copy link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRoom(room.room_name)}
                                title="Join room"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    title="Deactivate room"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate Room?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will end any active sessions and make the room
                                      unavailable. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeactivateRoom(room.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Deactivate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Quick Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Share the room link with participants to invite them</li>
                <li>• Rooms automatically expire after 24 hours</li>
                <li>• As the host, you can mute participants during the call</li>
                <li>• Use 1-on-1 rooms for private tutoring sessions</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
