import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';

const STORAGE_KEY = (attemptId) => `quiz_attempt_${attemptId}`;

export default function AttemptPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submittedRef = useRef(false);

  // Load attempt from localStorage (set when starting), fall back to quiz fetch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY(attemptId));
    if (!stored) {
      setError('Attempt session not found. Please start the quiz again.');
      setLoading(false);
      return;
    }
    try {
      const data = JSON.parse(stored);
      setAttempt(data);

      api
        .get(`/quizzes/${data.quizId}`)
        .then((res) => {
          setQuestions(res.data.quiz.questions || []);
          const durationMs = data.durationMinutes * 60000;
          const elapsed = Date.now() - new Date(data.startedAt).getTime();
          setSecondsLeft(Math.max(0, Math.floor((durationMs - elapsed) / 1000)));
        })
        .catch(() => setError('Failed to load quiz questions'))
        .finally(() => setLoading(false));
    } catch {
      setError('Attempt session is corrupted. Please start the quiz again.');
      setLoading(false);
    }
  }, [attemptId]);

  // Countdown timer — auto-submits on expiry
  useEffect(() => {
    if (secondsLeft === null || secondsLeft === undefined) return;
    if (secondsLeft <= 0) {
      if (!submittedRef.current) {
        doSubmit(true);
      }
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Warn before leaving with an active attempt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const toggleOption = (questionId, optionId) => {
    setAnswers((prev) => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return prev;
      const current = prev[questionId] || [];
      if (question.questionType === 'single') {
        return { ...prev, [questionId]: [optionId] };
      }
      // multiple
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  };

  const doSubmit = async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setConfirmSubmit(false);

    const payload = questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id] || [],
    }));

    try {
      const res = await api.post(`/attempts/${attemptId}/submit`, {
        answers: payload,
        auto,
      });
      localStorage.removeItem(STORAGE_KEY(attemptId));
      navigate(`/result/${attemptId}`, { state: { result: res.data.attempt } });
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(getErrorMessage(err));
    }
  };

  const remaining = useMemo(() => {
    if (secondsLeft === null) return '--:--';
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  const lowTime = secondsLeft !== null && secondsLeft <= 60;

  if (loading) return <Spinner />;
  if (!attempt) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <p className="text-4xl mb-3">🤔</p>
        <h2 className="text-xl mb-2">{error}</h2>
        <button onClick={() => navigate('/quizzes')} className="btn-primary">
          Back to quizzes
        </button>
      </div>
    );
  }
  if (totalQuestions === 0) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <p className="text-4xl mb-3">📭</p>
        <h2 className="text-xl mb-2">This quiz has no questions.</h2>
        <button onClick={() => navigate('/quizzes')} className="btn-primary">
          Back to quizzes
        </button>
      </div>
    );
  }

  const current = questions[currentIndex];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sticky header with timer + progress */}
      <div className="sticky top-16 z-30 bg-[#f7f3e8] -mx-4 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Question {currentIndex + 1} of {totalQuestions}</p>
            <div className="w-40 sm:w-56 h-3 mt-1 rounded-full bg-white border-2 border-[#1e1e1e] overflow-hidden">
              <div
                className="h-full bg-[#6bcb77] transition-all"
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-[3px] border-[#1e1e1e] font-display font-extrabold text-xl ${
            lowTime ? 'bg-[#ff6b6b] text-white animate-pulse' : 'bg-black text-white'
          }`}>
            ⏱ {remaining}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#ff6b6b]/15 border-2 border-[#ff6b6b] text-sm font-bold">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5 mt-4">
        {/* Question */}
        <div className="card !shadow-brutal-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="badge bg-[#ffd93d]">
              {current.questionType === 'multiple' ? 'Select all that apply' : 'Single choice'}
            </span>
            <span className="badge bg-[#f0ecdf]">{current.points} pt{current.points > 1 ? 's' : ''}</span>
          </div>
          <h2 className="text-xl mb-5 leading-snug">{current.questionText}</h2>

          <div className="space-y-3">
            {current.options.map((option) => {
              const isSelected = (answers[current.id] || []).includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleOption(current.id, option.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-[3px] border-[#1e1e1e] font-semibold text-sm transition-all ${
                    isSelected
                      ? 'bg-[#ffd93d] shadow-brutal-sm -translate-y-0.5'
                      : 'bg-white hover:bg-[#f0ecdf]'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-5 h-5 mr-2 border-2 border-[#1e1e1e] text-[11px] font-black ${
                    current.questionType === 'multiple' ? 'rounded' : 'rounded-full'
                  } ${isSelected ? 'bg-[#1e1e1e] text-white' : 'bg-white'}`}>
                    {isSelected ? '✓' : ''}
                  </span>
                  {option.optionText}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation palette */}
        <div className="card h-fit !shadow-brutal-sm sticky top-40">
          <h3 className="text-lg mb-1">Questions</h3>
          <p className="text-xs mb-3">
            {answeredCount}/{totalQuestions} answered
          </p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const answered = Boolean(answers[q.id]?.length);
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-lg border-2 border-[#1e1e1e] font-display font-bold text-sm transition-colors ${
                    isCurrent
                      ? 'bg-[#1e1e1e] text-white'
                      : answered
                        ? 'bg-[#6bcb77]'
                        : 'bg-white hover:bg-[#f0ecdf]'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setConfirmSubmit(true)}
              className="btn-dark flex-1 !shadow-brutal"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit quiz'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom prev/next */}
      <div className="flex justify-between mt-5">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary"
        >
          ← Previous
        </button>
        <button
          onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
          disabled={currentIndex === totalQuestions - 1}
          className="btn-primary"
        >
          Next →
        </button>
      </div>

      {/* Submit confirmation */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card max-w-md w-full !shadow-brutal-lg">
            <h2 className="text-2xl mb-2">Submit quiz? 🏁</h2>
            <p className="text-sm mb-4">
              You've answered <strong>{answeredCount} of {totalQuestions}</strong> questions. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSubmit(false)} className="btn-secondary flex-1" disabled={submitting}>
                Keep working
              </button>
              <button onClick={() => doSubmit(false)} className="btn-success flex-1 !shadow-brutal" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
