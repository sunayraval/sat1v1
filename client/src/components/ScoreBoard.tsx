/*
  ScoreBoard.tsx

  Displays real-time duel scores, current question progress,
  player tags, and optional question countdown timer.
*/
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import "@/styles/scoreboard.css";
import { Badge } from "@/components/ui/badge";
import { User, Target, Clock, Bot } from "lucide-react";

interface ScoreBoardProps {
  playerScore: number;
  opponentScore: number;
  currentQuestion: number;
  totalQuestions: number;
  playerName?: string;
  opponentName?: string;
  timeLeft?: number;
  totalTime?: number;
}

export default function ScoreBoard({
  playerScore,
  opponentScore,
  currentQuestion,
  totalQuestions,
  playerName = "You",
  opponentName = "Opponent",
  timeLeft,
  totalTime,
}: ScoreBoardProps) {
  const [playerPulse, setPlayerPulse] = useState(false);
  const [opponentPulse, setOpponentPulse] = useState(false);

  // Pulse animation when scores change
  useEffect(() => {
    if (playerScore !== undefined && playerScore > 0) {
      setPlayerPulse(true);
      const t = setTimeout(() => setPlayerPulse(false), 900);
      return () => clearTimeout(t);
    }
  }, [playerScore]);

  useEffect(() => {
    if (opponentScore !== undefined && opponentScore > 0) {
      setOpponentPulse(true);
      const t = setTimeout(() => setOpponentPulse(false), 900);
      return () => clearTimeout(t);
    }
  }, [opponentScore]);

  const isOpponentBot = opponentName.toLowerCase().includes("bot");
  const hasTimer = Boolean(totalTime && totalTime > 0 && timeLeft !== undefined);
  const timerPercent = hasTimer ? Math.max(0, Math.min(100, (timeLeft! / totalTime!) * 100)) : 100;
  const isTimeCritical = hasTimer && timeLeft! <= 10;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 space-y-3">
      {/* Top Bar: Question Progress & Timer */}
      <div className="flex items-center justify-between gap-3">
        <Badge
          variant="outline"
          className="text-xs font-semibold px-3 py-1.5 border-zinc-700 bg-zinc-900/80 text-emerald-400 flex items-center gap-1.5"
          data-testid="text-question-progress"
        >
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          <span>Question {currentQuestion} of {totalQuestions}</span>
        </Badge>

        {hasTimer && (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-mono font-bold px-3 py-1.5 border transition-all flex items-center gap-1.5 ${
                isTimeCritical
                  ? "border-red-500 bg-red-950/60 text-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                  : "border-zinc-700 bg-zinc-900/80 text-zinc-300"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft}s</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Timer Bar */}
      {hasTimer && (
        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              isTimeCritical
                ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                : timerPercent < 50
                ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                : "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      {/* Head-to-Head Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Player 1 (You) */}
        <Card className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-emerald-500/80 block leading-tight">You</span>
                <p className="text-xs font-bold text-zinc-200 truncate max-w-[90px] sm:max-w-[120px]" data-testid="text-player-name">
                  {playerName}
                </p>
              </div>
            </div>
          </div>
          <div className="text-center pt-1">
            <p className={`text-3xl sm:text-4xl font-black text-emerald-400 ${playerPulse ? 'scale-110 text-emerald-300 transition-transform' : ''}`} data-testid="text-player-score">
              {playerScore}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">points</p>
          </div>
        </Card>

        {/* Player 2 (Opponent / Bot) */}
        <Card className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                isOpponentBot ? "bg-cyan-500/20 border-cyan-500/40" : "bg-zinc-800 border-zinc-700"
              }`}>
                {isOpponentBot ? (
                  <Bot className="w-4 h-4 text-cyan-400" />
                ) : (
                  <User className="w-4 h-4 text-zinc-400" />
                )}
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block leading-tight">Opponent</span>
                <p className="text-xs font-bold text-zinc-200 truncate max-w-[90px] sm:max-w-[120px]" data-testid="text-opponent-name">
                  {opponentName}
                </p>
              </div>
            </div>
          </div>
          <div className="text-center pt-1">
            <p className={`text-3xl sm:text-4xl font-black text-zinc-300 ${opponentPulse ? 'scale-110 text-zinc-100 transition-transform' : ''}`} data-testid="text-opponent-score">
              {opponentScore}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">points</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
