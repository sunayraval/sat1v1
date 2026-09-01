/*
  GameLobby.tsx

  Small presentational component used as the initial lobby screen.
  Responsibilities:
  - Allow the user to enter a room code or generate one
  - Trigger `onCreateRoom` or `onJoinRoom` callbacks passed from the
    parent (Home.tsx). This component does not know about Firebase.

  Keep changes here light-weight — the heavy lifting is in Home.tsx and
  useGameRoom hook which perform the network/database work.
*/
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameLobbyProps {
  onCreateRoom: (roomCode: string, config?: { 
    modules?: string[];
    difficulties?: string[];
    numQuestions?: number;
    skills?: string[];
    roomName?: string;
    isPrivate?: boolean;
    password?: string;
    maxPlayers?: number;
  }) => void;
  onJoinRoom: (roomCode: string) => void;
}

export default function GameLobby({ onCreateRoom, onJoinRoom }: GameLobbyProps) {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [roomName, setRoomName] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [roomPassword, setRoomPassword] = useState<string>("");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);

  const { toast } = useToast();

  // Fetch supported modules from the API instead of loading the 25MB question bank
  const [supportedModules, setSupportedModules] = useState<string[]>(["math", "english"]);
  useEffect(() => {
    fetch("/api/questions/modules")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setSupportedModules(data); })
      .catch(() => { /* keep defaults */ });
  }, []);

  const handleCreateRoom = () => {
    const code = roomCode || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setError("");
    const config: { 
      modules?: string[];
      difficulties?: string[];
      numQuestions?: number;
      skills?: string[];
      roomName?: string;
      isPrivate?: boolean;
      password?: string;
      maxPlayers?: number;
    } = {};
    // Validate selected modules: do not allow creating rooms with unsupported modules
    if (selectedModules.length > 0) {
      const invalid = selectedModules.filter(m => !supportedModules.includes(m.toLowerCase()));
      if (invalid.length > 0) {
        // show toast and stop
        toast({ title: "Unsupported module", description: `Module(s) not available: ${invalid.join(", ")}`, variant: "destructive" });
        return;
      }
      config.modules = selectedModules;
    }
    if (selectedDifficulties.length > 0) config.difficulties = selectedDifficulties;
    if (numQuestions && Number.isFinite(numQuestions)) config.numQuestions = numQuestions;
    if (roomName) config.roomName = roomName;
    if (isPrivate) {
      config.isPrivate = true;
      if (roomPassword) config.password = roomPassword;
    }
    if (maxPlayers && Number.isFinite(maxPlayers)) config.maxPlayers = maxPlayers;
    onCreateRoom(code, config);
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    setError("");
    onJoinRoom(roomCode);
  };

  const invalidSelectedModules = selectedModules.filter(m => !supportedModules.includes(m.toLowerCase()));

  // Render lobby and a live dashboard with stats from the question bank
  return (
    <div className="min-h-screen p-6 home-container">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
  <Card className="neon-container w-full terminal-panel">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center cyber-outline">
                <Trophy className="w-8 h-8" style={{ color: 'var(--cyber-primary)' }} />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight neon-heading">SAT Duel</CardTitle>
            <CardDescription className="muted">Compete. Learn. Win.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                data-testid="input-room-code"
                placeholder="Enter room code (optional)"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value);
                  setError("");
                }}
                className="h-12 text-center text-lg"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Modules</label>
                  <div className="space-y-1">
                    {supportedModules.length > 0 ? (
                      supportedModules.map((module) => (
                        <label key={module} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedModules.includes(module)}
                            onChange={(e) => {
                              setSelectedModules(prev => 
                                e.target.checked 
                                  ? [...prev, module]
                                  : prev.filter(m => m !== module)
                              );
                            }}
                          />
                          <span className="capitalize">{module}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm muted">No modules available</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Difficulty</label>
                  <div className="space-y-1">
                    {[{ value: "E", label: "Easy" }, { value: "M", label: "Medium" }, { value: "H", label: "Hard" }].map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedDifficulties.includes(value)}
                          onChange={(e) => {
                            setSelectedDifficulties(prev => 
                              e.target.checked 
                                ? [...prev, value]
                                : prev.filter(d => d !== value)
                            );
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm muted mb-1 block">Number of Questions</label>
                <input
                  type="number"
                  min={1}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-28 rounded-md border px-2 py-2 text-center"
                  data-testid="input-num-questions"
                />
              </div>
              <div className="mt-3">
                <label className="text-sm muted mb-1 block">Room name (optional)</label>
                <input value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full rounded-md border px-2 py-2" placeholder="Fun Room Name" />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  <span className="text-sm">Private room</span>
                </label>
                {isPrivate && (
                  <input value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="Password (optional)" className="w-40 rounded-md border px-2 py-2" />
                )}
              </div>
              <div className="mt-3">
                <label className="text-sm muted mb-1 block">Max players</label>
                <input type="number" min={2} max={16} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="w-28 rounded-md border px-2 py-2 text-center" />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center" data-testid="text-error">
                  {error}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                data-testid="button-create-room"
                onClick={handleCreateRoom}
                size="lg"
                className="h-12"
                disabled={invalidSelectedModules.length > 0}
              >
                Create Room
              </Button>
              <Button
                data-testid="button-join-room"
                onClick={handleJoinRoom}
                variant="outline"
                size="lg"
                className="h-12 btn-join"
              >
                Join Room
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right column: dashboard */}
  <Card className="neon-container w-full p-4 terminal-panel">
          <CardHeader>
            <CardTitle className="text-lg neon-heading">Question Bank Overview</CardTitle>
            <CardDescription className="muted text-sm">Available modules and difficulty levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Available Modules</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {supportedModules.map((m) => (
                    <span key={m} className="px-2 py-1 rounded badge-accent text-sm capitalize">{m}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Difficulty Levels</p>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-1 rounded badge-accent text-sm">Easy</span>
                  <span className="px-2 py-1 rounded badge-accent text-sm">Medium</span>
                  <span className="px-2 py-1 rounded badge-accent text-sm">Hard</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">How it works</p>
                <p className="text-sm mt-1 muted">Create a room, share the code, and duel against a friend on SAT-style questions!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
