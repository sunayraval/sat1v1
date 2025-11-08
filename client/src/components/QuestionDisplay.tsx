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
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { Question } from "@shared/schema";

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
        isWaiting={isWaiting}
        showExplanation={showExplanation}
  selectedAnswer,
      {showExplanation && question.content.rationale && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2">Explanation:</h3>
              <div 
                className="prose prose-sm max-w-none" 
                dangerouslySetInnerHTML={{ 
                  __html: question.content.rationale 
                }} 
              />
            </CardContent>
          </Card>
        </div>
      )}
  isWaiting = false,
  showResult = false,
  isCorrect = false,
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

  const handleSelect = (index: number) => {
    if (localSelected !== undefined || isWaiting) return;
    setLocalSelected(index);
    onAnswer(index);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex gap-2">
            <Badge variant="outline" className="w-fit capitalize" data-testid="text-module">
              {question.module}
            </Badge>
            {question.difficulty && (
              <Badge variant="outline" className="w-fit" data-testid="text-difficulty">
                {question.difficulty === 'E' ? 'Easy' : question.difficulty === 'M' ? 'Medium' : 'Hard'}
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-medium leading-relaxed" data-testid="text-question" 
              dangerouslySetInnerHTML={{ __html: question.content.stem }}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {question.content.answerOptions.map((choice, index) => {
              const isSelected = localSelected === index;
              const isCorrectAnswer = showResult && question.content.correct_answer.includes(choice);
              const isWrongAnswer = showResult && isSelected && !question.content.correct_answer.includes(choice);

              return (
                <Button
                  key={index}
                  data-testid={`button-choice-${index}`}
                  onClick={() => handleSelect(index)}
                  disabled={localSelected !== undefined || isWaiting}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-auto min-h-[4rem] p-4 justify-start text-left hover-elevate active-elevate-2 ${
                    isCorrectAnswer ? "border-2 border-green-500" : ""
                  } ${isWrongAnswer ? "border-2 border-destructive" : ""}`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Badge
                      variant={isSelected ? "secondary" : "outline"}
                      className="mt-0.5 font-bold min-w-[2rem] justify-center"
                    >
                      {CHOICE_LABELS[index]}
                    </Badge>
                    <span className="flex-1">{choice}</span>
                    {showResult && isCorrectAnswer && (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    {showResult && isWrongAnswer && (
                      <X className="w-5 h-5 text-destructive flex-shrink-0" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {isWaiting && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm" data-testid="text-waiting-opponent">
                Waiting for opponent...
              </p>
            </div>
          )}

          {showResult && (
            <div className="pt-4 border-t">
              <p
                className={`text-center font-semibold ${
                  isCorrect ? "text-green-600" : "text-destructive"
                }`}
                data-testid="text-result"
              >
                {isCorrect ? "Correct! ✓" : "Incorrect ✗"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
