import React from "react";

interface ReviewProps {
  questionIds: string[];
  questions: any[];  // Full question objects from roomData
  userAnswers: Record<string, number>;
  onRetake: (ids: string[]) => void;
}

export const Review: React.FC<ReviewProps> = ({ questionIds, questions, userAnswers, onRetake }) => {
  // Build a lookup from the full question objects passed in
  const byId = new Map(questions.map((q: any) => [q.id, q]));
  const resolved = questionIds.map((id) => byId.get(id)).filter(Boolean) as any[];

  const wrong = resolved.filter((q) => {
    const ua = userAnswers[q.id];
    if (ua === undefined) return true;
    // Check if the selected answer matches the correct answer
    const selectedOption = q.content?.answerOptions?.[ua];
    return !q.content?.correct_answer?.includes(selectedOption);
  });

  return (
    <div className="review-panel">
      <h3>Review Quiz</h3>
      <p>You got {resolved.length - wrong.length} / {resolved.length} correct.</p>

      {wrong.length === 0 ? (
        <div className="review-empty">Great job! No wrong answers.</div>
      ) : (
        <>
          <div className="wrong-list">
            {wrong.map((q) => (
              <div key={q.id} className="wrong-item">
                <div className="question-text" dangerouslySetInnerHTML={{ __html: q.content?.stem || '' }} />
                <div className="your-answer">Your answer: {typeof userAnswers[q.id] === 'number' ? q.content?.answerOptions?.[userAnswers[q.id]] || userAnswers[q.id] : 'No answer'}</div>
                <div className="correct-answer">Correct: {q.content?.correct_answer?.join(', ') || 'N/A'}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => onRetake(wrong.map((w: any) => w.id))}>Retake Wrong Questions</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Review;

