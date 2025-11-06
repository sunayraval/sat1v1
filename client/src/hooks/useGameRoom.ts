import { useState, useEffect, useCallback } from "react";
import { database, ref, set, update, onValue, get, remove } from "@/lib/firebase";

interface GameRoomData {
  currentQuestion: number;
  started: boolean;
  players: string[];
  answers?: Record<string, number>;
  scores?: Record<string, number>;
}

export function useGameRoom(roomId: string | null, playerId: string) {
  const [roomData, setRoomData] = useState<GameRoomData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!roomId || !database) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoomData(data);
        setIsConnected(true);
      } else {
        setRoomData(null);
        setIsConnected(false);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  const createRoom = useCallback(async (roomCode: string) => {
    if (!database) {
      console.error("Firebase not initialized");
      return false;
    }

    try {
      const roomRef = ref(database, `rooms/${roomCode}`);
      await set(roomRef, {
        currentQuestion: 0,
        started: false,
        players: [playerId],
        scores: { [playerId]: 0 },
      });
      return true;
    } catch (error) {
      console.error("Error creating room:", error);
      return false;
    }
  }, [playerId]);

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
        return true;
      }

      if (players.length >= 2) {
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

  const submitAnswer = useCallback(async (roomCode: string, answerIndex: number) => {
    if (!database) return;

    try {
      const answerRef = ref(database, `rooms/${roomCode}/answers/${playerId}`);
      await set(answerRef, answerIndex);
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  }, [playerId]);

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

  const leaveRoom = useCallback(async (roomCode: string) => {
    if (!database) return;

    try {
      const roomRef = ref(database, `rooms/${roomCode}`);
      await remove(roomRef);
    } catch (error) {
      console.error("Error leaving room:", error);
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
  };
}
