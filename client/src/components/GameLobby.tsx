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
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

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

  const handleCreateRoom = () => {
    const code = roomCode || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setError("");
    const config: { 
      modules?: string[];
      difficulties?: string[];
      numQuestions?: number;
      skills?: string[];
    } = {};
    if (selectedModules.length > 0) config.modules = selectedModules;
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold tracking-tight">SAT Duel</CardTitle>
          <CardDescription className="text-base">
            Compete. Learn. Win.
          </CardDescription>
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
                  {["math", "reading", "writing"].map(module => (
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
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Difficulty</label>
                <div className="space-y-1">
                  {[
                    { value: "E", label: "Easy" },
                    { value: "M", label: "Medium" },
                    { value: "H", label: "Hard" }
                  ].map(({ value, label }) => (
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
              <label className="text-sm text-muted-foreground mb-1 block">Number of Questions</label>
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
    </div>
  );
}
