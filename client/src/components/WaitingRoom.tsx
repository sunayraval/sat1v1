/*
  WaitingRoom.tsx

  Presentational screen shown when a host is waiting for Player 2.
  Provides copy code affordance and quick fallback actions to start
  immediately with an AI Bot or in Solo Practice mode.
*/
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, Check, Loader2, Bot, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WaitingRoomProps {
  roomCode: string;
  onCancel: () => void;
  onStartWithBot?: () => void;
}

export default function WaitingRoom({ roomCode, onCancel, onStartWithBot }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast({
      title: "Room code copied! 📋",
      description: `Share code ${roomCode} with your opponent to begin.`,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 home-container">
      <Card className="w-full max-w-md neon-container terminal-panel backdrop-blur-xl border border-zinc-800 bg-zinc-950/85">
        <CardHeader className="text-center space-y-3 pb-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center cyber-outline border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Users className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight neon-heading text-emerald-400">
            Waiting for Opponent
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Send this room code to your friend to begin the duel
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Room Code Display Box */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-center text-zinc-400">
              Duel Access Code
            </p>
            <div className="flex items-center gap-2">
              <Badge
                className="flex-1 justify-center text-3xl font-mono py-3 px-6 font-black tracking-widest bg-zinc-900 border border-emerald-500/40 text-emerald-400 shadow-[inset_0_0_15px_rgba(16,185,129,0.15)]"
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
                className="h-14 w-14 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
                title="Copy code"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Pulsing Waiting Indicator */}
          <div className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <p className="text-xs text-zinc-300 font-medium" data-testid="text-waiting">
              Waiting for player to connect...
            </p>
          </div>

          {/* Fallback actions if waiting */}
          <div className="space-y-2 pt-1 border-t border-zinc-800/80">
            <p className="text-[11px] text-center text-zinc-500">Opponent not ready?</p>
            {onStartWithBot && (
              <Button
                type="button"
                onClick={onStartWithBot}
                variant="outline"
                className="w-full h-11 text-xs font-semibold border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/30 flex items-center justify-center gap-2"
              >
                <Bot className="w-4 h-4 text-cyan-400" />
                Duel SAT Bot Instead 🤖
              </Button>
            )}

            <Button
              data-testid="button-cancel"
              onClick={onCancel}
              variant="ghost"
              className="w-full h-10 text-xs text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Cancel & Back to Lobby
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
