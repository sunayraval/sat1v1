/*
  useGameRoom.ts

  React hook providing real-time game room state and multiplayer actions.
  Supports both:
  1. Built-in ultra-fast server WebSocket & REST API (zero setup, 100% reliable)
  2. Firebase Realtime Database (when configured and permissions are open)

  Data shape (GameRoomData):
    - currentQuestion: number
    - started: boolean
    - players: string[]
    - answers: Record<playerId, choiceIndex>
    - scores: Record<playerId, score>
    - questions: Question[]
    - names: Record<playerId, displayName>
    - chat: Array<{ text: string; sender: string; timestamp: number }>
*/
import { useState, useEffect, useCallback, useRef } from "react";
import { database, ref, set, update, onValue, get, remove } from "@/lib/firebase";

export interface GameRoomData {
  currentQuestion: number;
  started: boolean;
  gameOver?: boolean;
  players: string[];
  answers?: Record<string, number>;
  scores?: Record<string, number>;
  config?: {
    category?: "Math" | "Reading" | "Writing";
    modules?: string[];
    difficulties?: string[];
    numQuestions?: number;
    roomName?: string;
    isPrivate?: boolean;
    password?: string;
    maxPlayers?: number;
    playerName?: string;
    mode?: "duel" | "bot" | "practice";
    botDifficulty?: "E" | "M" | "H";
    questionTimer?: number;
  };
  questions?: any[];
  meta?: {
    name?: string;
    isPrivate?: boolean;
    maxPlayers?: number;
    password?: string;
  };
  names?: Record<string, string>;
  chat?: Array<{ text: string; sender: string; timestamp?: number }>;
}

export function useGameRoom(roomId: string | null, playerId: string) {
  const [roomData, setRoomData] = useState<GameRoomData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Subscribe to real-time updates for the given roomId via WebSocket and Firebase
  useEffect(() => {
    if (!roomId) {
      setRoomData(null);
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    // 1. Setup WebSocket connection to server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        ws?.send(JSON.stringify({ type: "subscribe", roomId, playerId }));
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "room_update" && msg.roomId === roomId) {
            setRoomData(msg.roomData);
            setIsConnected(true);
          }
        } catch (e) {
          // ignore parsing error
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        // ws disconnected
      };
    } catch (e) {
      // ws setup failed
    }

    // 2. Setup Firebase listener if database is available
    let fbUnsub: (() => void) | undefined;
    if (database) {
      try {
        const roomRef = ref(database, `rooms/${roomId}`);
        fbUnsub = onValue(
          roomRef,
          (snapshot) => {
            if (!isMounted) return;
            const data = snapshot.val();
            if (data) {
              setRoomData((prev) => {
                // If we already have server data, merge or take latest
                return data;
              });
              setIsConnected(true);
            }
          },
          (err) => {
            // Firebase permission denied or network error - logged cleanly
            console.debug("Firebase listener info:", err.message);
          }
        );
      } catch (err) {
        // ignore
      }
    }

    // 3. Fallback polling: fetch room data every 3 seconds if needed
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            setRoomData(data);
            setIsConnected(true);
          }
        }
      } catch (e) {
        // ignore polling error
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "unsubscribe", roomId, playerId }));
        }
        ws.close();
        wsRef.current = null;
      }
      if (fbUnsub) {
        fbUnsub();
      }
    };
  }, [roomId, playerId]);

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
    try {
      // 1. Fetch questions from the server API
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

      const roomPayload: GameRoomData = {
        currentQuestion: 0,
        started: false,
        players: [playerId],
        scores: { [playerId]: 0 },
        config: config || undefined,
        questions,
        meta: {
          name: config?.roomName || `Room ${newRoomId}`,
          isPrivate: !!config?.isPrivate,
          maxPlayers: config?.maxPlayers || 8,
          password: config?.password,
        },
        names: { [playerId]: "You" },
        chat: [],
      };

      // 2. Persist in server room manager
      const serverRes = await fetch(`/api/rooms/${newRoomId}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, config, questions }),
      });

      if (!serverRes.ok) {
        console.error("Server failed to create room");
        return false;
      }

      const createdData = await serverRes.json();
      setRoomData(createdData);
      setIsConnected(true);

      // 3. Also mirror to Firebase if available
      if (database) {
        try {
          const roomRef = ref(database, `rooms/${newRoomId}`);
          await set(roomRef, roomPayload);
        } catch (fbErr: any) {
          console.debug("Firebase mirror notice:", fbErr?.message);
        }
      }

      return true;
    } catch (error) {
      console.error("Error creating room:", error);
      return false;
    }
  }, [playerId]);

  // Join an existing room if it exists and is not full
  const joinRoom = useCallback(async (roomCode: string, opts?: { name?: string; password?: string }) => {
    try {
      // 1. Join through server room manager
      const serverRes = await fetch(`/api/rooms/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          name: opts?.name,
          password: opts?.password,
        }),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        setRoomData(data);
        setIsConnected(true);

        // Also mirror to Firebase if available
        if (database) {
          try {
            const roomRef = ref(database, `rooms/${roomCode}`);
            const snapshot = await get(roomRef);
            if (snapshot.exists()) {
              const fbData = snapshot.val();
              const players = fbData.players || [];
              if (!players.includes(playerId)) {
                await update(roomRef, {
                  players: [...players, playerId],
                  started: true,
                  scores: { ...(fbData.scores || {}), [playerId]: 0 },
                  names: { ...(fbData.names || {}), [playerId]: opts?.name || `Player ${players.length + 1}` },
                });
              }
            }
          } catch (fbErr: any) {
            console.debug("Firebase mirror notice:", fbErr?.message);
          }
        }

        return true;
      }

      // If server returned error, check Firebase as secondary
      if (database) {
        const roomRef = ref(database, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const players = data.players || [];
          if (players.includes(playerId)) return true;

          const meta = data.meta || {};
          if (meta.isPrivate && opts?.password !== meta.password) {
            return false;
          }
          if (players.length >= (meta.maxPlayers || 8)) {
            return false;
          }

          const newPlayers = [...players, playerId];
          await update(roomRef, {
            players: newPlayers,
            started: true,
            scores: { ...(data.scores || {}), [playerId]: 0 },
            names: { ...(data.names || {}), [playerId]: opts?.name || `Player ${newPlayers.length}` },
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error joining room:", error);
      return false;
    }
  }, [playerId]);

  // Set or update the current player's display name in the room
  const setPlayerName = useCallback(async (roomCode: string, name: string) => {
    try {
      await fetch(`/api/rooms/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, name }),
      });

      if (database) {
        try {
          const nameRef = ref(database, `rooms/${roomCode}/names/${playerId}`);
          await set(nameRef, String(name));
        } catch (e) {
          // ignore
        }
      }
      return true;
    } catch (error) {
      console.error("Error setting player name:", error);
      return false;
    }
  }, [playerId]);

  // Send a chat message to the room
  const sendMessage = useCallback(async (roomCode: string, message: { text: string; timestamp?: number }) => {
    try {
      await fetch(`/api/rooms/${roomCode}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.text, sender: playerId }),
      });

      if (database) {
        try {
          const roomRef = ref(database, `rooms/${roomCode}/chat`);
          const snapshot = await get(roomRef);
          const existing = snapshot.exists() ? snapshot.val() : [];
          const next = Array.isArray(existing)
            ? [...existing, { text: message.text, sender: playerId, timestamp: message.timestamp || Date.now() }]
            : [{ text: message.text, sender: playerId, timestamp: message.timestamp || Date.now() }];
          await set(roomRef, next);
        } catch (e) {
          // ignore
        }
      }
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }, [playerId]);

  // Submit the player's answer
  const submitAnswer = useCallback(async (roomCode: string, answerIndex: number) => {
    try {
      await fetch(`/api/rooms/${roomCode}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, answerIndex }),
      });

      if (database) {
        try {
          const answerRef = ref(database, `rooms/${roomCode}/answers/${playerId}`);
          await set(answerRef, answerIndex);
        } catch (e) {
          // ignore
        }
      }
      return true;
    } catch (error) {
      console.error("Error submitting answer:", error);
      return false;
    }
  }, [playerId]);

  // Move the room to a new currentQuestion and clear existing answers
  const nextQuestion = useCallback(async (roomCode: string, questionIndex: number) => {
    try {
      await fetch(`/api/rooms/${roomCode}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex }),
      });

      if (database) {
        try {
          const roomRef = ref(database, `rooms/${roomCode}`);
          await update(roomRef, {
            currentQuestion: questionIndex,
            answers: null,
          });
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error("Error moving to next question:", error);
    }
  }, []);

  // Remove the room or current player from room
  const leaveRoom = useCallback(async (roomCode: string) => {
    try {
      await fetch(`/api/rooms/${roomCode}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (database) {
        try {
          const roomRef = ref(database, `rooms/${roomCode}`);
          const snapshot = await get(roomRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            const players = data.players || [];
            if (players.length <= 1 && players.includes(playerId)) {
              await remove(roomRef);
            } else {
              await update(roomRef, {
                players: players.filter((id: string) => id !== playerId),
                [`scores/${playerId}`]: null,
                [`answers/${playerId}`]: null,
              });
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  }, [playerId]);

  // Update one or more player scores
  const setScores = useCallback(async (roomCode: string, scoresObj: Record<string, number>) => {
    try {
      await fetch(`/api/rooms/${roomCode}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: scoresObj }),
      });

      if (database) {
        try {
          const scoresRef = ref(database, `rooms/${roomCode}/scores`);
          await update(scoresRef, scoresObj);
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error("Error updating scores:", error);
    }
  }, []);

  // Signal that game has finished
  const finishGame = useCallback(async (roomCode: string) => {
    try {
      await fetch(`/api/rooms/${roomCode}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error finishing game:", error);
    }
  }, []);

  // Request rematch / reset room for a new match
  const rematch = useCallback(async (roomCode: string) => {
    try {
      await fetch(`/api/rooms/${roomCode}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error triggering rematch:", error);
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
    finishGame,
    rematch,
  };
}
