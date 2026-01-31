import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoRooms } from "@/hooks/useVideoRooms";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Check,
  Key,
  AlertCircle,
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
  token: string | null;
  status: "pending" | "ready" | "error" | null;
  last_error: string | null;
}

interface CreateRoomFormData {
  type: "group" | "1on1";
  generateTestToken: boolean;
}

export default function TutorRooms() {
  const navigate = useNavigate();
  const { user, isAdmin, isTutor, loading: authLoading } = useAuth();
  const { createRoom, fetchRooms, deactivateRoom, loading, error: hookError } = useVideoRooms();
  
  const [rooms, setRooms] = useState<VideoRoom[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const form = useForm<CreateRoomFormData>({
    defaultValues: {
      type: "group",
      generateTestToken: false,
    },
  });

  const siteUrl = window.location.origin;

  // Check if user has tutor access (admin or expert role)
  const hasTutorAccess = isAdmin || isTutor;

  const loadRooms = useCallback(async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      const data = await fetchRooms();
      // Filter to only show rooms hosted by current user
      const myRooms = data.filter((room) => room.host_user_id === user.id);
      setRooms(myRooms);
    } catch (err) {
      console.error("[TutorRooms] Error loading rooms:", err);
      toast.error("Failed to load rooms");
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchRooms, user]);

  useEffect(() => {
    if (user && hasTutorAccess) {
      loadRooms();
    }
  }, [user, hasTutorAccess, loadRooms]);

  const generateAndSaveToken = async (roomId: string, roomName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("[TutorRooms] Generating token for room:", roomName);
      
      const { data, error } = await supabase.functions.invoke("generate-agora-token", {
        body: {
          channelName: roomName,
          uid: 0, // Use 0 for consistency
          role: "publisher",
        },
      });

      if (error) {
        console.error("[TutorRooms] Token generation error:", error);
        // Update room with error status
        await supabase
          .from("video_rooms")
          .update({ 
            status: "error", 
            last_error: error.message || "Token generation failed" 
          })
          .eq("id", roomId);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        console.error("[TutorRooms] Token API returned error:", data.error);
        await supabase
          .from("video_rooms")
          .update({ 
            status: "error", 
            last_error: data.error 
          })
          .eq("id", roomId);
        return { success: false, error: data.error };
      }

      if (data?.token) {
        console.log("[TutorRooms] === TOKEN GENERATED ===");
        console.log("[TutorRooms] Channel:", roomName);
        console.log("[TutorRooms] App ID:", data.appId);
        console.log("[TutorRooms] Token:", data.token.slice(0, 30) + "...");
        console.log("[TutorRooms] Expires in:", data.expiresIn, "seconds");
        console.log("[TutorRooms] =============================");
        
        // Update room with token and ready status
        const { error: updateError } = await supabase
          .from("video_rooms")
          .update({ 
            token: data.token, 
            status: "ready", 
            last_error: null 
          })
          .eq("id", roomId);

        if (updateError) {
          console.error("[TutorRooms] Failed to save token to room:", updateError);
          return { success: false, error: "Failed to save token" };
        }

        return { success: true };
      }

      return { success: false, error: "No token returned" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Token generation failed";
      console.error("[TutorRooms] Token generation exception:", err);
      
      await supabase
        .from("video_rooms")
        .update({ 
          status: "error", 
          last_error: message 
        })
        .eq("id", roomId);
      
      return { success: false, error: message };
    }
  };

  const handleCreateRoom = async (data: CreateRoomFormData) => {
    setIsCreating(true);
    setCreateError(null);
    
    try {
      console.log("[TutorRooms] Creating room with type:", data.type);
      const room = await createRoom({ type: data.type });
      
      if (room) {
        console.log("[TutorRooms] Room created successfully:", room);
        
        // Always generate and save a token for the room
        const tokenResult = await generateAndSaveToken(room.id, room.room_name);
        
        if (tokenResult.success) {
          if (data.generateTestToken) {
            toast.success(
              <div className="space-y-1">
                <p>Room created! Token generated and saved.</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Check browser DevTools for token details
                </p>
              </div>
            );
          } else {
            toast.success("Room created and ready!");
          }
        } else {
          // Room created but token failed
          const isAppIdError = tokenResult.error?.toLowerCase().includes("app id") ||
                               tokenResult.error?.toLowerCase().includes("vendor key");
          
          if (isAppIdError) {
            toast.error(
              <div className="space-y-1">
                <p className="font-medium">Room created but Agora configuration error!</p>
                <p className="text-xs">{tokenResult.error}</p>
                <p className="text-xs text-muted-foreground">Check AGORA_APP_ID and AGORA_APP_CERTIFICATE secrets</p>
              </div>,
              { duration: 10000 }
            );
          } else {
            toast.warning(
              <div className="space-y-1">
                <p>Room created but token generation failed.</p>
                <p className="text-xs text-muted-foreground">{tokenResult.error}</p>
              </div>
            );
          }
        }
        
        setIsCreateDialogOpen(false);
        form.reset();
        await loadRooms();
      } else {
        const errorMsg = hookError || "Failed to create room. Please try again.";
        setCreateError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create room";
      console.error("[TutorRooms] Create room error:", err);
      setCreateError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivateRoom = async (roomId: string) => {
    try {
      const success = await deactivateRoom(roomId);
      if (success) {
        toast.success("Room deactivated");
        await loadRooms();
      } else {
        toast.error("Failed to deactivate room. You may not have permission.");
      }
    } catch (err) {
      console.error("[TutorRooms] Deactivate error:", err);
      toast.error("Failed to deactivate room");
    }
  };

  const copyRoomLink = (roomName: string, roomId: string) => {
    const link = `${siteUrl}/meet/${roomName}`;
    navigator.clipboard.writeText(link);
    setCopiedRoomId(roomId);
    toast.success("Room link copied to clipboard!");
    
    // Reset copied state after 2 seconds
    setTimeout(() => setCopiedRoomId(null), 2000);
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
  if (!user || !hasTutorAccess) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              This page is only accessible to tutors and administrators.
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

              <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  setCreateError(null);
                  form.reset();
                }
              }}>
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
                      {/* Error display */}
                      {createError && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <p className="text-sm text-destructive">{createError}</p>
                        </div>
                      )}

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

                      {/* Test token option */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                        <div className="space-y-0.5">
                          <Label htmlFor="testToken" className="text-sm font-medium">
                            Generate Test Token
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Log an Agora token to console for debugging
                          </p>
                        </div>
                        <Switch
                          id="testToken"
                          checked={form.watch("generateTestToken")}
                          onCheckedChange={(checked) => form.setValue("generateTestToken", checked)}
                        />
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
                        <TableHead>Status</TableHead>
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
                          <TableCell>
                            {room.status === "ready" && (
                              <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                                Ready
                              </Badge>
                            )}
                            {room.status === "error" && (
                              <Badge variant="destructive" className="gap-1" title={room.last_error || "Token generation failed"}>
                                <AlertCircle className="h-3 w-3" />
                                Error
                              </Badge>
                            )}
                            {(room.status === "pending" || !room.status) && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Pending
                              </Badge>
                            )}
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
                              {/* Regenerate token */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => generateAndSaveToken(room.id, room.room_name)}
                                title="Regenerate token"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              
                              {/* Copy link */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyRoomLink(room.room_name, room.id)}
                                title="Copy link"
                              >
                                {copiedRoomId === room.id ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              
                              {/* Join room */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRoom(room.room_name)}
                                title="Join room"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              
                              {/* Deactivate */}
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
                <li>• Click the key icon to generate a test token (check browser console)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
