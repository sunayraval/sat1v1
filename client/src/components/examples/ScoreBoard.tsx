import ScoreBoard from '../ScoreBoard';

export default function ScoreBoardExample() {
  return (
    <div className="min-h-screen bg-background p-4">
      <ScoreBoard
        playerScore={7}
        opponentScore={5}
        currentQuestion={8}
        totalQuestions={10}
        playerName="You"
        opponentName="Challenger"
      />
    </div>
  );
}
