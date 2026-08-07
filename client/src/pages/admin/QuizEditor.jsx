import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const emptyQuestion = () => ({
  questionText: '',
  questionType: 'single',
  points: 1,
  explanation: '',
  options: [
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ],
});

export default function QuizEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    difficulty: 'medium',
    durationMinutes: 10,
    passPercentage: 50,
    isPublished: false,
    questions: [emptyQuestion()],
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/quizzes/${id}`)
      .then((res) => {
        const quiz = res.data.quiz;
        setForm({
          title: quiz.title || '',
          description: quiz.description || '',
          categoryId: quiz.category_id ? String(quiz.category_id) : '',
          difficulty: quiz.difficulty || 'medium',
          durationMinutes: quiz.duration_minutes || 10,
          passPercentage: quiz.pass_percentage || 50,
          isPublished: quiz.is_published,
          questions: quiz.questions?.length
            ? quiz.questions.map((q) => ({
                questionText: q.questionText,
                questionType: q.questionType,
                points: q.points,
                explanation: q.explanation || '',
                options: q.options.map((o) => ({
                  optionText: o.optionText,
                  isCorrect: o.isCorrect,
                })),
              }))
            : [emptyQuestion()],
        });
      })
      .catch(() => setError('Could not load this quiz.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateQuestion = (qIndex, key, value) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      questions[qIndex] = { ...questions[qIndex], [key]: value };
      return { ...prev, questions };
    });
  };

  const updateOption = (qIndex, oIndex, key, value) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      const question = { ...questions[qIndex] };
      const options = [...question.options];
      options[oIndex] = { ...options[oIndex], [key]: value };

      // Single-choice: only one can be correct
      if (key === 'isCorrect' && value && question.questionType === 'single') {
        options.forEach((o, i) => {
          if (i !== oIndex) options[i] = { ...options[i], isCorrect: false };
        });
      }
      question.options = options;
      questions[qIndex] = question;
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));
  };

  const removeQuestion = (qIndex) => {
    const question = form.questions[qIndex];
    if (form.questions.length === 1) {
      setError('A quiz needs at least one question.');
      return;
    }
    if (!window.confirm('Remove this question?')) return;
    if (question) {
      setError('');
    }
    setForm((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== qIndex) }));
  };

  const setCorrectOnTypeChange = (qIndex, questionType) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      const question = { ...questions[qIndex], questionType };
      let options = [...question.options];
      if (questionType === 'single') {
        const anyCorrect = options.some((o) => o.isCorrect);
        if (!anyCorrect) {
          options = options.map((o, i) => ({ ...o, isCorrect: i === 0 }));
        } else {
          const firstCorrect = options.findIndex((o) => o.isCorrect);
          options = options.map((o, i) => ({ ...o, isCorrect: i === firstCorrect }));
        }
      }
      if (questionType === 'multiple') {
        const correctCount = options.filter((o) => o.isCorrect).length;
        if (correctCount < 2) {
          options = options.map((o, i) => ({ ...o, isCorrect: i < 2 }));
        }
      }
      question.options = options;
      questions[qIndex] = question;
      return { ...prev, questions };
    });
  };

  const validate = () => {
    if (!form.title.trim()) return 'Quiz title is required';
    if (!Number.isInteger(Number(form.durationMinutes)) || Number(form.durationMinutes) < 1) {
      return 'Duration must be a positive integer';
    }
    if (Number(form.passPercentage) < 0 || Number(form.passPercentage) > 100) {
      return 'Pass percentage must be between 0 and 100';
    }
    for (let qi = 0; qi < form.questions.length; qi++) {
      const q = form.questions[qi];
      if (!q.questionText.trim()) return `Question ${qi + 1}: text is required`;
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount < 1) return `Question ${qi + 1}: select at least one correct answer`;
      if (q.questionType === 'single' && correctCount > 1) {
        return `Question ${qi + 1}: single-choice can have only one correct answer`;
      }
      if (q.questionType === 'multiple' && correctCount < 2) {
        return `Question ${qi + 1}: multiple-choice needs at least two correct answers`;
      }
      for (let oi = 0; oi < q.options.length; oi++) {
        if (!q.options[oi].optionText.trim()) {
          return `Question ${qi + 1}: option ${oi + 1} text is required`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      difficulty: form.difficulty,
      durationMinutes: Number(form.durationMinutes),
      passPercentage: Number(form.passPercentage),
      isPublished: form.isPublished,
      questions: form.questions.map((q) => ({
        questionText: q.questionText.trim(),
        questionType: q.questionType,
        points: Number(q.points) || 1,
        explanation: q.explanation.trim(),
        options: q.options.filter((o) => o.optionText.trim()).map((o) => ({
          optionText: o.optionText.trim(),
          isCorrect: !!o.isCorrect,
        })),
      })),
    };

    try {
      if (isEdit) {
        await api.put(`/quizzes/${id}`, payload);
      } else {
        await api.post('/quizzes', payload);
      }
      navigate('/admin/quizzes');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl mb-1">{isEdit ? 'Edit quiz ✏️' : 'Create quiz 🆕'}</h1>
          <p className="text-sm">{isEdit ? 'Update the quiz details and questions.' : 'Build a new quiz from scratch.'}</p>
        </div>
        <button onClick={() => navigate('/admin/quizzes')} className="btn-secondary">Cancel</button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-[#ff6b6b]/15 border-2 border-[#ff6b6b] text-sm font-bold">{error}</div>
      )}

      {/* Quiz details */}
      <div className="card !shadow-brutal-lg mb-6">
        <h2 className="text-xl mb-4">Quiz details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. JavaScript Fundamentals" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="What is this quiz about?" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={form.difficulty} onChange={(e) => setField('difficulty', e.target.value)}>
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Duration (minutes) *</label>
            <input type="number" min={1} className="input" value={form.durationMinutes} onChange={(e) => setField('durationMinutes', e.target.value)} />
          </div>
          <div>
            <label className="label">Pass percentage (%)</label>
            <input type="number" min={0} max={100} className="input" value={form.passPercentage} onChange={(e) => setField('passPercentage', e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-[#f0ecdf] border-2 border-[#1e1e1e]/20">
            <input
              type="checkbox"
              id="isPublished"
              className="w-5 h-5 accent-[#1e1e1e]"
              checked={form.isPublished}
              onChange={(e) => setField('isPublished', e.target.checked)}
            />
            <label htmlFor="isPublished" className="font-bold cursor-pointer">Publish immediately (visible to students)</label>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="card !shadow-brutal-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl">Questions ({form.questions.length})</h2>
          <button onClick={addQuestion} className="btn-primary !px-4 !py-2 text-xs">+ Add question</button>
        </div>

        <div className="space-y-6">
          {form.questions.map((question, qi) => (
            <div key={qi} className="p-4 rounded-xl border-[3px] border-[#1e1e1e] bg-white shadow-brutal-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="badge bg-[#1e1e1e] text-white">Q{qi + 1}</span>
                <button onClick={() => removeQuestion(qi)} className="btn-danger !px-3 !py-1 text-xs">
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_140px] gap-3 mb-3">
                <input
                  className="input"
                  placeholder="Question text"
                  value={question.questionText}
                  onChange={(e) => updateQuestion(qi, 'questionText', e.target.value)}
                />
                <select
                  className="input"
                  value={question.questionType}
                  onChange={(e) => setCorrectOnTypeChange(qi, e.target.value)}
                >
                  <option value="single">Single choice</option>
                  <option value="multiple">Multiple choice</option>
                </select>
                <input
                  type="number"
                  min={1}
                  className="input"
                  placeholder="Points"
                  value={question.points}
                  onChange={(e) => updateQuestion(qi, 'points', e.target.value)}
                />
              </div>

              <div className="space-y-2 mb-3">
                {question.options.map((option, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-5 h-5 shrink-0 accent-[#6bcb77]"
                      checked={option.isCorrect}
                      onChange={(e) => updateOption(qi, oi, 'isCorrect', e.target.checked)}
                      title="Mark correct"
                    />
                    <input
                      className="input"
                      placeholder={`Option ${oi + 1}`}
                      value={option.optionText}
                      onChange={(e) => updateOption(qi, oi, 'optionText', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <input
                className="input"
                placeholder="Explanation (shown in review after submission)"
                value={question.explanation}
                onChange={(e) => updateQuestion(qi, 'explanation', e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={addQuestion} className="btn-secondary">+ Add question</button>
          <button onClick={handleSave} className="btn-success !shadow-brutal" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}
