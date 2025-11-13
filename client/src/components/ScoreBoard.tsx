/*
  ScoreBoard.tsx

  Displays the current scores for both players and the progress
  (which question is currently active). This component is presentational
  only and receives all data via props.
*/
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import "@/styles/scoreboard.css";
import { Badge } from "@/components/ui/badge";
import { User, Target } from "lucide-react";

interface ScoreBoardProps {
  playerScore: number;
  opponentScore: number;
  currentQuestion: number;
  totalQuestions: number;
  playerName?: string;
  opponentName?: string;
}

export default function ScoreBoard({
  playerScore,
  opponentScore,
  currentQuestion,
  totalQuestions,
  playerName = "You",
  opponentName = "Opponent",
}: ScoreBoardProps) {
  const [playerPulse, setPlayerPulse] = useState(false);
  const [opponentPulse, setOpponentPulse] = useState(false);

  // Pulse animation when scores change
  useEffect(() => {
    if (playerScore !== undefined) {
      setPlayerPulse(true);
      const t = setTimeout(() => setPlayerPulse(false), 900);
      return () => clearTimeout(t);
    }
  }, [playerScore]);

  useEffect(() => {
    if (opponentScore !== undefined) {
      setOpponentPulse(true);
      const t = setTimeout(() => setOpponentPulse(false), 900);
      return () => clearTimeout(t);
    }
  }, [opponentScore]);
  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4 scoreboard-container">
      <div className="flex items-center justify-center gap-2 mb-2">
  <Target className="w-5 h-5 neon-text" />
        <Badge variant="secondary" className="text-sm font-medium neon-text" data-testid="text-question-progress">
          Question {currentQuestion} / {totalQuestions}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6 scoreboard-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm you-label">You</p>
              <p className="font-semibold" data-testid="text-player-name">{playerName}</p>
            </div>
          </div>
          <div className="text-center">
            <p className={`text-4xl font-bold score-value ${playerPulse ? 'score-pulse' : ''}`} data-testid="text-player-score">
              {playerScore}
            </p>
            <p className="text-sm text-muted-foreground mt-1">points</p>
          </div>
        </Card>

  <Card className="p-6 scoreboard-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
              <User className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Opponent</p>
              <p className="font-semibold" data-testid="text-opponent-name">{opponentName}</p>
            </div>
          </div>
          <div className="text-center">
            <p className={`text-4xl font-bold score-value ${opponentPulse ? 'score-pulse' : ''}`} data-testid="text-opponent-score">
              {opponentScore}
            </p>
            <p className="text-sm text-muted-foreground mt-1">points</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
