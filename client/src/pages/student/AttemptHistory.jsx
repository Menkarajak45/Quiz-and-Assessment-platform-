import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatDate, formatDuration } from '../../utils/format';

export default function AttemptHistory() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/attempts/my')
      .then((res) => setAttempts(res.data.attempts))
      .catch(() => setError('Failed to load attempt history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header mb-6">
        <div className="page-title-group">
          <div className="page-title-icon">
            <span className="w-5 h-5 flex items-center justify-center">🗂️</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Attempt history</h1>
            <p className="text-sm text-slate-500">Review every quiz you've taken and how you scored.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.2)] text-sm font-semibold text-[#991b1b] mb-4">{error}</div>
      )}

      {attempts.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <span className="text-2xl">🪄</span>
          </div>
          <h2 className="text-2xl font-semibold mb-2">No attempts yet</h2>
          <p className="text-sm text-slate-500 mb-5">Take a quiz to see your attempts appear here.</p>
          <Link to="/quizzes" className="btn-primary">
            Browse quizzes
          </Link>
        </div>
      ) : (
        <div className="admin-table-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Category</th>
                <th>Score</th>
                <th>Result</th>
                <th>Time</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="td font-semibold">{a.quiz_title}</td>
                  <td className="td text-slate-600">{a.category_name || '—'}</td>
                  <td className="td">
                    <div className="text-sm font-semibold text-slate-900 mb-1">{a.percent}%</div>
                    <div className="progress-track">
                      <div className={`progress-fill ${a.percent >= 80 ? 'bg-[var(--success)]' : a.percent >= 50 ? 'bg-[var(--secondary)]' : 'bg-[var(--danger)]'}`} style={{ width: `${Math.min(a.percent, 100)}%` }} />
                    </div>
                  </td>
                  <td className="td">
                    <span className={`status-pill ${a.passed ? 'status-pass' : 'status-fail'}`}>
                      {a.passed ? 'Passed' : 'Failed'}
                    </span>
                  </td>
                  <td className="td text-slate-600">{formatDuration(a.time_taken_seconds)}</td>
                  <td className="td text-slate-600">{formatDate(a.submitted_at)}</td>
                  <td className="td text-right">
                    <Link to={`/result/${a.id}`} className="btn-primary !px-3 !py-1.5 text-xs">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
