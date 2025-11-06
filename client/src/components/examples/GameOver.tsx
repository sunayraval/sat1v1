import GameOver from '../GameOver';

export default function GameOverExample() {
  return (
    <GameOver
      playerScore={8}
      opponentScore={6}
      totalQuestions={10}
      onPlayAgain={() => console.log('Play again clicked')}
      onNewRoom={() => console.log('New room clicked')}
    />
  );
}
