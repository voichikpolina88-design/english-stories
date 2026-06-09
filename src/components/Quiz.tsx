import { RotateCcw } from "lucide-react";
import type { QuizQuestion } from "../types";

type QuizProps = {
  questions: QuizQuestion[];
  selectedAnswers: Record<number, string>;
  isSubmitted: boolean;
  onAnswer: (questionIndex: number, answer: string) => void;
  onSubmit: () => void;
  onReset: () => void;
};

export function Quiz({
  questions,
  selectedAnswers,
  isSubmitted,
  onAnswer,
  onSubmit,
  onReset,
}: QuizProps) {
  const score = questions.reduce(
    (total, question, index) => total + (selectedAnswers[index] === question.answer ? 1 : 0),
    0,
  );
  const answeredCount = Object.keys(selectedAnswers).length;

  if (isSubmitted) {
    return (
      <section className="quiz-section" aria-labelledby="quiz-result-title">
        <div className="result-screen">
          <span className="score-pill">
            {score}/{questions.length}
          </span>
          <h2 id="quiz-result-title">Quiz result</h2>
          <p>
            {score >= 4
              ? "Great work. You understood the story clearly."
              : "Good practice. Read the story again and try once more."}
          </p>
          <button className="secondary-button" type="button" onClick={onReset}>
            <RotateCcw size={17} aria-hidden="true" />
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="quiz-section" aria-labelledby="quiz-title">
      <div className="section-heading">
        <span>Practice</span>
        <h2 id="quiz-title">Quiz</h2>
      </div>

      <div className="question-list">
        {questions.map((question, questionIndex) => (
          <fieldset className="question-card" key={question.question}>
            <legend>
              {questionIndex + 1}. {question.question}
            </legend>
            <div className="answer-grid">
              {question.options.map((option) => (
                <label
                  className={selectedAnswers[questionIndex] === option ? "answer-option selected" : "answer-option"}
                  key={option}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    value={option}
                    checked={selectedAnswers[questionIndex] === option}
                    onChange={() => onAnswer(questionIndex, option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <button
        className="submit-button"
        type="button"
        disabled={answeredCount < questions.length}
        onClick={onSubmit}
      >
        Check answers
      </button>
    </section>
  );
}
