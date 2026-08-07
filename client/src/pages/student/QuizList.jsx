import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import api from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatMinutes, difficultyColor, difficultyLabel } from '../../utils/format';

const CATEGORY_TAG_CLASSES = {
  Programming: 'bg-blue-100 text-blue-800',
  Math: 'bg-violet-100 text-violet-800',
  History: 'bg-amber-100 text-amber-800',
  Science: 'bg-emerald-100 text-emerald-800',
};

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    Promise.all([api.get('/quizzes'), api.get('/categories')])
      .then(([quizRes, catRes]) => {
        setQuizzes(quizRes.data.quizzes);
        setCategories(catRes.data.categories);
      })
      .catch(() => setError('Failed to load quizzes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryId) params.set('categoryId', categoryId);
    if (difficulty) params.set('difficulty', difficulty);
    const query = params.toString();

    api.get(`/quizzes${query ? `?${query}` : ''}`)
      .then((res) => setQuizzes(res.data.quizzes))
      .catch(() => setError('Failed to load quizzes'));
  }, [debouncedSearch, categoryId, difficulty]);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl mb-1">Available quizzes 📚</h1>
        <p className="text-sm">Pick a quiz, beat the clock, and climb the leaderboard.</p>
      </div>

      {/* Filters */}
      <div className="filter-panel mb-6">
        <div className="grid gap-3 lg:grid-cols-[1.9fr_1fr_1fr]">
          <label className="filter-input-group">
            <Search className="w-4 h-4" />
            <input
              className="input search-input"
              placeholder="Search quizzes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Category</span>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Difficulty</span>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#ff6b6b]/15 border-2 border-[#ff6b6b] text-sm font-bold mb-4">{error}</div>
      )}

      {quizzes.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🕵️</p>
          <h2 className="text-xl mb-1">No quizzes found</h2>
          <p className="text-sm">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              to={`/quizzes/${quiz.id}`}
              className="quiz-card group"
            >
              <div className="quiz-card-content">
                <div className="flex items-start justify-between gap-3">
                  <span className={`pill-badge ${difficultyColor(quiz.difficulty)}`}>
                    {difficultyLabel(quiz.difficulty)}
                  </span>
                  <span className="time-label">
                    <span>⏱</span>
                    {formatMinutes(quiz.duration_minutes)}
                  </span>
                </div>
                <h2 className="quiz-card-title mt-5">{quiz.title}</h2>
                <p className="quiz-card-desc">{quiz.description || 'No description available.'}</p>
                <div className="quiz-card-meta">
                  <span className={`tag-pill ${CATEGORY_TAG_CLASSES[quiz.category_name] || 'bg-slate-100 text-slate-700'}`}>
                    <span className="dot" />
                    {quiz.category_name || 'Uncategorized'}
                  </span>
                  <span className="tag-pill bg-slate-100 text-slate-700">
                    {quiz.question_count} questions
                  </span>
                </div>
                <div className="quiz-card-footer mt-auto">
                  <span className="quiz-card-action">
                    Start quiz
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
