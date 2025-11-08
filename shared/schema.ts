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
  module: z.enum(["math", "reading", "writing"]),
  difficulty: z.enum(["E", "M", "H"]).optional(), // Easy, Medium, Hard
  skill_desc: z.string(),
  content: z.object({
    stem: z.string(),
    answerOptions: z.array(z.string()),
    correct_answer: z.array(z.string()),
    rationale: z.string().optional(),
  }),
});

export type Question = z.infer<typeof questionSchema>;

// Game room schema
export const gameRoomSchema = z.object({
  roomId: z.string(),
  currentQuestion: z.number(),
  started: z.boolean(),
  players: z.array(z.string()),
  // optional room configuration chosen by the creator
  config: z
    .object({
      modules: z.array(z.enum(["math", "reading", "writing"])).optional(),
      difficulties: z.array(z.enum(["E", "M", "H"])).optional(),
      numQuestions: z.number().min(1).optional(),
      skills: z.array(z.string()).optional(),
    })
    .optional(),
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
