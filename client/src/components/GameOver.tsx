/*
  GameOver.tsx

  Final results screen shown after duel or practice ends.
  Displays final scores, accuracy percentage, and action buttons.
*/
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Home, RotateCcw, Award, Sparkles, Target } from "lucide-react";

interface GameOverProps {
  playerScore: number;
  opponentScore: number;
  totalQuestions: number;
  playerName?: string;
  opponentName?: string;
  isSolo?: boolean;
  onPlayAgain: () => void;
  onNewRoom: () => void;
}

export default function GameOver({
  playerScore,
  opponentScore,
  totalQuestions,
  playerName = "You",
  opponentName = "Opponent",
  isSolo = false,
  onPlayAgain,
  onNewRoom,
}: GameOverProps) {
  const isWinner = !isSolo && playerScore > opponentScore;
  const isTie = !isSolo && playerScore === opponentScore;
  const accuracy = Math.round((playerScore / Math.max(1, totalQuestions)) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 home-container">
      <Card className="w-full max-w-lg neon-container terminal-panel backdrop-blur-xl border border-zinc-800 bg-zinc-950/85">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center cyber-outline glass ${
                isSolo
                  ? "border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                  : isWinner
                  ? "border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                  : isTie
                  ? "border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                  : "border-zinc-700 shadow-none"
              }`}
            >
              {isSolo ? (
                <Target className="w-10 h-10 text-amber-400" />
              ) : isWinner ? (
                <Trophy className="w-10 h-10 text-emerald-400" />
              ) : isTie ? (
                <Award className="w-10 h-10 text-amber-400" />
              ) : (
                <Trophy className="w-10 h-10 text-zinc-500" />
              )}
            </div>
          </div>
          <CardTitle
            className={`text-3xl font-black tracking-tight ${
              isSolo
                ? "text-amber-400 neon-text"
                : isWinner
                ? "text-emerald-400 neon-text"
                : isTie
                ? "text-amber-400 neon-text"
                : "text-zinc-300"
            }`}
            data-testid="text-result-title"
          >
            {isSolo
              ? accuracy >= 80 ? "Outstanding Practice! 🌟" : "Practice Complete! 🎯"
              : isWinner
              ? "Victory! 🏆"
              : isTie
              ? "It's a Tie! 🤝"
              : "Good Fight! ⚡"}
          </CardTitle>
          <p className="text-xs text-zinc-400">
            {isSolo
              ? `You achieved ${accuracy}% accuracy across ${totalQuestions} SAT questions.`
              : isWinner
              ? "You dominated this SAT duel!"
              : isTie
              ? "Evenly matched contenders! A true duel."
              : "Review your mistakes below and claim victory next round!"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scores Display */}
          {isSolo ? (
            <div className="text-center p-6 rounded-xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                Final Score ({accuracy}%)
              </span>
              <p
                className="text-6xl font-black text-amber-400 score-value"
                data-testid="text-final-player-score"
              >
                {playerScore}
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                out of {totalQuestions} questions correct
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 truncate">
                  {playerName}
                </p>
                <p
                  className="text-5xl font-black text-emerald-400 score-value"
                  data-testid="text-final-player-score"
                >
                  {playerScore}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  out of {totalQuestions}
                </p>
              </div>
              <div className="text-center p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 truncate">
                  {opponentName}
                </p>
                <p
                  className="text-5xl font-black text-zinc-300 score-value"
                  data-testid="text-final-opponent-score"
                >
                  {opponentScore}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  out of {totalQuestions}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <Button
              data-testid="button-play-again"
              onClick={onPlayAgain}
              className="w-full h-12 text-sm font-bold neon-hover shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isSolo ? "Practice Again" : "Rematch / Play Again"}
            </Button>
            <Button
              data-testid="button-new-room"
              onClick={onNewRoom}
              variant="outline"
              className="w-full h-12 text-sm font-semibold border-zinc-700 hover:bg-zinc-900"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Lobby / New Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
