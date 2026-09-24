import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

interface ReviewProps {
  questionIds: string[];
  questions: any[]; // Full question objects from roomData
  userAnswers: Record<string, number>;
  onRetake: (ids: string[]) => void;
}

export const Review: React.FC<ReviewProps> = ({
  questionIds,
  questions,
  userAnswers,
  onRetake,
}) => {
  const [expandedRationale, setExpandedRationale] = useState<Record<string, boolean>>({});

  // Build a lookup from the full question objects passed in
  const byId = new Map(questions.map((q: any) => [q.id, q]));
  const resolved = questionIds.map((id) => byId.get(id)).filter(Boolean) as any[];

  const wrong = resolved.filter((q) => {
    const ua = userAnswers[q.id];
    if (ua === undefined) return true;
    const selectedOption = q.content?.answerOptions?.[ua];
    return !q.content?.correct_answer?.includes(selectedOption);
  });

  const toggleRationale = (id: string) => {
    setExpandedRationale((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card className="neon-container terminal-panel w-full border border-zinc-800 bg-zinc-950/80 mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl neon-heading">Review & Practice</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              You answered {resolved.length - wrong.length} / {resolved.length} questions correctly
            </p>
          </div>
          {wrong.length > 0 && (
            <Button
              size="sm"
              onClick={() => onRetake(wrong.map((w: any) => w.id))}
              className="neon-hover"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Retake ({wrong.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {wrong.length === 0 ? (
          <div className="text-center py-6 text-emerald-400 font-medium">
            🎉 Flawless performance! You answered every question correctly.
          </div>
        ) : (
          <div className="space-y-4">
            {wrong.map((q, idx) => {
              const ua = userAnswers[q.id];
              const selectedOption =
                typeof ua === "number" && q.content?.answerOptions?.[ua] !== undefined
                  ? q.content.answerOptions[ua]
                  : "No answer selected";
              const isExpanded = !!expandedRationale[q.id];

              return (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/50 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize text-emerald-400">
                      {q.module || "SAT"}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-zinc-400">
                      {q.difficulty === "E" ? "Easy" : q.difficulty === "H" ? "Hard" : "Medium"}
                    </Badge>
                  </div>

                  {q.content?.stimulus && (
                    <div
                      className="text-xs text-zinc-400 border-l-2 border-zinc-700 pl-3 py-1 prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: q.content.stimulus }}
                    />
                  )}

                  <div
                    className="text-sm font-medium text-zinc-200 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: q.content?.stem || "" }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded bg-red-950/30 border border-red-900/40 text-red-300 flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block text-red-400">Your Answer:</span>
                        <span
                          className="prose prose-xs dark:prose-invert inline-block"
                          dangerouslySetInnerHTML={{ __html: String(selectedOption) }}
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block text-emerald-400">Correct Answer:</span>
                        <span
                          className="prose prose-xs dark:prose-invert inline-block"
                          dangerouslySetInnerHTML={{
                            __html: q.content?.correct_answer?.join(", ") || "N/A",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {q.content?.rationale && (
                    <div className="pt-1">
                      <button
                        onClick={() => toggleRationale(q.id)}
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" /> Hide Explanation
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" /> Show Explanation
                          </>
                        )}
                      </button>
                      {isExpanded && (
                        <div
                          className="mt-2 p-3 rounded bg-zinc-950 text-xs text-zinc-300 border border-zinc-800 prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: q.content.rationale }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Review;
