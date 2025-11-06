import { useState, useEffect, useMemo, useRef } from "react";
import GameLobby from "@/components/GameLobby";
import WaitingRoom from "@/components/WaitingRoom";
import ScoreBoard from "@/components/ScoreBoard";
import QuestionDisplay from "@/components/QuestionDisplay";
import GameOver from "@/components/GameOver";
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
  } = useGameRoom(gameState === "lobby" ? null : roomCode, playerId);

  const currentQuestionIndex = roomData?.currentQuestion || 0;
  const opponentId = roomData?.players?.find((id) => id !== playerId);

  // Sync scores from Firebase
  useEffect(() => {
    if (roomData?.scores) {
      setPlayerScore(roomData.scores[playerId] || 0);
      setOpponentScore(roomData.scores[opponentId || ""] || 0);
    }
  }, [roomData?.scores, playerId, opponentId]);

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

      const currentQuestion = satQuestions[currentQuestionIndex];
      const playerCorrect = playerAnswer === currentQuestion.correct;
      const opponentCorrect = opponentAnswer === currentQuestion.correct;

      // Calculate new scores
      const newPlayerScore = playerScore + (playerCorrect ? 1 : 0);
      const newOpponentScore = opponentScore + (opponentCorrect ? 1 : 0);

      // Update local scores
      setPlayerScore(newPlayerScore);
      setOpponentScore(newOpponentScore);

      // Move to next question or end game after delay
      setTimeout(() => {
        if (currentQuestionIndex < satQuestions.length - 1) {
          nextQuestion(roomCode, currentQuestionIndex + 1);
        } else {
          setGameState("gameover");
        }
      }, 2000);
    }
  }, [roomData?.answers, gameState, currentQuestionIndex, playerId, opponentId, playerScore, opponentScore, roomCode, nextQuestion]);

  const handleCreateRoom = async (code: string) => {
    const success = await createRoom(code);
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

  return (
    <div className="min-h-screen bg-background py-8 space-y-6">
      <ScoreBoard
        playerScore={playerScore}
        opponentScore={opponentScore}
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={satQuestions.length}
      />
      <QuestionDisplay
        question={satQuestions[currentQuestionIndex]}
        onAnswer={handleAnswer}
        selectedAnswer={selectedAnswer}
        isWaiting={isWaiting}
      />
    </div>
  );
}
