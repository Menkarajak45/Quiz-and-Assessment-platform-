import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatMinutes, difficultyColor, difficultyLabel } from '../../utils/format';

export default function QuizDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  useEffect(() => {
    api
      .get(`/quizzes/${id}`)
      .then((res) => setQuiz(res.data.quiz))
      .catch(() => setError('Quiz not found or unavailable'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStart = async () => {
    setStarting(true);
    setStartError('');
    try {
      const res = await api.post('/attempts', { quizId: Number(id) });
      const attempt = res.data.attempt;
      localStorage.setItem(
        `quiz_attempt_${attempt.id}`,
        JSON.stringify({
          id: attempt.id,
          quizId: attempt.quizId,
          startedAt: attempt.startedAt,
          durationMinutes: attempt.durationMinutes,
          questions: attempt.questions,
        })
      );
      navigate(`/attempt/${attempt.id}`);
    } catch (err) {
      setStartError(getErrorMessage(err));
      setStarting(false);
    }
  };

  if (loading) return <Spinner />;
  if (error || !quiz) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <p className="text-4xl mb-3">😕</p>
        <h2 className="text-xl mb-2">{error}</h2>
        <button onClick={() => navigate('/quizzes')} className="btn-primary">
          Back to quizzes
        </button>
      </div>
    );
  }

  const maxScore = quiz.questions?.reduce((sum, q) => sum + q.points, 0) || 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card !shadow-brutal-lg mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`badge ${difficultyColor(quiz.difficulty)}`}>{difficultyLabel(quiz.difficulty)}</span>
          <span className="badge bg-[#e0f0ff]">{quiz.category_name || 'Uncategorized'}</span>
          <span className="badge bg-white">⏱ {formatMinutes(quiz.duration_minutes)}</span>
          <span className="badge bg-[#f0ecdf]">{quiz.question_count} questions</span>
        </div>

        <h1 className="text-3xl mb-3">{quiz.title}</h1>
        <p className="mb-6">{quiz.description || 'No description provided.'}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-[#f0ecdf] border-2 border-[#1e1e1e]/20 text-center">
            <p className="text-2xl font-display font-extrabold">{quiz.question_count}</p>
            <p className="text-xs font-bold">Questions</p>
          </div>
          <div className="p-3 rounded-xl bg-[#f0ecdf] border-2 border-[#1e1e1e]/20 text-center">
            <p className="text-2xl font-display font-extrabold">{formatMinutes(quiz.duration_minutes)}</p>
            <p className="text-xs font-bold">Time</p>
          </div>
          <div className="p-3 rounded-xl bg-[#f0ecdf] border-2 border-[#1e1e1e]/20 text-center">
            <p className="text-2xl font-display font-extrabold">{maxScore}</p>
            <p className="text-xs font-bold">Total points</p>
          </div>
          <div className="p-3 rounded-xl bg-[#f0ecdf] border-2 border-[#1e1e1e]/20 text-center">
            <p className="text-2xl font-display font-extrabold">{quiz.pass_percentage}%</p>
            <p className="text-xs font-bold">Pass mark</p>
          </div>
        </div>

        <button onClick={() => setConfirming(true)} className="btn-success w-full !shadow-brutal text-base py-3">
          Start quiz
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card max-w-md w-full !shadow-brutal-lg">
            <h2 className="text-2xl mb-2">Ready? 🚀</h2>
            <p className="text-sm mb-1">
              <strong>{quiz.title}</strong> has {quiz.question_count} questions and a{' '}
              <strong>{formatMinutes(quiz.duration_minutes)}</strong> time limit.
            </p>
            <p className="text-sm mb-4">The timer starts as soon as you begin. You can't pause it — good luck!</p>
            {startError && (
              <div className="mb-4 p-3 rounded-xl bg-[#ff6b6b]/15 border-2 border-[#ff6b6b] text-sm font-bold">
                {startError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} className="btn-secondary flex-1" disabled={starting}>
                Not yet
              </button>
              <button onClick={handleStart} className="btn-success flex-1 !shadow-brutal" disabled={starting}>
                {starting ? 'Starting…' : 'Begin quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
