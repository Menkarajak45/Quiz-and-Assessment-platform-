import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatDate, formatDuration } from '../../utils/format';

export default function ResultPage() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/attempts/${attemptId}`)
      .then((res) => setAttempt(res.data.attempt))
      .catch(() => setError('Could not load this result.'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <Spinner />;
  if (error || !attempt) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <p className="text-4xl mb-3">😕</p>
        <h2 className="text-xl mb-2">{error}</h2>
        <Link to="/history" className="btn-primary">Back to history</Link>
      </div>
    );
  }

  const percent = attempt.max_score > 0
    ? Math.round((attempt.score / attempt.max_score) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Result banner */}
      <div className={`card !shadow-brutal-lg text-center py-8 ${attempt.passed ? 'bg-[#6bcb77]' : 'bg-[#ff6b6b]'}`}>
        <p className="text-5xl mb-2">{attempt.passed ? '🎉' : '💪'}</p>
        <h1 className="text-3xl mb-1">{attempt.passed ? 'You passed!' : 'Not this time'}</h1>
        <p className="text-sm mb-5 opacity-80">{attempt.quiz_title}</p>

        <div className="inline-block bg-white rounded-2xl border-[3px] border-[#1e1e1e] shadow-brutal px-8 py-4">
          <p className="text-5xl font-display font-extrabold">{percent}%</p>
          <p className="text-xs font-bold mt-1">{attempt.score} / {attempt.max_score} points</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 max-w-md mx-auto">
          <div className="bg-white/90 rounded-xl border-2 border-[#1e1e1e]/30 p-2">
            <p className="font-display font-extrabold text-lg">{attempt.correct_answers}/{attempt.total_questions}</p>
            <p className="text-[11px] font-bold">Correct</p>
          </div>
          <div className="bg-white/90 rounded-xl border-2 border-[#1e1e1e]/30 p-2">
            <p className="font-display font-extrabold text-lg">{formatDuration(attempt.time_taken_seconds)}</p>
            <p className="text-[11px] font-bold">Time taken</p>
          </div>
          <div className="bg-white/90 rounded-xl border-2 border-[#1e1e1e]/30 p-2">
            <p className="font-display font-extrabold text-lg">{attempt.pass_percentage}%</p>
            <p className="text-[11px] font-bold">Pass mark</p>
          </div>
          <div className="bg-white/90 rounded-xl border-2 border-[#1e1e1e]/30 p-2">
            <p className="font-display font-extrabold text-xs">{formatDate(attempt.submitted_at)}</p>
            <p className="text-[11px] font-bold">Submitted</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-5">
        <Link to="/quizzes" className="btn-primary">More quizzes</Link>
        <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
      </div>

      {/* Answer review */}
      <div className="mt-8">
        <h2 className="text-2xl mb-4">Answer review 🔍</h2>
        <div className="space-y-4">
          {attempt.answers?.map((answer, idx) => (
            <div key={answer.questionId} className="card !shadow-brutal-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-display font-bold text-base leading-snug">
                  {idx + 1}. {answer.questionText}
                </h3>
                <span className={`badge shrink-0 ${answer.isCorrect ? 'bg-[#6bcb77]' : 'bg-[#ff6b6b] text-white'}`}>
                  {answer.isCorrect ? `+${answer.points} pts` : `0 / ${answer.points} pts`}
                </span>
              </div>

              <div className="space-y-2">
                {answer.options.map((option) => {
                  const wasSelected = (answer.selectedOptionIds || []).includes(option.id);
                  const isCorrectOpt = option.isCorrect;
                  let classes = 'bg-[#f0ecdf]';
                  if (isCorrectOpt) classes = 'bg-[#6bcb77]';
                  else if (wasSelected) classes = 'bg-[#ff6b6b] text-white';

                  return (
                    <div
                      key={option.id}
                      className={`px-3 py-2 rounded-lg border-2 border-[#1e1e1e]/40 text-sm font-semibold flex items-center justify-between gap-2 ${classes}`}
                    >
                      <span>{option.optionText}</span>
                      {(isCorrectOpt || wasSelected) && (
                        <span className="text-xs font-black">
                          {isCorrectOpt ? '✓ Correct' : '✗ Your answer'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {answer.explanation && (
                <div className="mt-3 p-3 rounded-lg bg-[#e0f0ff] border-2 border-[#1e1e1e]/20 text-sm">
                  <span className="font-bold">💡 Explanation: </span>
                  {answer.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
