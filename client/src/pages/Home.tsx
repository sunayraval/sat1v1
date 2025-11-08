/*
  Home.tsx

  Main page for the SAT Duel application. This component is the
  orchestrator for the client-side game flow. Responsibilities:
  - Maintain UI state (lobby, waiting, playing, gameover)
  - Create/join/leave rooms through the `useGameRoom` hook
  - Track player and opponent scores and selected answers
  - Drive question progression using the shared `satQuestions` list

  Key effects:
  - Listen for room updates via Firebase (useGameRoom)
  - When both players answer a question, determine correctness
    and advance to the next question or show the GameOver screen

  Notes for contributors:
  - Room state is stored in Firebase Realtime Database under
    `rooms/{roomCode}`. The `useGameRoom` hook wraps those reads/writes.
  - Questions are static and imported from `@shared/questions`.
*/
import { useState, useEffect, useMemo, useRef } from "react";
import GameLobby from "@/components/GameLobby";
import WaitingRoom from "@/components/WaitingRoom";
import ScoreBoard from "@/components/ScoreBoard";
import QuestionDisplay from "@/components/QuestionDisplay";
import GameOver from "@/components/GameOver";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GameState } from "@shared/schema";
import { satQuestions } from "@shared/questions";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>();
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const { toast } = useToast();
  const processedQuestionRef = useRef<number>(-1);

  // Generate a consistent player ID
  const playerId = useMemo(() => {
    const stored = localStorage.getItem("satDuelPlayerId");
    if (stored) return stored;
    const newId = `player_${Math.floor(Math.random() * 10000)}`;
    localStorage.setItem("satDuelPlayerId", newId);
    return newId;
  }, []);

  const {
    roomData,
    isConnected,
    createRoom,
    joinRoom,
    submitAnswer,
    nextQuestion,
    leaveRoom,
    setScores,
  } = useGameRoom(gameState === "lobby" ? null : roomCode, playerId);

  // Determine which question the room is currently on and the opponent's id
  const currentQuestionIndex = roomData?.currentQuestion || 0;
  const opponentId = roomData?.players?.find((id) => id !== playerId);

  // Sync scores from Firebase
  useEffect(() => {
    if (roomData?.scores) {
      setPlayerScore(roomData.scores[playerId] || 0);
      setOpponentScore(roomData.scores[opponentId || ""] || 0);
    }
  }, [roomData?.scores, playerId, opponentId]);

  // Build the questions list according to room config (modules, difficulties, numQuestions)
  const questions = useMemo(() => {
    const all = Object.values(satQuestions);
    const modules = roomData?.config?.modules;
    const difficulties = roomData?.config?.difficulties;
    const num = roomData?.config?.numQuestions;
    
    let filtered = all;

    if (modules && modules.length > 0) {
      filtered = filtered.filter((q) => modules.includes(q.module));
    }
    
    if (difficulties && difficulties.length > 0) {
      filtered = filtered.filter((q) => q.difficulty && difficulties.includes(q.difficulty));
    }

    // Randomize the order
    filtered = [...filtered].sort(() => Math.random() - 0.5);

    if (num && num > 0) {
      filtered = filtered.slice(0, num);
    }

    return filtered.length > 0 ? filtered : all;
  }, [roomData?.config]);

  // Reset selected answer when question changes
  useEffect(() => {
    setSelectedAnswer(undefined);
    processedQuestionRef.current = -1;
  }, [currentQuestionIndex]);

  // Handle game state transitions
  useEffect(() => {
    if (!roomData || gameState === "lobby") return;

    // Transition from waiting to playing when second player joins
    if (gameState === "waiting" && roomData.started && roomData.players?.length === 2) {
      setGameState("playing");
      toast({
        title: "Opponent joined!",
        description: "The duel begins now!",
      });
    }
  }, [roomData, gameState, toast]);

  // Handle answer processing
  useEffect(() => {
    if (!roomData || gameState !== "playing") return;
    if (processedQuestionRef.current === currentQuestionIndex) return;

    const playerAnswer = roomData.answers?.[playerId];
    const opponentAnswer = roomData.answers?.[opponentId || ""];

    // Both players have answered
    if (playerAnswer !== undefined && opponentAnswer !== undefined) {
      processedQuestionRef.current = currentQuestionIndex;

      const currentQuestion = questions[currentQuestionIndex];
      const playerChoice = currentQuestion.content.answerOptions[playerAnswer];
      const opponentChoice = currentQuestion.content.answerOptions[opponentAnswer];
      const playerCorrect = currentQuestion.content.correct_answer.includes(playerChoice);
      const opponentCorrect = currentQuestion.content.correct_answer.includes(opponentChoice);      // Calculate new scores
      const newPlayerScore = playerScore + (playerCorrect ? 1 : 0);
      const newOpponentScore = opponentScore + (opponentCorrect ? 1 : 0);

      // Update local scores
      setPlayerScore(newPlayerScore);
      setOpponentScore(newOpponentScore);

      // Persist scores to the room so both clients stay in sync
      try {
        if (setScores) {
          const toUpdate: Record<string, number> = {};
          toUpdate[playerId] = newPlayerScore;
          if (opponentId) toUpdate[opponentId] = newOpponentScore;
          setScores(roomCode, toUpdate);
        }
      } catch (err) {
        // ignore - setScores logs errors
      }

      // Move to next question or end game after delay
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          nextQuestion(roomCode, currentQuestionIndex + 1);
        } else {
          setGameState("gameover");
        }
      }, 2000);
    }
  }, [roomData?.answers, gameState, currentQuestionIndex, playerId, opponentId, playerScore, opponentScore, roomCode, nextQuestion]);

  const handleCreateRoom = async (code: string, config?: { category?: string; numQuestions?: number }) => {
    const success = await createRoom(code, config);
    if (success) {
      setRoomCode(code);
      setGameState("waiting");
    } else {
      toast({
        title: "Error",
        description: "Could not create room. Please check your Firebase configuration.",
        variant: "destructive",
      });
    }
  };

  const handleJoinRoom = async (code: string) => {
    const success = await joinRoom(code);
    if (success) {
      setRoomCode(code);
      setGameState("playing");
      toast({
        title: "Joined room!",
        description: "Get ready to duel!",
      });
    } else {
      toast({
        title: "Error",
        description: "Room not found or already full. Please check the code.",
        variant: "destructive",
      });
    }
  };

  const handleAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    submitAnswer(roomCode, answerIndex);
  };

  const handlePlayAgain = () => {
    setSelectedAnswer(undefined);
    setPlayerScore(0);
    setOpponentScore(0);
    processedQuestionRef.current = -1;
    nextQuestion(roomCode, 0);
    setGameState("playing");
  };

  const handleNewRoom = () => {
    if (roomCode) {
      leaveRoom(roomCode);
    }
    setSelectedAnswer(undefined);
    setPlayerScore(0);
    setOpponentScore(0);
    processedQuestionRef.current = -1;
    setRoomCode("");
    setGameState("lobby");
  };

  const handleCancel = () => {
    if (roomCode) {
      leaveRoom(roomCode);
    }
    setGameState("lobby");
    setRoomCode("");
  };

  if (gameState === "lobby") {
    return <GameLobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }

  if (gameState === "waiting") {
    return <WaitingRoom roomCode={roomCode} onCancel={handleCancel} />;
  }

  if (gameState === "gameover") {
    return (
      <GameOver
        playerScore={playerScore}
        opponentScore={opponentScore}
        totalQuestions={satQuestions.length}
        onPlayAgain={handlePlayAgain}
        onNewRoom={handleNewRoom}
      />
    );
  }

  // Playing state
  const isWaiting = selectedAnswer !== undefined && !roomData?.answers?.[opponentId || ""];
  // Defensive: ensure we have at least one question and the index is valid
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">No questions available for this room configuration.</p>
          <p className="text-sm text-muted-foreground">Try changing the room settings or creating a new room.</p>
          <div className="mt-4">
            <Button variant="outline" onClick={handleNewRoom}>Leave Room</Button>
          </div>
        </div>
      </div>
    );
  }

  const safeIndex = Math.max(0, Math.min(currentQuestionIndex, questions.length - 1));
  const currentQuestion = questions[safeIndex];

  return (
    <div className="min-h-screen bg-background py-8 space-y-6">
      <div className="max-w-2xl mx-auto px-4 mb-4 flex justify-between items-center">
        <Button variant="outline" onClick={handleNewRoom}>Leave Room</Button>
      </div>
      <ScoreBoard
        playerScore={playerScore}
        opponentScore={opponentScore}
        currentQuestion={safeIndex + 1}
        totalQuestions={questions.length}
      />
      <QuestionDisplay
        question={currentQuestion}
        onAnswer={handleAnswer}
        selectedAnswer={selectedAnswer}
        isWaiting={isWaiting}
        showExplanation={showExplanation}
      />
      {showExplanation && currentQuestion.content.rationale && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2">Explanation:</h3>
              <div 
                className="prose prose-sm max-w-none" 
                dangerouslySetInnerHTML={{ __html: currentQuestion.content.rationale }} 
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
