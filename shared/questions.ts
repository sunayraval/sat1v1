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

// Load questions from JSON file
// To update questions: edit shared/questions.json
export const satQuestions: Question[] = questionsData as Question[];
