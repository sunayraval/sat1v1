/*
  useGameRoom.ts

  React hook that wraps the minimal Firebase Realtime Database operations
  used by the game. This hook provides a simple, focused API for the
  UI code in `Home.tsx` to create/join/leave rooms and to submit answers.

  Data shape (GameRoomData):
    - currentQuestion: number
    - started: boolean
    - players: string[]
    - answers: Record<playerId, choiceIndex>
    - scores: Record<playerId, score>

  Important details:
  - The hook listens with `onValue` to the `rooms/{roomId}` path and
    updates `roomData` whenever the DB changes.
  - All write operations (create/join/submit/next/leave) are performed
    against the same `rooms/{roomId}` path.
  - Errors are logged to console for visibility during development.
*/
import { useState, useEffect, useCallback } from "react";
import { database, ref, set, update, onValue, get, remove } from "@/lib/firebase";

interface GameRoomData {
  currentQuestion: number;
  started: boolean;
  players: string[];
  answers?: Record<string, number>;
  scores?: Record<string, number>;
  config?: {
    // allow either a legacy single-category or the new multi-module config
    category?: "Math" | "Reading" | "Writing";
    modules?: Array<"math" | "reading" | "writing">;
    difficulties?: Array<"E" | "M" | "H">;
    numQuestions?: number;
  };
  questions?: any[];  // Full question objects stored by createRoom
}

export function useGameRoom(roomId: string | null, playerId: string) {
  const [roomData, setRoomData] = useState<GameRoomData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to realtime updates for the given roomId.
  useEffect(() => {
    if (!roomId || !database) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    let cleanupFn: (() => void) | undefined;

    const setupRoom = async () => {
      try {
        // Subscribe to room changes
        const unsub = onValue(roomRef, (snapshot) => {
          const data = snapshot.val();
          setRoomData(data);
          setIsConnected(true);
        });

        // Setup cleanup handlers
        await update(roomRef, {
          [`cleanup/${playerId}`]: {
            timestamp: Date.now(),
            actions: {
              players: playerId,
              scores: playerId,
              answers: playerId
            }
          }
        });

        cleanupFn = () => {
          unsub();
          void update(roomRef, {
            [`cleanup/${playerId}`]: null
          });
        };
      } catch (error) {
        console.error("Error setting up room:", error);
        setIsConnected(false);
      }
    };

    void setupRoom();

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [roomId]);

  // Create a new room with the current player as the first participant
  const createRoom = useCallback(async (newRoomId: string, config?: {
    modules?: string[];
    difficulties?: string[];
    numQuestions?: number;
    skills?: string[];
    roomName?: string;
    isPrivate?: boolean;
    password?: string;
    maxPlayers?: number;
  }) => {
    if (!database) return false;

    try {
      const roomRef = ref(database, `rooms/${newRoomId}`);

      // Fetch questions from the server API instead of bundling the 25MB JSON
      const params = new URLSearchParams();
      if (config?.modules && config.modules.length > 0) {
        params.set("modules", config.modules.join(","));
      }
      if (config?.difficulties && config.difficulties.length > 0) {
        params.set("difficulties", config.difficulties.join(","));
      }
      params.set("limit", String(config?.numQuestions || 10));

      const response = await fetch(`/api/questions/random?${params.toString()}`);
      if (!response.ok) {
        console.error("Failed to fetch questions from API");
        return false;
      }

      const questions = await response.json();
      if (!Array.isArray(questions) || questions.length === 0) {
        console.error("No questions available for selected criteria");
        return false;
      }

      // Store full question objects in Firebase so clients don't need the 25MB file
      const roomPayload: any = {
        currentQuestion: 0,
        started: false,
        players: [playerId],
        scores: { [playerId]: 0 },
        config: config || undefined,
        questions: questions,
        meta: {
          name: config?.roomName || `Room ${newRoomId}`,
          isPrivate: !!config?.isPrivate,
          maxPlayers: config?.maxPlayers || 8,
        },
        names: { [playerId]: "You" },
        chat: [],
      };

      if (config?.isPrivate && config?.password) {
        roomPayload.meta.password = String(config.password);
      }

      await set(roomRef, roomPayload);

      return true;
    } catch (error) {
      console.error("Error creating room:", error);
      return false;
    }
  }, [playerId]);

  // Join an existing room if it exists and is not full
  const joinRoom = useCallback(async (roomCode: string, opts?: { name?: string; password?: string }) => {
    if (!database) {
      console.error("Firebase not initialized");
      return false;
    }

    try {
      const roomRef = ref(database, `rooms/${roomCode}`);
      const snapshot = await get(roomRef);
      
      if (!snapshot.exists()) {
        return false;
      }

      const data = snapshot.val();
      const players = data.players || [];

      if (players.includes(playerId)) {
        // already joined
        return true;
      }

      // enforce privacy / password if set
      const meta = data.meta || {};
      if (meta.isPrivate) {
        const expected = meta.password;
        const provided = opts?.password;
        if (!provided || String(provided) !== String(expected)) {
          return false; // wrong or missing password
        }
      }

      const maxPlayers = meta.maxPlayers || 8;
      if (players.length >= maxPlayers) {
        return false; // full
      }

      // add the player to arrays/maps
      const newPlayers = [...players, playerId];
      const newScores = { ...(data.scores || {}), [playerId]: 0 };
      const newNames = { ...(data.names || {}), [playerId]: opts?.name || `Player ${newPlayers.length}` };

      await update(roomRef, {
        players: newPlayers,
        started: true,
        scores: newScores,
        names: newNames,
      });

      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      return false;
    }
  }, [playerId]);

  // Set or update the current player's display name in the room
  const setPlayerName = useCallback(async (roomCode: string, name: string) => {
    if (!database) return false;

    try {
      const nameRef = ref(database, `rooms/${roomCode}/names/${playerId}`);
      await set(nameRef, String(name));
      return true;
    } catch (error) {
      console.error("Error setting player name:", error);
      return false;
    }
  }, [playerId]);

  // Send a chat message to the room (appends to a 'chat' list)
  const sendMessage = useCallback(async (roomCode: string, message: { text: string; timestamp?: number }) => {
    if (!database) return false;

    try {
      const roomRef = ref(database, `rooms/${roomCode}/chat`);
      const snapshot = await get(roomRef);
      const existing = snapshot.exists() ? snapshot.val() : [];
      const next = Array.isArray(existing) ? [...existing, { text: message.text, sender: playerId, timestamp: message.timestamp || Date.now() }] : [{ text: message.text, sender: playerId, timestamp: message.timestamp || Date.now() }];
      await set(roomRef, next);
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }, [playerId]);

  // Submit the player's answer to the room's 'answers' map
  const submitAnswer = useCallback(async (roomCode: string, answerIndex: number) => {
    if (!database) return false;

    try {
      const answerRef = ref(database, `rooms/${roomCode}/answers/${playerId}`);
      await set(answerRef, answerIndex);
      return true;
    } catch (error) {
      console.error("Error submitting answer:", error);
      return false;
    }
  }, [playerId]);

  // Move the room to a new currentQuestion and clear existing answers
  const nextQuestion = useCallback(async (roomCode: string, questionIndex: number) => {
    if (!database) return;

    try {
      const roomRef = ref(database, `rooms/${roomCode}`);
      await update(roomRef, {
        currentQuestion: questionIndex,
        answers: null,
      });
    } catch (error) {
      console.error("Error moving to next question:", error);
    }
  }, []);

  // Remove the room entirely (used for cleanup on cancel/leave)
  const leaveRoom = useCallback(async (roomCode: string) => {
    if (!database) return;

    try {
      // Remove player from the room first
      const roomRef = ref(database, `rooms/${roomCode}`);
      const snapshot = await get(roomRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const players = data.players || [];
        
        if (players.length === 1 && players.includes(playerId)) {
          // Last player leaving, remove the entire room
          await remove(roomRef);
        } else {
          // Just remove this player
          await update(roomRef, {
            players: players.filter((id: string) => id !== playerId),
            [`scores/${playerId}`]: null,
            [`answers/${playerId}`]: null,
          });
        }
      }
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  }, [playerId]);

  // Update one or more player scores (merges into the existing scores map)
  const setScores = useCallback(async (roomCode: string, scoresObj: Record<string, number>) => {
    if (!database) return;

    try {
      const scoresRef = ref(database, `rooms/${roomCode}/scores`);
      await update(scoresRef, scoresObj);
    } catch (error) {
      console.error("Error updating scores:", error);
    }
  }, []);

  return {
    roomData,
    isConnected,
    createRoom,
    joinRoom,
    submitAnswer,
    nextQuestion,
    leaveRoom,
    setScores,
    setPlayerName,
    sendMessage,
  };
}
