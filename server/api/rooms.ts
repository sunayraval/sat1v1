/*
  server/api/rooms.ts

  In-memory game room manager and real-time WebSocket synchronization.
  Provides a zero-dependency, ultra-fast, 100% reliable room transport
  for SAT Duel so that games work seamlessly whether Firebase is
  configured or not.
*/
import { Router, type Request, type Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";

export interface GameRoomData {
  roomId: string;
  currentQuestion: number;
  started: boolean;
  gameOver?: boolean;
  players: string[];
  scores: Record<string, number>;
  answers?: Record<string, number>;
  config?: {
    modules?: string[];
    difficulties?: string[];
    numQuestions?: number;
    roomName?: string;
    isPrivate?: boolean;
    password?: string;
    maxPlayers?: number;
    playerName?: string;
    questionTimer?: number;
    mode?: "duel" | "bot" | "practice";
    botDifficulty?: "E" | "M" | "H";
  };
  questions: any[];
  meta: {
    name: string;
    isPrivate: boolean;
    maxPlayers: number;
    password?: string;
  };
  names: Record<string, string>;
  chat: Array<{ text: string; sender: string; timestamp: number }>;
}

// In-memory rooms repository
const rooms = new Map<string, GameRoomData>();

// Active WebSocket subscriptions: roomId -> Set of client sockets
const roomSubscribers = new Map<string, Set<WebSocket>>();

export function broadcastRoom(roomId: string) {
  const room = rooms.get(roomId);
  const subs = roomSubscribers.get(roomId);
  if (!subs || subs.size === 0) return;

  const payload = JSON.stringify({
    type: "room_update",
    roomId,
    roomData: room || null,
  });

  subs.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (e) {
        // ignore send errors
      }
    }
  });
}

export function setupRoomsWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    let currentRoomId: string | null = null;

    ws.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "subscribe" && typeof msg.roomId === "string") {
          const targetRoomId = msg.roomId;
          // Unsubscribe from previous room if any
          if (currentRoomId) {
            const prevSet = roomSubscribers.get(currentRoomId);
            if (prevSet) prevSet.delete(ws);
          }

          currentRoomId = targetRoomId;
          let subSet = roomSubscribers.get(targetRoomId);
          if (!subSet) {
            subSet = new Set<WebSocket>();
            roomSubscribers.set(targetRoomId, subSet);
          }
          subSet.add(ws);

          // Send current state immediately
          const current = rooms.get(targetRoomId) || null;
          ws.send(JSON.stringify({
            type: "room_update",
            roomId: targetRoomId,
            roomData: current,
          }));
        } else if (msg.type === "unsubscribe" && currentRoomId) {
          const set = roomSubscribers.get(currentRoomId);
          if (set) {
            set.delete(ws);
          }
          currentRoomId = null;
        }
      } catch (err) {
        // ignore malformed message
      }
    });

    ws.on("close", () => {
      if (currentRoomId) {
        const set = roomSubscribers.get(currentRoomId);
        if (set) {
          set.delete(ws);
        }
      }
    });
  });

  return wss;
}

const router = Router();

// GET /api/rooms/:roomId
router.get("/:roomId", (req: Request, res: Response) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  return res.json(room);
});

// POST /api/rooms/:roomId/create
router.post("/:roomId/create", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { playerId, config, questions } = req.body;

  if (!playerId || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const hostName = (config?.playerName || "Player 1").trim();
  const isPractice = config?.mode === "practice";
  const isBot = config?.mode === "bot";

  const initialPlayers = [playerId];
  const initialScores: Record<string, number> = { [playerId]: 0 };
  const initialNames: Record<string, string> = { [playerId]: hostName };

  if (isBot) {
    const botName = config?.botDifficulty === "H" ? "SAT Ace Bot 🤖" : config?.botDifficulty === "E" ? "Novice Bot 🤖" : "Scholar Bot 🤖";
    initialPlayers.push("sat_bot");
    initialScores["sat_bot"] = 0;
    initialNames["sat_bot"] = botName;
  }

  const roomData: GameRoomData = {
    roomId,
    currentQuestion: 0,
    started: isPractice || isBot,
    gameOver: false,
    players: initialPlayers,
    scores: initialScores,
    answers: {},
    config,
    questions,
    meta: {
      name: config?.roomName || `Room ${roomId}`,
      isPrivate: !!config?.isPrivate,
      maxPlayers: config?.maxPlayers || 8,
      password: config?.password,
    },
    names: initialNames,
    chat: [],
  };

  rooms.set(roomId, roomData);
  broadcastRoom(roomId);
  return res.json(roomData);
});

// POST /api/rooms/:roomId/join
router.post("/:roomId/join", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { playerId, name, password } = req.body;

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (room.players.includes(playerId)) {
    if (name) {
      room.names[playerId] = String(name).trim();
      broadcastRoom(roomId);
    }
    return res.json(room);
  }

  if (room.meta.isPrivate) {
    if (!password || String(password) !== String(room.meta.password)) {
      return res.status(403).json({ error: "Incorrect password" });
    }
  }

  if (room.players.length >= room.meta.maxPlayers) {
    return res.status(400).json({ error: "Room is full" });
  }

  const joinerName = (name || `Player ${room.players.length + 1}`).trim();
  room.players.push(playerId);
  room.scores[playerId] = 0;
  room.names[playerId] = joinerName;
  room.started = true;

  broadcastRoom(roomId);
  return res.json(room);
});

// POST /api/rooms/:roomId/answer
router.post("/:roomId/answer", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { playerId, answerIndex } = req.body;

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  if (!room.answers) room.answers = {};
  room.answers[playerId] = answerIndex;

  broadcastRoom(roomId);
  return res.json(room);
});

// POST /api/rooms/:roomId/next
router.post("/:roomId/next", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { questionIndex } = req.body;

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  room.currentQuestion = questionIndex;
  room.answers = {};

  broadcastRoom(roomId);
  return res.json(room);
});

// POST /api/rooms/:roomId/finish
router.post("/:roomId/finish", (req: Request, res: Response) => {
  const { roomId } = req.params;

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  room.gameOver = true;
  broadcastRoom(roomId);
  return res.json(room);
});

// POST /api/rooms/:roomId/rematch
router.post("/:roomId/rematch", (req: Request, res: Response) => {
  const { roomId } = req.params;

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  room.currentQuestion = 0;
  room.answers = {};
  room.gameOver = false;
  room.started = true;
  for (const pid of room.players) {
    room.scores[pid] = 0;
  }

  broadcastRoom(roomId);
  return res.json(room);
});

// POST /api/rooms/:roomId/scores
router.post("/:roomId/scores", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { scores } = req.body;

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  if (scores && typeof scores === "object") {
    room.scores = { ...room.scores, ...scores };
  }

  broadcastRoom(roomId);
  return res.json(room);
});

// POST /api/rooms/:roomId/chat
router.post("/:roomId/chat", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { text, sender } = req.body;

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  if (!Array.isArray(room.chat)) room.chat = [];
  room.chat.push({
    text: String(text || "").trim(),
    sender: String(sender || "Anonymous"),
    timestamp: Date.now(),
  });

  broadcastRoom(roomId);
  return res.json(room);
});

// POST /api/rooms/:roomId/leave
router.post("/:roomId/leave", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { playerId } = req.body;

  const room = rooms.get(roomId);
  if (!room) return res.json({ success: true });

  room.players = room.players.filter((p) => p !== playerId);
  if (room.scores) delete room.scores[playerId];
  if (room.answers) delete room.answers[playerId];
  if (room.names) delete room.names[playerId];

  // If only bot is left, delete room
  const nonBotPlayers = room.players.filter((p) => p !== "sat_bot");
  if (nonBotPlayers.length === 0) {
    rooms.delete(roomId);
  }

  broadcastRoom(roomId);
  return res.json({ success: true });
});

export default router;
