import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Home, RotateCcw } from "lucide-react";

interface GameOverProps {
  playerScore: number;
  opponentScore: number;
  totalQuestions: number;
  onPlayAgain: () => void;
  onNewRoom: () => void;
}

export default function GameOver({
  playerScore,
  opponentScore,
  totalQuestions,
  onPlayAgain,
  onNewRoom,
}: GameOverProps) {
  const isWinner = playerScore > opponentScore;
  const isTie = playerScore === opponentScore;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isWinner ? "bg-primary/10" : isTie ? "bg-accent/20" : "bg-muted"
            }`}>
              <Trophy className={`w-10 h-10 ${
                isWinner ? "text-primary" : isTie ? "text-accent-foreground" : "text-muted-foreground"
              }`} />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold" data-testid="text-result-title">
            {isWinner ? "Victory! 🎉" : isTie ? "It's a Tie! 🤝" : "Good Try! 💪"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-6 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Your Score</p>
              <p className="text-5xl font-bold text-primary" data-testid="text-final-player-score">
                {playerScore}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                out of {totalQuestions}
              </p>
            </div>
            <div className="text-center p-6 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">Opponent</p>
              <p className="text-5xl font-bold" data-testid="text-final-opponent-score">
                {opponentScore}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                out of {totalQuestions}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              data-testid="button-play-again"
              onClick={onPlayAgain}
              className="w-full h-12"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
            <Button
              data-testid="button-new-room"
              onClick={onNewRoom}
              variant="outline"
              className="w-full h-12"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              New Room
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
