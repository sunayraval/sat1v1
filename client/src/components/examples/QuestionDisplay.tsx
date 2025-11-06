import QuestionDisplay from '../QuestionDisplay';
import { satQuestions } from '@shared/questions';

export default function QuestionDisplayExample() {
  return (
    <div className="min-h-screen bg-background py-8">
      <QuestionDisplay
        question={satQuestions[0]}
        onAnswer={(index) => console.log('Selected answer:', index)}
      />
    </div>
  );
}
