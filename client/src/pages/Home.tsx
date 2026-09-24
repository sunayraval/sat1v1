/*
  Home.tsx

  Main page for the SAT Duel application. Orchestrates:
  - Access gate (Quick Play / Day Code entry)
  - Game Lobby (1v1 Multiplayer, SAT Bot Duel, Solo Practice)
  - Waiting Room (with fallback to Bot Duel)
  - Active Duel & Practice gameplay (with optional question timer and sound effects)
  - GameOver and Missed Question Review / Retake
*/
import { useState, useEffect, useMemo, useRef } from "react";
import GameLobby, { GameConfig } from "@/components/GameLobby";
import WaitingRoom from "@/components/WaitingRoom";
import ScoreBoard from "@/components/ScoreBoard";
import QuestionDisplay from "@/components/QuestionDisplay";
import GameOver from "@/components/GameOver";
import Chat from "@/components/Chat";
import Review from "@/components/Review";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GameState } from "@shared/schema";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useToast } from "@/hooks/use-toast";
import { soundManager } from "@/lib/sound";
import { Volume2, VolumeX, Sparkles, Key, Zap, Check } from "lucide-react";

export default function Home() {
  // Local lock state — allows instant quick access or daily password entry
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("satDuelUnlockedDate");
      const today = new Date().toISOString().slice(0, 10);
      return stored === today;
    } catch {
      return false;
    }
  });

  const [passwordInput, setPasswordInput] = useState("");
  const [soundOn, setSoundOn] = useState(() => soundManager.enabled);

  const DAILY_SALT = "sat-duel-daily-salt-v1";
  const ADMIN_CODE = "197577";

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
    const day = d.toISOString().slice(0, 10);
    const seed = xmur3(day + DAILY_SALT)();
    const pw = seed % 10000;
    return pw.toString().padStart(4, "0");
  };

  const todayCode = useMemo(() => getDailyPassword(), []);

  const handleQuickUnlock = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("satDuelUnlockedDate", today);
    setUnlocked(true);
    soundManager.playCorrect();
    toast({
      title: "Welcome to SAT Duel! ⚡",
      description: "Quick access granted. Ready to compete.",
    });
  };

  const unlockWithPassword = (pw: string) => {
    const expected = todayCode;
    const cleaned = pw.trim();
    if (cleaned === expected || cleaned === ADMIN_CODE) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("satDuelUnlockedDate", today);
      setUnlocked(true);
      soundManager.playCorrect();
      toast({
        title: "Access Granted! 🎯",
        description: "Welcome to today's SAT challenge.",
      });
      return true;
    }
    return false;
  };

  const [gameState, setGameState] = useState<GameState>("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>();
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [retakeIds, setRetakeIds] = useState<string[] | null>(null);
  const [retakeIndex, setRetakeIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastRoundResult, setLastRoundResult] = useState<{ playerCorrect: boolean; opponentCorrect: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | undefined>(undefined);

  const { toast } = useToast();
  const processedQuestionRef = useRef<number>(-1);
  const botAnswerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate or retrieve persistent player ID
  const playerId = useMemo(() => {
    const stored = localStorage.getItem("satDuelPlayerId");
    if (stored) return stored;
    const newId = `player_${Math.floor(1000 + Math.random() * 9000)}`;
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
    sendMessage,
    finishGame,
    rematch,
  } = useGameRoom(gameState === "lobby" ? null : roomCode, playerId);

  const isSolo = roomData?.config?.mode === "practice";
  const isBotGame = roomData?.config?.mode === "bot";
  const isRetake = Boolean(retakeIds && retakeIds.length > 0);

  // Active question index and opponent ID
  const currentQuestionIndex = roomData?.currentQuestion || 0;
  const opponentId = roomData?.players?.find((id) => id !== playerId);

  // Sync scores from roomData
  useEffect(() => {
    if (roomData?.scores && !isRetake) {
      setPlayerScore(roomData.scores[playerId] || 0);
      if (opponentId) {
        setOpponentScore(roomData.scores[opponentId] || 0);
      }
    }
  }, [roomData?.scores, playerId, opponentId, isRetake]);

  // Questions from roomData or retake list
  const questions = useMemo(() => {
    if (isRetake && roomData?.questions) {
      const allQ = roomData.questions as any[];
      const byId = new Map(allQ.map((q: any) => [q.id, q]));
      const mapped = (retakeIds || []).map((id) => byId.get(id)).filter(Boolean);
      if (mapped.length > 0) return mapped;
    }

    if (roomData?.questions && Array.isArray(roomData.questions) && roomData.questions.length > 0) {
      return roomData.questions as any[];
    }

    return [];
  }, [roomData?.questions, isRetake, retakeIds]);

  const activeQuestionIndex = isRetake ? retakeIndex : currentQuestionIndex;
  const safeIndex = Math.max(0, Math.min(activeQuestionIndex, Math.max(0, questions.length - 1)));
  const currentQuestion = questions[safeIndex];

  // Reset answer when question changes
  useEffect(() => {
    setSelectedAnswer(undefined);
    processedQuestionRef.current = -1;
    setShowResult(false);
    setLastRoundResult(null);

    // Reset countdown timer if configured
    if (roomData?.config?.questionTimer && roomData.config.questionTimer > 0) {
      setTimeLeft(roomData.config.questionTimer);
    } else {
      setTimeLeft(undefined);
    }
  }, [currentQuestionIndex, retakeIndex, roomData?.config?.questionTimer]);

  // Handle countdown timer ticking
  useEffect(() => {
    if (gameState !== "playing" || showResult || selectedAnswer !== undefined) return;
    if (timeLeft === undefined || timeLeft <= 0) {
      if (timeLeft === 0 && selectedAnswer === undefined && questions.length > 0) {
        // Time expired! Auto-submit timeout
        handleAnswer(-1);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === undefined || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev <= 6) {
          soundManager.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, timeLeft, showResult, selectedAnswer, questions.length]);

  // Handle room start (transition waiting -> playing)
  useEffect(() => {
    if (!roomData || gameState !== "waiting") return;

    if (roomData.started && roomData.players?.length >= (isSolo ? 1 : 2)) {
      setGameState("playing");
      toast({
        title: isBotGame ? "SAT Bot is ready!" : "Opponent joined! ⚔️",
        description: "The duel begins now. Good luck!",
      });
    }
  }, [roomData, gameState, isSolo, isBotGame, toast]);

  // Listen for room game over broadcast
  useEffect(() => {
    if (roomData?.gameOver && gameState === "playing" && !isRetake) {
      setGameState("gameover");
      soundManager.playVictory();
    }
  }, [roomData?.gameOver, gameState, isRetake]);

  // Listen for rematch / play again
  useEffect(() => {
    if (
      gameState === "gameover" &&
      roomData &&
      !roomData.gameOver &&
      roomData.currentQuestion === 0 &&
      (!roomData.answers || Object.keys(roomData.answers).length === 0) &&
      !isRetake
    ) {
      setSelectedAnswer(undefined);
      setPlayerScore(0);
      setOpponentScore(0);
      processedQuestionRef.current = -1;
      setGameState("playing");
      toast({
        title: "Match Restarted! ⚡",
        description: "Round 1 begins now.",
      });
    }
  }, [gameState, roomData?.gameOver, roomData?.currentQuestion, roomData?.answers, isRetake, toast]);

  // Detect opponent disconnect
  useEffect(() => {
    if (!roomData || isRetake || isSolo || isBotGame) return;
    if (gameState === "playing" || gameState === "gameover") {
      if (roomData.players && roomData.players.length < 2) {
        toast({
          title: "Opponent left",
          description: "Your opponent disconnected. Returning to lobby.",
          variant: "destructive",
        });
        if (roomCode) leaveRoom(roomCode);
        setSelectedAnswer(undefined);
        setPlayerScore(0);
        setOpponentScore(0);
        processedQuestionRef.current = -1;
        setRoomCode("");
        setGameState("lobby");
      }
    }
  }, [roomData?.players, gameState, isRetake, isSolo, isBotGame, roomCode, leaveRoom, toast]);

  // Bot Answer Simulation (if playing vs Bot)
  useEffect(() => {
    if (!roomData || gameState !== "playing" || !isBotGame || isRetake) return;
    if (processedQuestionRef.current === currentQuestionIndex) return;

    // Check if bot already answered this question
    if (roomData.answers?.["sat_bot"] !== undefined) return;

    // Clear any pending bot timer
    if (botAnswerTimerRef.current) {
      clearTimeout(botAnswerTimerRef.current);
    }

    // Bot answers after 3 to 5.5 seconds
    const delay = Math.floor(3000 + Math.random() * 2500);

    botAnswerTimerRef.current = setTimeout(async () => {
      const q = questions[safeIndex];
      if (!q) return;

      const correctChoice = q.content.correct_answer[0];
      const correctIndex = q.content.answerOptions.indexOf(correctChoice);

      // Accuracy based on chosen difficulty
      const diff = roomData.config?.botDifficulty || "M";
      const accuracy = diff === "H" ? 0.90 : diff === "E" ? 0.50 : 0.75;
      const willBeCorrect = Math.random() < accuracy;

      let botChoice = correctIndex >= 0 ? correctIndex : 0;
      if (!willBeCorrect) {
        const wrongIndices = [0, 1, 2, 3].filter((i) => i !== correctIndex);
        botChoice = wrongIndices[Math.floor(Math.random() * wrongIndices.length)] ?? 0;
      }

      try {
        await fetch(`/api/rooms/${roomCode}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: "sat_bot", answerIndex: botChoice }),
        });
      } catch {}
    }, delay);

    return () => {
      if (botAnswerTimerRef.current) clearTimeout(botAnswerTimerRef.current);
    };
  }, [currentQuestionIndex, isBotGame, gameState, questions, safeIndex, roomData?.answers, roomCode, isRetake]);

  // Multiplayer Answer Processing
  useEffect(() => {
    if (!roomData || gameState !== "playing" || isRetake || isSolo) return;
    if (processedQuestionRef.current === currentQuestionIndex) return;

    const playerAnswer = roomData.answers?.[playerId];
    const oppAnswer = roomData.answers?.[opponentId || ""];

    // Both players have answered
    if (playerAnswer !== undefined && oppAnswer !== undefined) {
      processedQuestionRef.current = currentQuestionIndex;

      const q = questions[safeIndex];
      if (!q) return;

      const playerChoice = playerAnswer >= 0 ? q.content.answerOptions[playerAnswer] : null;
      const opponentChoice = oppAnswer >= 0 ? q.content.answerOptions[oppAnswer] : null;

      const playerCorrect = playerChoice ? q.content.correct_answer.includes(playerChoice) : false;
      const opponentCorrect = opponentChoice ? q.content.correct_answer.includes(opponentChoice) : false;

      if (playerCorrect) {
        soundManager.playCorrect();
      } else {
        soundManager.playWrong();
      }

      const newPlayerScore = playerScore + (playerCorrect ? 1 : 0);
      const newOpponentScore = opponentScore + (opponentCorrect ? 1 : 0);

      setPlayerScore(newPlayerScore);
      setOpponentScore(newOpponentScore);
      setLastRoundResult({ playerCorrect, opponentCorrect });
      setShowResult(true);

      const isHost = roomData.players?.[0] === playerId;

      if (isHost) {
        try {
          if (setScores) {
            const toUpdate: Record<string, number> = { [playerId]: newPlayerScore };
            if (opponentId) toUpdate[opponentId] = newOpponentScore;
            setScores(roomCode, toUpdate);
          }
        } catch {}

        setTimeout(() => {
          setShowResult(false);
          setLastRoundResult(null);
          if (currentQuestionIndex < questions.length - 1) {
            nextQuestion(roomCode, currentQuestionIndex + 1);
          } else {
            finishGame(roomCode);
            setGameState("gameover");
          }
        }, 3000);
      } else {
        setTimeout(() => {
          setShowResult(false);
          setLastRoundResult(null);
          if (currentQuestionIndex >= questions.length - 1) {
            setGameState("gameover");
          }
        }, 3000);
      }
    }
  }, [
    roomData?.answers,
    gameState,
    currentQuestionIndex,
    playerId,
    opponentId,
    playerScore,
    opponentScore,
    roomCode,
    nextQuestion,
    setScores,
    finishGame,
    questions,
    safeIndex,
    isRetake,
    isSolo,
  ]);

  const handleCreateRoom = async (code: string, config?: GameConfig) => {
    try {
      const formattedConfig = {
        modules: config?.modules && config.modules.length > 0 ? config.modules : ["math", "english"],
        difficulties: config?.difficulties && config.difficulties.length > 0 ? config.difficulties : ["E", "M", "H"],
        numQuestions: config?.numQuestions || 10,
        playerName: config?.playerName || "Player 1",
        mode: config?.mode || "duel",
        botDifficulty: config?.botDifficulty || "M",
        questionTimer: config?.questionTimer || 0,
      };

      const success = await createRoom(code, formattedConfig);
      if (success) {
        setRoomCode(code);
        if (config?.mode === "bot" || config?.mode === "practice") {
          setGameState("playing");
        } else {
          setGameState("waiting");
        }
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

  const handleJoinRoom = async (code: string, name?: string) => {
    const success = await joinRoom(code, { name });
    if (success) {
      setRoomCode(code);
      setGameState("playing");
      toast({
        title: "Joined room! ⚔️",
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

  // Convert waiting room into instant bot duel
  const handleSwitchToBot = async () => {
    if (!roomCode) return;
    try {
      await fetch(`/api/rooms/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: "sat_bot", name: "SAT Bot 🤖" }),
      });
      setGameState("playing");
      toast({
        title: "SAT Bot Connected! 🤖",
        description: "Starting your duel immediately.",
      });
    } catch {}
  };

  const handleAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    const qId = currentQuestion?.id || `idx_${safeIndex}`;
    setUserAnswers((s) => ({ ...s, [qId]: answerIndex }));

    if (isRetake) {
      // Solo Retake Mode
      const choice = answerIndex >= 0 ? currentQuestion.content.answerOptions[answerIndex] : null;
      const correct = choice ? currentQuestion.content.correct_answer.includes(choice) : false;

      if (correct) soundManager.playCorrect();
      else soundManager.playWrong();

      setLastRoundResult({ playerCorrect: correct, opponentCorrect: true });
      setShowResult(true);

      setTimeout(() => {
        setShowResult(false);
        setLastRoundResult(null);
        setSelectedAnswer(undefined);
        if (retakeIndex < questions.length - 1) {
          setRetakeIndex((prev) => prev + 1);
        } else {
          toast({
            title: "Practice Complete! 🎯",
            description: "You finished retaking your missed questions.",
          });
          setRetakeIds(null);
          setGameState("gameover");
        }
      }, 2200);
    } else if (isSolo) {
      // Solo Practice Mode
      const choice = answerIndex >= 0 ? currentQuestion.content.answerOptions[answerIndex] : null;
      const correct = choice ? currentQuestion.content.correct_answer.includes(choice) : false;

      if (correct) soundManager.playCorrect();
      else soundManager.playWrong();

      const newScore = playerScore + (correct ? 1 : 0);
      setPlayerScore(newScore);
      setLastRoundResult({ playerCorrect: correct, opponentCorrect: true });
      setShowResult(true);

      setTimeout(() => {
        setShowResult(false);
        setLastRoundResult(null);
        setSelectedAnswer(undefined);
        if (safeIndex < questions.length - 1) {
          nextQuestion(roomCode, safeIndex + 1);
        } else {
          setGameState("gameover");
          finishGame(roomCode);
        }
      }, 2200);
    } else {
      // Multiplayer / Bot Duel Mode
      submitAnswer(roomCode, answerIndex);
    }
  };

  const handlePlayAgain = () => {
    setSelectedAnswer(undefined);
    setPlayerScore(0);
    setOpponentScore(0);
    processedQuestionRef.current = -1;
    setRetakeIds(null);
    setRetakeIndex(0);

    if (isSolo || isBotGame) {
      if (setScores && roomCode) {
        const resetObj: Record<string, number> = { [playerId]: 0 };
        if (isBotGame) resetObj["sat_bot"] = 0;
        setScores(roomCode, resetObj);
      }
      nextQuestion(roomCode, 0);
      setGameState("playing");
    } else {
      rematch(roomCode);
    }
  };

  const handleNewRoom = () => {
    if (roomCode) {
      leaveRoom(roomCode);
    }
    setSelectedAnswer(undefined);
    setPlayerScore(0);
    setOpponentScore(0);
    processedQuestionRef.current = -1;
    setRetakeIds(null);
    setRetakeIndex(0);
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

  // Sound Toggle
  const toggleSound = () => {
    const next = soundManager.toggleSound();
    setSoundOn(next);
  };

  // 1. Password Lock Screen with Instant Access Options
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 home-container">
        <Card className="w-full max-w-md neon-container terminal-panel backdrop-blur-xl border border-zinc-800 bg-zinc-950/85">
          <CardContent className="p-6 text-center space-y-5">
            <div className="flex justify-center mb-1">
              <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center cyber-outline border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Key className="w-7 h-7 text-emerald-400" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black neon-heading text-emerald-400">SAT DUEL ACCESS</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Enter today's code, or tap Quick Access to play immediately
              </p>
            </div>

            {/* Quick Access Primary Button */}
            <div className="pt-1">
              <Button
                onClick={handleQuickUnlock}
                size="lg"
                className="w-full h-12 text-sm font-bold neon-hover shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Quick Play / Instant Access
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">or daily code</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Daily Code Auto-fill Button */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs">
              <div className="text-left">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Today's Code</span>
                <span className="font-mono font-bold text-emerald-400 text-sm tracking-wider">{todayCode}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPasswordInput(todayCode);
                  unlockWithPassword(todayCode);
                }}
                className="text-xs h-8 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Auto-fill & Enter
              </Button>
            </div>

            {/* Manual Pin Entry */}
            <div className="space-y-3">
              <div className="terminal-input-wrapper max-w-[200px] mx-auto">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const ok = unlockWithPassword(passwordInput);
                      if (!ok) toast({ title: "Incorrect password", variant: "destructive" });
                    }
                  }}
                  placeholder="0000"
                  className="mx-auto text-center font-mono tracking-widest text-lg bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  onClick={() => {
                    const ok = unlockWithPassword(passwordInput);
                    if (!ok) toast({ title: "Incorrect password", variant: "destructive" });
                  }}
                  className="text-xs px-5"
                >
                  Submit Code
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPasswordInput("")}
                  className="text-xs text-zinc-500"
                >
                  Clear
                </Button>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500">
              Admin bypass code: <span className="font-mono text-zinc-400">{ADMIN_CODE}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Lobby View
  if (gameState === "lobby") {
    return <GameLobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;
  }

  // 3. Waiting Room View
  if (gameState === "waiting") {
    return (
      <WaitingRoom
        roomCode={roomCode}
        onCancel={handleCancel}
        onStartWithBot={handleSwitchToBot}
      />
    );
  }

  // 4. Game Over View
  if (gameState === "gameover") {
    return (
      <div className="py-8 space-y-4">
        <GameOver
          playerScore={playerScore}
          opponentScore={opponentScore}
          totalQuestions={questions.length}
          playerName={roomData?.names?.[playerId] || "You"}
          opponentName={isSolo ? "Target" : roomData?.names?.[opponentId || ""] || "Opponent"}
          isSolo={isSolo}
          onPlayAgain={handlePlayAgain}
          onNewRoom={handleNewRoom}
        />
        <div className="max-w-2xl mx-auto px-4">
          <Review
            questionIds={questions.map((q: any) => q.id)}
            questions={questions}
            userAnswers={userAnswers}
            onRetake={(ids) => {
              setRetakeIds(ids);
              setRetakeIndex(0);
              setSelectedAnswer(undefined);
              setShowResult(false);
              setGameState("playing");
            }}
          />
        </div>
      </div>
    );
  }

  // 5. Active Playing & Retake State
  const isWaitingOnOpponent =
    !isRetake &&
    !isSolo &&
    selectedAnswer !== undefined &&
    !roomData?.answers?.[opponentId || ""];

  if (!questions || questions.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-dark py-8 flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <Card className="neon-container p-6 border border-zinc-800 bg-zinc-950/80">
            <p className="text-lg font-semibold neon-text">No questions found for this configuration.</p>
            <p className="text-xs text-zinc-400 mt-2">Try adjusting the module or difficulty selection.</p>
            <div className="mt-4">
              <Button variant="outline" className="neon-hover" onClick={handleNewRoom}>
                Back to Lobby
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const opponentDisplayName = isSolo
    ? "Target Score"
    : isBotGame
    ? roomData?.names?.["sat_bot"] || "SAT Bot 🤖"
    : roomData?.names?.[opponentId || ""] || "Opponent";

  return (
    <div className="min-h-screen bg-gradient-dark py-6 space-y-5">
      {/* Header controls: Leave Room, Sound Toggle, Mode Badge */}
      <div className="max-w-2xl mx-auto px-4 flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-300"
          onClick={handleNewRoom}
        >
          {isRetake ? "Exit Practice" : "Leave Match"}
        </Button>

        <div className="flex items-center gap-2">
          {isRetake && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-700/50 text-amber-400">
              Reviewing Missed ({safeIndex + 1}/{questions.length})
            </span>
          )}

          {isSolo && !isRetake && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-cyan-950/60 border border-cyan-700/50 text-cyan-400">
              Solo Practice
            </span>
          )}

          {isBotGame && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-700/50 text-emerald-400">
              Duel vs SAT Bot
            </span>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSound}
            className="w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-100"
            title={soundOn ? "Mute sound effects" : "Enable sound effects"}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Head-to-Head Scoreboard with Countdown Timer */}
      <ScoreBoard
        playerScore={playerScore}
        opponentScore={opponentScore}
        currentQuestion={safeIndex + 1}
        totalQuestions={questions.length}
        playerName={roomData?.names?.[playerId] || "You"}
        opponentName={opponentDisplayName}
        timeLeft={timeLeft}
        totalTime={roomData?.config?.questionTimer}
      />

      {/* Question Card */}
      <QuestionDisplay
        question={currentQuestion}
        onAnswer={handleAnswer}
        selectedAnswer={selectedAnswer}
        isWaiting={isWaitingOnOpponent}
        showExplanation={showExplanation}
        showResult={showResult}
        isCorrect={lastRoundResult?.playerCorrect ?? false}
      />

      {/* Match Chat (multiplayer & bot modes) */}
      {!isRetake && !isSolo && roomCode && (
        <div className="max-w-2xl mx-auto px-4 mt-2">
          <Chat
            roomId={roomCode}
            playerId={playerId}
            chatList={roomData?.chat || []}
            playerNames={roomData?.names}
            onSendMessage={async (text) => {
              await sendMessage(roomCode, { text });
            }}
          />
        </div>
      )}

      {/* Round Explanation (visible after round if selected) */}
      {showExplanation && currentQuestion.content.rationale && (
        <div className="max-w-2xl mx-auto px-4 mt-3 animate-fadeIn">
          <Card className="neon-container border border-zinc-800 bg-zinc-950/80">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2 neon-text text-emerald-400">Explanation:</h3>
              <div
                className="prose prose-sm max-w-none question-content text-zinc-300"
                dangerouslySetInnerHTML={{ __html: currentQuestion.content.rationale }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
