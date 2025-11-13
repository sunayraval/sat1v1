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
  // Local lock state — app shows password entry screen until unlocked for the day
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("satDuelUnlockedDate");
      const today = new Date().toISOString().slice(0, 10);
      return stored === today;
    } catch (e) {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);

  const DAILY_SALT = "sat-duel-daily-salt-v1"; // deterministic salt for generating daily code

  // simple seeded hash -> 32bit int (xmur3)
  const xmur3 = (str: string) => {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  };

  const getDailyPassword = (d = new Date()) => {
    const day = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const seed = xmur3(day + DAILY_SALT)();
    const pw = seed % 10000;
    return pw.toString().padStart(4, "0");
  };

  // admin code as requested (hard-coded)
  const ADMIN_CODE = "197577";

  // Check stored unlock expiry on mount and whenever day changes
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem("satDuelUnlockedDate");
        const today = new Date().toISOString().slice(0, 10);
        if (stored !== today) {
          setUnlocked(false);
        }
      } catch (e) {
        // ignore
      }
    }, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const unlockWithPassword = (pw: string) => {
    const expected = getDailyPassword();
    if (pw === expected) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("satDuelUnlockedDate", today);
      setUnlocked(true);
      return true;
    }
    return false;
  };

  const handleAdminGetPassword = async () => {
    const code = window.prompt("Enter admin code to reveal today's password:");
    if (!code) return;
    if (code === ADMIN_CODE) {
      const pass = getDailyPassword();
      toast({ title: "Daily password", description: `Today's password is ${pass}` });
    } else {
      toast({ title: "Invalid admin code", variant: "destructive" });
    }
  };

  const [gameState, setGameState] = useState<GameState>("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>();
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastRoundResult, setLastRoundResult] = useState<{ playerCorrect: boolean; opponentCorrect: boolean } | null>(null);
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

  // Compute supported modules from available questions so default config doesn't include unsupported modules
  const supportedModules = useMemo(() => {
    const set = new Set<string>();
    Object.values(satQuestions).forEach((q) => set.add((q.module || "").toLowerCase()));
    return Array.from(set).filter(Boolean);
  }, []);

  // Deterministic shuffle helper (seeded) so fallback ordering matches across clients
  const seededShuffle = (arr: any[], seedInput: string) => {
    // simple xmur3 + mulberry32 seeded RNG
    const xmur3 = (str: string) => {
      let h = 1779033703 ^ str.length;
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
      }
      return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
      };
    };

    const mulberry32 = (a: number) => {
      return () => {
        let t = (a += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    const seed = xmur3(seedInput)();
    const rand = mulberry32(seed);
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

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
    // If the room has a persisted question order, use it so all players see the same questions
    if (roomData?.questions && Array.isArray(roomData.questions) && roomData.questions.length > 0) {
      const byId = new Map(Object.values(satQuestions).map((q) => [q.id, q]));
      const mapped = roomData.questions.map((id) => byId.get(id)).filter(Boolean) as typeof satQuestions;
      if (mapped.length > 0) return mapped;
    }

    // Fallback: build list from config (used when no questions were persisted)
    const all = Object.values(satQuestions);
    const modules = roomData?.config?.modules;
    const difficulties = roomData?.config?.difficulties;
    const num = roomData?.config?.numQuestions;
    
    let filtered = all;

    // If no modules selected, use all modules
    if (modules && modules.length > 0) {
      filtered = filtered.filter((q) => {
        const questionModule = q.module.toLowerCase();
        return modules.some(m => m.toLowerCase() === questionModule);
      });
    }
    
    if (difficulties && difficulties.length > 0) {
      filtered = filtered.filter((q) => q.difficulty && difficulties.includes(q.difficulty));
    }

    // Ensure we have enough questions, if not, add more from other modules
    if (filtered.length < (num || 10)) {
      const remainingCount = (num || 10) - filtered.length;
      const otherQuestions = all
        .filter(q => !filtered.includes(q))
        .sort(() => Math.random() - 0.5)
        .slice(0, remainingCount);
      filtered = [...filtered, ...otherQuestions];
    }

  // Randomize the order deterministically using the room code as a seed so both
  // clients will produce the same fallback order if the persisted `questions`
  // array hasn't arrived yet.
  const seed = roomCode || JSON.stringify(roomData?.config) || "default-seed";
  filtered = seededShuffle(filtered, seed);

    if (num && num > 0) {
      filtered = filtered.slice(0, num);
    }

    return filtered.length > 0 ? filtered : all;
  }, [roomData?.config]);

  // Reset selected answer when question changes
  useEffect(() => {
    setSelectedAnswer(undefined);
    processedQuestionRef.current = -1;
    setShowResult(false);
    setLastRoundResult(null);
  }, [currentQuestionIndex]);

  // Handle game state transitions
  useEffect(() => {
    if (!roomData || gameState === "lobby") return;

    // Debug log roomData to catch malformed updates that could cause render errors
    // eslint-disable-next-line no-console
    console.debug("Home: roomData ->", roomData);

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

      const safeIndex = Math.max(0, Math.min(currentQuestionIndex, questions.length - 1));
      const currentQuestion = questions[safeIndex];
      if (!currentQuestion) return; // defensive

      const playerChoice = currentQuestion.content.answerOptions[playerAnswer];
      const opponentChoice = currentQuestion.content.answerOptions[opponentAnswer];
      const playerCorrect = currentQuestion.content.correct_answer.includes(playerChoice);
      const opponentCorrect = currentQuestion.content.correct_answer.includes(opponentChoice);
      // Calculate new scores
      const newPlayerScore = playerScore + (playerCorrect ? 1 : 0);
      const newOpponentScore = opponentScore + (opponentCorrect ? 1 : 0);

  // Update local scores
      setPlayerScore(newPlayerScore);
      setOpponentScore(newOpponentScore);

  // Show result to the user before moving on
  setLastRoundResult({ playerCorrect, opponentCorrect });
  setShowResult(true);

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

      // Move to next question or end game after delay (give user time to see the correct answer)
      setTimeout(() => {
        setShowResult(false);
        setLastRoundResult(null);
        if (currentQuestionIndex < questions.length - 1) {
          nextQuestion(roomCode, currentQuestionIndex + 1);
        } else {
          setGameState("gameover");
        }
      }, 3000);
    }
  }, [roomData?.answers, gameState, currentQuestionIndex, playerId, opponentId, playerScore, opponentScore, roomCode, nextQuestion]);

  const handleCreateRoom = async (code: string, config?: { modules?: string[]; difficulties?: string[]; numQuestions?: number }) => {
    try {
      const formattedConfig = {
        // If the caller supplied modules, use them; otherwise default to supported modules (usually math)
        modules: config?.modules || supportedModules || ["math"],
        difficulties: config?.difficulties || ["E", "M", "H"],
        numQuestions: config?.numQuestions || 10
      };
      const success = await createRoom(code, formattedConfig);
      if (success) {
        setRoomCode(code);
        setGameState("waiting");
      } else {
        throw new Error("Failed to create room");
      }
    } catch (error) {
      console.error("Room creation error:", error);
      toast({
        title: "Error",
        description: "Could not create room. Please try again.",
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

  // If app locked for the day, show password entry screen before any other UI
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 home-container">
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <Button size="sm" variant="outline" onClick={handleAdminGetPassword}>Get password</Button>
        </div>
  <Card className="w-full max-w-md neon-container terminal-panel">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl neon-heading mb-2">Enter 4-digit password</h2>
            <p className="muted text-sm mb-4">Enter today's access code to continue</p>
            <div className={`terminal-input-wrapper ${isInputFocused || passwordInput.length>0 ? 'focused typing' : ''}`}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value.replace(/[^0-9]/g, '').slice(0,4))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const ok = unlockWithPassword(passwordInput);
                    if (!ok) toast({ title: 'Incorrect password', variant: 'destructive' });
                  }
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="0000"
                className="mx-auto text-center"
              />
              <span className="terminal-underline" />
              <span className="caret" />
            </div>
            <div className="mt-4 flex gap-2 justify-center">
              <Button onClick={() => {
                const ok = unlockWithPassword(passwordInput);
                if (!ok) toast({ title: 'Incorrect password', variant: 'destructive' });
              }}>
                Submit
              </Button>
              <Button variant="ghost" onClick={() => setPasswordInput('')}>Clear</Button>
            </div>
            <p className="text-xs muted mt-4">The 4-digit code rotates daily.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        // Use the actual quiz length (questions selected for this room) instead
        totalQuestions={questions.length}
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
      <div className="min-h-screen bg-gradient-dark py-8 flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <Card className="neon-container p-6">
            <p className="text-lg font-semibold neon-text">No questions available for this room configuration.</p>
            <p className="text-sm text-muted-foreground mt-2">Try changing the room settings or creating a new room.</p>
            <div className="mt-4">
              <Button variant="outline" className="neon-hover neon-text" onClick={handleNewRoom}>Leave Room</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const safeIndex = Math.max(0, Math.min(currentQuestionIndex, questions.length - 1));
  const currentQuestion = questions[safeIndex];

  return (
    <div className="min-h-screen bg-gradient-dark py-8 space-y-6">
      <div className="max-w-2xl mx-auto px-4 mb-4 flex justify-between items-center">
        <Button variant="outline" className="neon-hover neon-text" onClick={handleNewRoom}>Leave Room</Button>
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
        showResult={showResult}
        isCorrect={lastRoundResult?.playerCorrect ?? false}
      />
      {showExplanation && currentQuestion.content.rationale && (
        <div className="max-w-2xl mx-auto px-4 mt-4 animate-fadeIn">
          <Card className="neon-container">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2 neon-text">Explanation:</h3>
              <div 
                className="prose prose-sm max-w-none question-content" 
                dangerouslySetInnerHTML={{ __html: currentQuestion.content.rationale }} 
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
