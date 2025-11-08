/*
  schema.ts

  Zod-based schemas and TypeScript types used throughout the project.
  This file centralizes shapes for Questions, GameRooms, PlayerAnswers,
  and the game state enum so both server and client can share common
  expectations about the data.

  If you add new fields to `shared/questions.json` (for example a
  `hint` or `difficulty` property), update the `questionSchema` here
  to keep types aligned.
*/
import { z } from "zod";

// Question schema for SAT Duel
export const questionSchema = z.object({
  id: z.string(),
  module: z.string(), // Normalized to lowercase in the transformer
  difficulty: z.enum(["E", "M", "H"]), // Easy, Medium, Hard (defaults to M)
  skill_desc: z.string().optional(),
  content: z.object({
    stem: z.string(),
    // Optional stimulus/passages/images that should be shown before the stem
    stimulus: z.string().optional(),
    answerOptions: z.array(z.string()),
    correct_answer: z.array(z.string()),
    rationale: z.string().optional(),
  }),
});

export type Question = z.infer<typeof questionSchema>;

export const roomConfigSchema = z.object({
  modules: z.array(z.string()).min(1),
  difficulties: z.array(z.enum(["E", "M", "H"])).min(1),
  numQuestions: z.number().min(1).max(50).default(10),
});

export type RoomConfig = z.infer<typeof roomConfigSchema>;

// Game room schema
export const gameRoomSchema = z.object({
  roomId: z.string(),
  currentQuestion: z.number(),
  started: z.boolean(),
  players: z.array(z.string()),
  scores: z.record(z.string(), z.number()),
  answers: z.record(z.string(), z.number()).optional(),
  questions: z.array(z.string()),
  config: roomConfigSchema,
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
