import React from "react";
import { satQuestions } from "@shared/questions";

interface ReviewProps {
  questionIds: string[];
  userAnswers: Record<string, number>;
  onRetake: (ids: string[]) => void;
}

export const Review: React.FC<ReviewProps> = ({ questionIds, userAnswers, onRetake }) => {
  const questions = questionIds.map((id) => satQuestions.find((q: any) => q.id === id)).filter(Boolean) as any[];
  const wrong = questions.filter((q) => {
    const ua = userAnswers[q.id];
    return ua === undefined || ua !== q.correctIndex;
  });

  return (
    <div className="review-panel">
      <h3>Review Quiz</h3>
      <p>You got {questions.length - wrong.length} / {questions.length} correct.</p>

      {wrong.length === 0 ? (
        <div className="review-empty">Great job! No wrong answers.</div>
      ) : (
        <>
          <div className="wrong-list">
            {wrong.map((q) => (
              <div key={q.id} className="wrong-item">
                <div className="question-text" dangerouslySetInnerHTML={{ __html: q.stem }} />
                <div className="your-answer">Your answer: {typeof userAnswers[q.id] === 'number' ? userAnswers[q.id] : 'No answer'}</div>
                <div className="correct-answer">Correct: {q.correctIndex}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => onRetake(wrong.map(w => w.id))}>Retake Wrong Questions</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Review;
