/*
  QuestionDisplay.tsx

  Presents a single question and the four choices to the player.
  Responsibilities:
  - Render the question text, category badge, and four choice buttons
  - Accept a callback `onAnswer` to report the player's selection
  - Optionally display waiting state and immediate result indicators

  Important props:
  - question: the `Question` object (id, question, choices, correct)
  - onAnswer: function called with the selected choice index
  - selectedAnswer: externally-provided selected index (for syncing)
  - isWaiting: displays an animated waiting indicator while opponent answers
  - showResult / isCorrect: used to show correct/incorrect feedback
*/
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { Question } from "@shared/schema";
import { setupImageThemeDetection } from "@/lib/utils/imageTheme";
import "@/styles/neon.css";
import "@/styles/questions.css";
import "@/styles/question-display.css";

interface QuestionDisplayProps {
  question: Question;
  onAnswer: (answerIndex: number) => void;
  selectedAnswer?: number;
  isWaiting?: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
  showExplanation?: boolean;
}

const CHOICE_LABELS = ["A", "B", "C", "D"];

export default function QuestionDisplay({
  question,
  onAnswer,
  selectedAnswer,
  isWaiting = false,
  showResult = false,
  isCorrect = false,
  showExplanation = false,
}: QuestionDisplayProps) {
  const [localSelected, setLocalSelected] = useState<number | undefined>(selectedAnswer);

  // Reset local selection when selectedAnswer prop changes (e.g., new question)
  useEffect(() => {
    setLocalSelected(selectedAnswer);
  }, [selectedAnswer]);

  // Reset when question changes
  useEffect(() => {
    setLocalSelected(undefined);
  }, [question.id]);

  // Set up image theme detection when question content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setupImageThemeDetection();
    }, 100); // Small delay to ensure images are loaded
    return () => clearTimeout(timer);
  }, [question.content.stem]);

  const handleSelect = (index: number) => {
    if (localSelected !== undefined || isWaiting) return;
    setLocalSelected(index);
    onAnswer(index);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <Card className="question-container backdrop-blur-lg bg-zinc-950/70 border border-zinc-800">
        <CardHeader className="space-y-3">
          <div className="flex gap-2">
            <Badge variant="outline" className="w-fit capitalize neon-text" data-testid="text-module">
              {question.module}
            </Badge>
            {question.difficulty && (
              <Badge variant="outline" className="w-fit neon-text" data-testid="text-difficulty">
                {question.difficulty === 'E' ? 'Easy' : question.difficulty === 'M' ? 'Medium' : 'Hard'}
              </Badge>
            )}
            {isWaiting && (
              <div className="flex items-center gap-2 ml-auto">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="text-emerald-500 neon-text">Waiting...</span>
              </div>
            )}
          </div>
          <div className="question-content prose dark:prose-invert max-w-none" data-testid="text-question" 
              dangerouslySetInnerHTML={{ __html: question.content.stem }}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.content.answerOptions.map((choice, index) => {
              const isSelected = localSelected === index;
              const isCorrectAnswer = showResult && question.content.correct_answer.includes(choice);
              const isWrongAnswer = showResult && isSelected && !question.content.correct_answer.includes(choice);

              return (
                <button
                  key={index}
                  data-testid={`button-choice-${index}`}
                  onClick={() => handleSelect(index)}
                  disabled={localSelected !== undefined || isWaiting}
                  className={`answer-option ${isSelected ? 'selected' : ''} 
                    ${isCorrectAnswer ? 'correct neon-border' : ''} 
                    ${isWrongAnswer ? 'incorrect' : ''}`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Badge
                      variant={isSelected ? "secondary" : "outline"}
                      className={`mt-0.5 font-bold min-w-[2rem] justify-center ${isSelected ? 'neon-text' : ''}`}
                    >
                      {CHOICE_LABELS[index]}
                    </Badge>
                    <span className="flex-1 prose-sm question-content" dangerouslySetInnerHTML={{ __html: String(choice) }} />
                    {showResult && isCorrectAnswer && (
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    )}
                    {showResult && isWrongAnswer && (
                      <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="pt-4 border-t border-zinc-800">
              <p
                className={`text-center font-semibold ${
                  isCorrect ? "text-emerald-500 neon-text" : "text-red-500"
                }`}
                data-testid="text-result"
              >
                {isCorrect ? "Correct! ✓" : "Incorrect ✗"}
              </p>
            </div>
          )}

          {showExplanation && question.content.rationale && (
            <div className="max-w-2xl mx-auto mt-4">
              <Card className="bg-zinc-950/70 border-zinc-800">
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-2 text-emerald-500 neon-text">Explanation:</h3>
                  <div
                    className="prose prose-sm max-w-none question-content"
                    dangerouslySetInnerHTML={{ __html: question.content.rationale }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
