import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
import api from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatDate, formatDuration } from '../../utils/format';

export default function AdminAttempts() {
  const [attempts, setAttempts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quizId, setQuizId] = useState('');
  const [sort, setSort] = useState('date');
  const [direction, setDirection] = useState('desc');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api
      .get('/quizzes')
      .then((res) => setQuizzes(res.data.quizzes))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (quizId) params.set('quizId', quizId);
    if (sort) params.set('sort', sort);
    if (direction) params.set('direction', direction);
    const query = params.toString();

    api
      .get(`/attempts${query ? `?${query}` : ''}`)
      .then((res) => setAttempts(res.data.attempts))
      .catch(() => setError('Failed to load attempts'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, quizId, sort, direction]);

  if (loading) return <Spinner />;

  const toggleSort = (field) => {
    if (sort === field) {
      setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setDirection('desc');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-1">All attempts</h1>
        <p className="text-sm text-slate-600">Monitor every quiz attempt across the platform.</p>
      </div>

      <div className="card mb-6 !shadow-brutal-sm p-4">
        <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr_1fr]">
          <label className="search-box">
            <Search className="text-slate-400" />
            <input
              className="search-input"
              placeholder="Search student, email, or quiz…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">Filter quiz</p>
            <select className="input w-full" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
              <option value="">All quizzes</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">Sort by</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toggleSort('date')}
                className={`page-button ${sort === 'date' ? 'active' : ''}`}
              >
                Date
              </button>
              <button
                type="button"
                onClick={() => toggleSort('score')}
                className={`page-button ${sort === 'score' ? 'active' : ''}`}
              >
                Score
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#fee2e2] border border-[#fecaca] text-sm font-semibold mb-4 text-[#991b1b]">{error}</div>
      )}

      {attempts.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-3">🗒️</p>
          <h2 className="text-2xl font-semibold mb-2">No attempts found</h2>
          <p className="text-sm text-slate-500">Attempts will appear here as students take quizzes.</p>
        </div>
      ) : (
        <div className="table-surface">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Quiz</th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('score')}>
                      Score
                      <ArrowUpDown />
                    </button>
                  </th>
                  <th>Result</th>
                  <th>Time</th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('date')}>
                      Submitted
                      <ArrowUpDown />
                    </button>
                  </th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex flex-col gap-1">
                        <Link to={`/admin/users/${a.user_id}`} className="font-semibold text-slate-900 hover:text-[var(--primary)] transition-colors">
                          {a.user_name}
                        </Link>
                        <span className="text-xs text-slate-500 truncate">{a.user_email}</span>
                      </div>
                    </td>
                    <td className="max-w-[260px] truncate text-slate-700">{a.quiz_title}</td>
                    <td className="font-semibold text-slate-900">
                      {a.score}/{a.max_score}
                      <span className="ml-2 text-xs text-slate-500">({a.percent}%)</span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${a.passed ? 'pill-pass' : 'pill-fail'}`}>
                        {a.passed ? 'Passed' : 'Failed'}
                        {a.auto_submitted && <span title="Auto-submitted on timer">⏰</span>}
                      </span>
                    </td>
                    <td className="time-cell">{formatDuration(a.time_taken_seconds)}</td>
                    <td>{formatDate(a.submitted_at)}</td>
                    <td className="text-right">
                      <Link to={`/result/${a.id}`} className="page-button primary text-xs px-4 py-2">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
