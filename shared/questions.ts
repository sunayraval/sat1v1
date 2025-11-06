import { Question } from "./schema";
import questionsData from "./questions.json";

// Load questions from JSON file
// To update questions: edit shared/questions.json
export const satQuestions: Question[] = questionsData as Question[];
