/*
	questions.ts

	Exposes the static list of SAT-style questions consumed by the
	client. Questions are stored in JSON so they are easy to edit by
	non-programmers — to add a new question, update `shared/questions.json`.

	The file simply imports the JSON and re-exports it with the `Question`
	TypeScript type for convenience in the UI code.
*/
import { Question } from "./schema";
import questionsData from "./questions.json";

// Load questions from JSON file and transform to our Question format
export const satQuestions: Record<string, Question> = Object.entries(questionsData).reduce((acc, [id, q]: [string, any]) => {
  // Only include questions that match our schema
  if (!q?.content?.stem || !q?.content?.answerOptions) return acc;

  acc[id] = {
    id,
    module: q.module?.toLowerCase() || "math",
    difficulty: q.difficulty,
    skill_desc: q.skill_desc || "",
    content: {
      stem: q.content.stem,
      answerOptions: q.content.answerOptions || [],
      correct_answer: q.content.correct_answer || [],
      rationale: q.content.rationale
    }
  };
  return acc;
}, {} as Record<string, Question>);
