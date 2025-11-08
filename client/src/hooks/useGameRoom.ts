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
  questions?: string[];
}
import { satQuestions } from "@shared/questions";

export function useGameRoom(roomId: string | null, playerId: string) {
  const [roomData, setRoomData] = useState<GameRoomData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to realtime updates for the given roomId.
  useEffect(() => {
    if (!roomId || !database) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      // Debug: log room updates to help trace white-screen runtime issues
      // (kept at debug level so it can be filtered in production logs)
      // eslint-disable-next-line no-console
      console.debug("useGameRoom: room update ->", data);
      if (data) {
        setRoomData(data);
        setIsConnected(true);
      } else {
        setRoomData(null);
        setIsConnected(false);
      }
    });

    // Clean up listener on unmount or when roomId changes
    return () => unsubscribe();
  }, [roomId]);

  // Create a new room with the current player as the first participant
  const createRoom = useCallback(async (roomCode: string, config?: { category?: string; modules?: string[]; difficulties?: string[]; numQuestions?: number }) => {
    if (!database) {
      console.error("Firebase not initialized");
      return false;
    }

    try {
      const roomRef = ref(database, `rooms/${roomCode}`);
      // If a creator provided config, select and persist the question list now so all players
      // see the same questions in the same order. Selection happens only when creating the room.
      let questionIds: string[] | undefined = undefined;
      try {
        const all = (Array.isArray(satQuestions) ? satQuestions : Object.values(satQuestions as any)) as any[];
        let filtered: any[] = all;

        const modules = config?.modules;
        const difficulties = config?.difficulties;
        const num = config?.numQuestions;

        if (modules && modules.length > 0) {
          filtered = filtered.filter((q) => modules.includes(q.module));
        }
        if (difficulties && difficulties.length > 0) {
          filtered = filtered.filter((q) => q.difficulty && difficulties.includes(q.difficulty));
        }

        // Randomize order on room creation only
        filtered = [...filtered].sort(() => Math.random() - 0.5);

        if (num && num > 0) {
          filtered = filtered.slice(0, num);
        }

        if (filtered.length > 0) {
          questionIds = filtered.map((q) => q.id);
        }
      } catch (err) {
        console.error("Error selecting questions for room:", err);
      }

      await set(roomRef, {
        currentQuestion: 0,
        started: false,
        players: [playerId],
        scores: { [playerId]: 0 },
        config: config || undefined,
        questions: questionIds || undefined,
      });
      return true;
    } catch (error) {
      console.error("Error creating room:", error);
      return false;
    }
  }, [playerId]);

  // Join an existing room if it exists and is not full
  const joinRoom = useCallback(async (roomCode: string) => {
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

      if (players.length >= 2) {
        // this simple app limits rooms to two players
        return false;
      }

      await update(roomRef, {
        players: [...players, playerId],
        started: true,
        scores: { ...data.scores, [playerId]: 0 },
      });

      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      return false;
    }
  }, [playerId]);

  // Submit the player's answer to the room's 'answers' map
  const submitAnswer = useCallback(async (roomCode: string, answerIndex: number) => {
    if (!database) return;

    try {
      const answerRef = ref(database, `rooms/${roomCode}/answers/${playerId}`);
      await set(answerRef, answerIndex);
    } catch (error) {
      console.error("Error submitting answer:", error);
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
      const roomRef = ref(database, `rooms/${roomCode}`);
      await remove(roomRef);
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  }, []);

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
  };
}
