/*
  GameLobby.tsx

  Lobby screen for SAT Duel.
  Supports:
  1. Multiplayer Duel (Create / Join 4-digit room)
  2. SAT Bot Duel (Instant duel vs AI with configurable difficulty)
  3. Solo Practice (Practice at your own pace with instant feedback)
*/
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Swords, Bot, BookOpen, Clock, User, Sparkles, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type GameMode = "duel" | "bot" | "practice";

export interface GameConfig {
  modules?: string[];
  difficulties?: string[];
  numQuestions?: number;
  skills?: string[];
  roomName?: string;
  isPrivate?: boolean;
  password?: string;
  maxPlayers?: number;
  playerName?: string;
  mode?: GameMode;
  botDifficulty?: "E" | "M" | "H";
  questionTimer?: number; // seconds, 0 = unlimited
}

interface GameLobbyProps {
  onCreateRoom: (roomCode: string, config?: GameConfig) => void;
  onJoinRoom: (roomCode: string, name?: string) => void;
}

export default function GameLobby({ onCreateRoom, onJoinRoom }: GameLobbyProps) {
  // Player Display Name
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem("satDuelPlayerName") || `Player_${Math.floor(100 + Math.random() * 900)}`;
  });

  // Game Mode
  const [gameMode, setGameMode] = useState<GameMode>("duel");
  const [botDifficulty, setBotDifficulty] = useState<"E" | "M" | "H">("M");

  // Room config
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(["math", "english"]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(["E", "M", "H"]);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [questionTimer, setQuestionTimer] = useState<number>(0); // 0 = unlimited
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [roomPassword, setRoomPassword] = useState<string>("");

  const { toast } = useToast();

  // Save player name to localStorage whenever it changes
  useEffect(() => {
    if (playerName.trim()) {
      localStorage.setItem("satDuelPlayerName", playerName.trim());
    }
  }, [playerName]);

  // Fetch available modules from API
  const [supportedModules, setSupportedModules] = useState<string[]>(["math", "english"]);
  useEffect(() => {
    fetch("/api/questions/modules")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setSupportedModules(data);
      })
      .catch(() => {});
  }, []);

  const handleCreate = () => {
    const code = roomCode.trim() || Math.floor(1000 + Math.random() * 9000).toString();
    setError("");

    if (selectedModules.length === 0) {
      toast({ title: "No module selected", description: "Please select at least one module (Math or English)", variant: "destructive" });
      return;
    }

    const config: GameConfig = {
      modules: selectedModules,
      difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : ["E", "M", "H"],
      numQuestions: numQuestions || 10,
      playerName: playerName.trim() || "Player 1",
      mode: gameMode,
      botDifficulty,
      questionTimer,
      isPrivate,
      password: isPrivate ? roomPassword : undefined,
    };

    onCreateRoom(code, config);
  };

  const handleJoin = () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code to join");
      return;
    }
    setError("");
    onJoinRoom(roomCode.trim(), playerName.trim() || "Guest Player");
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 home-container flex items-center justify-center">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Lobby Configuration Panel */}
        <Card className="neon-container lg:col-span-8 terminal-panel backdrop-blur-xl border border-zinc-800 bg-zinc-950/85">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2">
              <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center cyber-outline shadow-[0_0_20px_rgba(16,185,129,0.25)] border border-emerald-500/40">
                <Trophy className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-black tracking-tight neon-heading text-emerald-400">
              SAT DUEL
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-zinc-400">
              Head-to-head SAT showdown & adaptive solo mastery
            </CardDescription>

            {/* Display Name Input */}
            <div className="max-w-xs mx-auto mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-900/80">
              <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
                placeholder="Enter your tag / name"
                className="bg-transparent text-xs font-semibold text-zinc-100 focus:outline-none w-full text-center"
                data-testid="input-player-name"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-0">
            {/* Mode Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Select Game Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGameMode("duel")}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    gameMode === "duel"
                      ? "border-emerald-500/80 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <Swords className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold">1v1 Multiplayer</span>
                  <span className="text-[10px] text-zinc-500 hidden sm:inline">Duel a friend</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode("bot")}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    gameMode === "bot"
                      ? "border-cyan-500/80 bg-cyan-950/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <Bot className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs font-bold">Duel SAT Bot</span>
                  <span className="text-[10px] text-zinc-500 hidden sm:inline">Play instantly</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode("practice")}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    gameMode === "practice"
                      ? "border-amber-500/80 bg-amber-950/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold">Solo Practice</span>
                  <span className="text-[10px] text-zinc-500 hidden sm:inline">Self-paced</span>
                </button>
              </div>
            </div>

            {/* Bot Difficulty (if in bot mode) */}
            {gameMode === "bot" && (
              <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Bot Difficulty Level
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {botDifficulty === "E" ? "Novice (50% accuracy)" : botDifficulty === "M" ? "Scholar (75% accuracy)" : "SAT Ace (90% accuracy)"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "E", label: "Novice" },
                    { id: "M", label: "Scholar" },
                    { id: "H", label: "SAT Ace" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setBotDifficulty(lvl.id as any)}
                      className={`py-1.5 text-xs font-medium rounded-md border transition-all ${
                        botDifficulty === lvl.id
                          ? "bg-cyan-500 text-zinc-950 font-bold border-cyan-400"
                          : "bg-zinc-900/60 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Multiplayer Room Code Input & Join Button (if in duel mode) */}
            {gameMode === "duel" && (
              <div className="space-y-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Room Code</label>
                  <span className="text-[10px] text-zinc-500">Leave blank to auto-generate</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    data-testid="input-room-code"
                    placeholder="Enter 4-digit code (e.g. 7421)"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8));
                      setError("");
                    }}
                    className="h-10 text-center font-mono text-base tracking-wider bg-zinc-900 border-zinc-700"
                  />
                  <Button
                    data-testid="button-join-room"
                    onClick={handleJoin}
                    variant="outline"
                    className="h-10 px-5 text-xs font-semibold border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40"
                  >
                    Join Room
                  </Button>
                </div>
                {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              </div>
            )}

            {/* Modules & Difficulty Config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Modules */}
              <div className="space-y-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">SAT Modules</label>
                <div className="flex gap-2 flex-wrap">
                  {supportedModules.map((module) => {
                    const isChecked = selectedModules.includes(module);
                    return (
                      <button
                        key={module}
                        type="button"
                        onClick={() => {
                          setSelectedModules((prev) =>
                            isChecked
                              ? prev.filter((m) => m !== module)
                              : [...prev, module]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${
                          isChecked
                            ? "border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold"
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700"
                        }`}
                      >
                        {module === "math" ? "📐 Math" : "📖 English (Reading/Writing)"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Levels */}
              <div className="space-y-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Question Difficulty</label>
                <div className="flex gap-2">
                  {[
                    { id: "E", label: "Easy" },
                    { id: "M", label: "Medium" },
                    { id: "H", label: "Hard" },
                  ].map((diff) => {
                    const isChecked = selectedDifficulties.includes(diff.id);
                    return (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => {
                          setSelectedDifficulties((prev) =>
                            isChecked
                              ? prev.length > 1
                                ? prev.filter((d) => d !== diff.id)
                                : prev
                              : [...prev, diff.id]
                          );
                        }}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          isChecked
                            ? "border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold"
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700"
                        }`}
                      >
                        {diff.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Questions Count & Timer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Question Count */}
              <div className="space-y-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quiz Length</label>
                  <span className="text-xs text-emerald-400 font-bold">{numQuestions} Questions</span>
                </div>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setNumQuestions(count)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        numQuestions === count
                          ? "border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold"
                          : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Timer */}
              <div className="space-y-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" /> Question Timer
                  </label>
                  <span className="text-xs text-emerald-400 font-bold">
                    {questionTimer === 0 ? "Unlimited" : `${questionTimer}s`}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[
                    { val: 0, label: "None" },
                    { val: 30, label: "30s" },
                    { val: 45, label: "45s" },
                    { val: 60, label: "60s" },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setQuestionTimer(t.val)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        questionTimer === t.val
                          ? "border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold"
                          : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch Action Button */}
            <div className="pt-2">
              <Button
                data-testid="button-create-room"
                onClick={handleCreate}
                size="lg"
                className="w-full h-12 text-base font-bold neon-hover shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {gameMode === "duel" && "Create Multiplayer Duel Room ⚔️"}
                {gameMode === "bot" && "Start Duel vs SAT Bot 🤖"}
                {gameMode === "practice" && "Start Solo Practice 🎯"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Live Overview & Game Tips */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="neon-container terminal-panel border border-zinc-800 bg-zinc-950/85">
            <CardHeader className="pb-3">
              <CardTitle className="text-base neon-heading flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Game Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-zinc-300">
              <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <span className="font-semibold text-emerald-400 block mb-0.5">Real-Time Head-to-Head</span>
                Answer simultaneously, watch your opponent's score pulse live, and analyze rationales after each round.
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <span className="font-semibold text-cyan-400 block mb-0.5">Instant SAT Bot Matchmaking</span>
                Don't have a partner right now? Challenge the SAT Bot with 3 difficulty levels to hone your speed and skills.
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <span className="font-semibold text-amber-400 block mb-0.5">Comprehensive Question Review</span>
                At the end of every duel, review all missed questions with detailed explanations and 1-click mistake retakes.
              </div>
            </CardContent>
          </Card>

          <Card className="neon-container terminal-panel border border-zinc-800 bg-zinc-950/85">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Active Question Bank</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Available Modules:</span>
                <span className="text-emerald-400 font-semibold">Math, Reading & Writing</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Difficulty Spectrum:</span>
                <span className="text-zinc-200">Easy • Medium • Hard</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Transport Layer:</span>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                  WebSocket Real-time
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
