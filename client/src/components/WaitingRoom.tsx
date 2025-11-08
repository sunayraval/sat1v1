/*
  WaitingRoom.tsx

  Simple UI shown after a room is created and the first player is waiting
  for an opponent to join. This component is purely presentational and
  exposes an `onCancel` callback to allow the parent to clean up the room.
  It also provides an easy "copy room code" affordance using the
  browser clipboard API so the player can share the code with a friend.
*/
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WaitingRoomProps {
  roomCode: string;
  onCancel: () => void;
}

export default function WaitingRoom({ roomCode, onCancel }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast({
      title: "Room code copied!",
      description: "Share it with your opponent",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Waiting for Opponent</CardTitle>
          <CardDescription>
            Share the room code with your opponent to start the duel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">Room Code</p>
            <div className="flex items-center gap-2">
              <Badge 
                className="flex-1 justify-center text-2xl font-mono py-3 px-6 font-bold"
                variant="secondary"
                data-testid="text-room-code"
              >
                {roomCode}
              </Badge>
              <Button
                data-testid="button-copy-code"
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="h-12 w-12"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground" data-testid="text-waiting">
              Waiting for player to join...
            </p>
          </div>

          <Button
            data-testid="button-cancel"
            onClick={onCancel}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
