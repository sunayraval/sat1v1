/*
  questions.ts

  Clean, single-responsibility module that imports the raw
  questions JSON and exports a typed array of Question objects
  matching the `Question` type from `shared/schema.ts`.
*/
import { Question } from "./schema";
import rawQuestionsData from "./questions.json";

interface RawQuestion {
  content: {
    stem: string;
    answerOptions?: string[];
    correct_answer?: string[];
    keys?: string[];
    rationale?: string;
  };
  module?: string;
  difficulty?: string;
  skill_desc?: string;
  [k: string]: any;
}

function transformQuestion(id: string, raw: RawQuestion): Question | null {
  if (!raw?.content?.stem) return null;

  let answerOptions = raw.content.answerOptions && raw.content.answerOptions.length
    ? raw.content.answerOptions
    : [];

  let correct_answer = raw.content.correct_answer && raw.content.correct_answer.length
    ? raw.content.correct_answer
    : raw.content.keys && raw.content.keys.length
      ? raw.content.keys
      : [];

  // If still no answerOptions but we have keys, use keys as options
  if (answerOptions.length === 0 && raw.content.keys?.length) {
    answerOptions = raw.content.keys;
  }

  if (answerOptions.length === 0) return null; // skip free-response items

  return {
    id,
    module: (raw.module?.toLowerCase() as any) || "math",
    difficulty: (raw.difficulty as any) || "M",
    skill_desc: raw.skill_desc || "",
    content: {
      stem: raw.content.stem,
      answerOptions,
      correct_answer,
      rationale: raw.content.rationale || ""
    }
  } as Question;
}

export const satQuestions: Question[] = Object.entries(rawQuestionsData as Record<string, RawQuestion>)
  .map(([id, raw]) => transformQuestion(id, raw))
  .filter((q): q is Question => q !== null);
