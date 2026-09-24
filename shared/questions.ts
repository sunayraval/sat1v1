/*
  questions.ts

  Clean, single-responsibility module that imports the raw
  questions JSON and exports a typed array of Question objects
  matching the `Question` type from `shared/schema.ts`.
*/
import { Question } from "./schema";
import rawQuestionsData from "./questions.json";

interface RawQuestion {
  content?: {
    stem?: string;
    prompt?: string;
    body?: string;
    stimulus_reference?: string;
    stimulus?: string;
    answerOptions?: Array<string | { id?: string; content?: string }>;
    correct_answer?: string[];
    keys?: string[];
    rationale?: string;
    answer?: {
      style?: string;
      choices?: Record<string, { body?: string }>;
      correct_choice?: string;
      rationale?: string;
    };
  };
  module?: string;
  difficulty?: string;
  skill_desc?: string;
  [k: string]: any;
}

function transformQuestion(id: string, raw: RawQuestion): Question | null {
  const content = raw?.content;
  if (!content) return null;

  // Accept stem, prompt, or body as the question stem
  const stemHtml = content.stem || content.prompt || content.body || "";
  if (!stemHtml) return null;

  // Normalize module to lowercase for consistent filtering
  const module = raw.module?.toLowerCase() || "math";
  const difficulty = (raw.difficulty as "E" | "M" | "H") || "M";

  let answerOptions: string[] = [];
  let correct_answer: string[] = [];
  const rationale = content.rationale || content.answer?.rationale || "";

  // Format A: content.answer.choices with a, b, c, d
  if (content.answer?.choices) {
    const choices = content.answer.choices;
    const choiceKeys = ["a", "b", "c", "d"];
    if (choiceKeys.every((k) => choices[k] && choices[k].body !== undefined)) {
      answerOptions = choiceKeys.map((k) => String(choices[k].body || "").trim());
      const correctKey = (content.answer.correct_choice || "").trim().toLowerCase();
      if (choices[correctKey]?.body !== undefined) {
        correct_answer = [String(choices[correctKey].body).trim()];
      }
    }
  } else if (content.answerOptions && content.answerOptions.length === 4) {
    // Format B: content.answerOptions array of 4 items
    let rawOptions = content.answerOptions;
    if (typeof rawOptions[0] === "object") {
      rawOptions = (rawOptions as any[]).map((opt) => opt?.content ?? String(opt));
    }
    answerOptions = (rawOptions as string[]).map((s) => {
      if (typeof s !== "string") return String(s);
      return s.replace(/^\s*[A-Da-d](?:\.|\)|:)?\s*[\r\n]+/, "").trim();
    });

    correct_answer = content.correct_answer && content.correct_answer.length
      ? content.correct_answer
      : content.keys && content.keys.length
        ? content.keys
        : [];

    if (correct_answer.length > 0 && typeof correct_answer[0] === "string" && /^[A-D]$/i.test(correct_answer[0].trim())) {
      correct_answer = correct_answer.map((label) => {
        const idx = label.trim().toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
        return answerOptions[idx] ?? label;
      });
    }
  }

  // Must have exactly 4 answer options and at least one valid correct answer
  if (answerOptions.length !== 4 || correct_answer.length === 0) return null;
  if (!answerOptions.some((opt) => correct_answer.includes(opt))) return null;

  const stimulusHtml = content.stimulus_reference ?? content.stimulus ?? (content.stem ? content.prompt : null) ?? null;

  return {
    id,
    module,
    difficulty,
    skill_desc: raw.skill_desc || "",
    content: {
      stem: String(stemHtml),
      stimulus: stimulusHtml ? String(stimulusHtml) : undefined,
      answerOptions,
      correct_answer,
      rationale,
    },
  };
}

export const satQuestions: Question[] = Object.entries(rawQuestionsData as unknown as Record<string, RawQuestion>)
  .map(([id, raw]) => transformQuestion(id, raw))
  .filter((q): q is Question => q !== null);
