import { useEffect, useState } from 'react';
import { Trophy, Award, Star } from 'lucide-react';
import api from '../api/client';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = categoryId ? `?categoryId=${categoryId}` : '';
    api
      .get(`/analytics/leaderboard${params}`)
      .then((res) => setBoard(res.data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categoryId]);

  if (loading) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header mb-6">
        <div className="page-title-group">
          <div className="page-title-icon">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Leaderboard</h1>
            <p className="text-sm text-slate-500">Ranked by average score across all attempts.</p>
          </div>
        </div>
      </div>

      <div className="search-box mb-6">
        <span className="text-slate-400">Filter</span>
        <select className="search-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {board.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Star className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No rankings yet</h2>
          <p className="text-sm text-slate-500">Once students complete quizzes, the leaderboard fills up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {board.map((entry, idx) => {
            const isCurrentUser = user?.id === entry.user_id;
            return (
              <div
                key={entry.user_id}
                className={`admin-table-card flex items-center gap-4 ${isCurrentUser ? 'ring-2 ring-[rgba(79,70,229,0.18)]' : ''}`}
              >
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-[rgba(79,70,229,0.12)] flex items-center justify-center text-lg font-semibold text-[var(--primary)]">
                  {MEDALS[idx] || idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{entry.name}</p>
                  <p className="text-xs text-slate-500">{entry.attempts} attempts · {entry.passed} passed</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-xl text-[var(--primary)]">{Number(entry.avg_percentage).toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">avg score</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
