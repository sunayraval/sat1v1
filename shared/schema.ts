import { z } from "zod";

// Question schema for SAT Duel
export const questionSchema = z.object({
  id: z.string(),
  question: z.string(),
  choices: z.array(z.string()).length(4),
  correct: z.number().min(0).max(3),
  category: z.enum(["Math", "Reading", "Writing"]).optional(),
});

export type Question = z.infer<typeof questionSchema>;

// Game room schema
export const gameRoomSchema = z.object({
  roomId: z.string(),
  currentQuestion: z.number(),
  started: z.boolean(),
  players: z.array(z.string()),
});

export type GameRoom = z.infer<typeof gameRoomSchema>;

// Player answer schema
export const playerAnswerSchema = z.object({
  playerId: z.string(),
  questionId: z.string(),
  answer: z.number(),
  correct: z.boolean(),
});

export type PlayerAnswer = z.infer<typeof playerAnswerSchema>;

// Game state
export type GameState = "lobby" | "waiting" | "playing" | "gameover";

// Score tracking
export interface PlayerScore {
  playerId: string;
  score: number;
  displayName?: string;
}
