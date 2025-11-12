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
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { satQuestions } from "@shared/questions";
import { useToast } from "@/hooks/use-toast";

interface GameLobbyProps {
  onCreateRoom: (roomCode: string, config?: { 
    modules?: string[];
    difficulties?: string[];
    numQuestions?: number;
    skills?: string[];
  }) => void;
  onJoinRoom: (roomCode: string) => void;
}

export default function GameLobby({ onCreateRoom, onJoinRoom }: GameLobbyProps) {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(10);

  const { toast } = useToast();

  // Compute supported modules from available questions so we don't offer modules with no data
  const supportedModules = useMemo(() => {
    const set = new Set<string>();
    Object.values(satQuestions).forEach((q) => set.add((q.module || "").toLowerCase()));
    return Array.from(set).filter(Boolean);
  }, []);

  const handleCreateRoom = () => {
    const code = roomCode || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setError("");
    const config: { 
      modules?: string[];
      difficulties?: string[];
      numQuestions?: number;
      skills?: string[];
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
        <Card className="neon-container w-full">
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
                className="h-12"
              >
                Join Room
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right column: dashboard */}
        <Card className="neon-container w-full p-4">
          <CardHeader>
            <CardTitle className="text-lg neon-heading">Question Bank Overview</CardTitle>
            <CardDescription className="muted text-sm">Live counts by module and difficulty</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const total = satQuestions.length;
              const byModule: Record<string, number> = {};
              const byDifficulty: Record<string, number> = { E: 0, M: 0, H: 0 };
              const bySkill: Record<string, number> = {};
              satQuestions.forEach((q) => {
                const m = (q.module || "unknown").toLowerCase();
                byModule[m] = (byModule[m] || 0) + 1;
                if (q.difficulty) byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
                if (q.skill_desc) bySkill[q.skill_desc] = (bySkill[q.skill_desc] || 0) + 1;
              });

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm muted">Total questions</p>
                      <p className="text-2xl font-bold neon-heading">{total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Modules</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {Object.entries(byModule).map(([m, cnt]) => (
                          <span key={m} className="px-2 py-1 rounded badge-accent text-sm">{m}: {cnt}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">By difficulty</p>
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-1 rounded badge-accent text-sm">Easy: {byDifficulty.E}</span>
                      <span className="px-2 py-1 rounded badge-accent text-sm">Medium: {byDifficulty.M}</span>
                      <span className="px-2 py-1 rounded badge-accent text-sm">Hard: {byDifficulty.H}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Top categories</p>
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-auto">
                      {Object.entries(bySkill).slice(0, 12).map(([skill, cnt]) => (
                        <div key={skill} className="text-sm px-2 py-1 rounded badge-accent muted">
                          <strong className="neon-heading">{skill}</strong> — {cnt}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
