import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import api from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatDate } from '../../utils/format';

const COLORS = ['#ffd93d', '#6bcb77', '#ff6b6b', '#e0f0ff', '#c084fc', '#fb923c'];

export default function AdminStudentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/analytics/student?userId=${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load student analytics.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error || !data) {
    return (
      <div className="card max-w-lg mx-auto text-center py-12">
        <p className="text-4xl mb-3">😕</p>
        <h2 className="text-xl mb-2">{error}</h2>
        <Link to="/admin/users" className="btn-primary">Back to students</Link>
      </div>
    );
  }

  const summary = data.summary || {};
  const avg = Number(summary.avg_percentage || 0).toFixed(1);
  const best = Number(summary.best_percentage || 0).toFixed(1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl mb-1">Student performance 🎓</h1>
          <p className="text-sm">Detailed analytics for this student.</p>
        </div>
        <Link to="/admin/users" className="btn-secondary">← Back</Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card text-center !shadow-brutal-sm">
          <p className="text-4xl font-display font-extrabold">{summary.attempts || 0}</p>
          <p className="text-xs font-bold uppercase tracking-wider mt-1">Attempts</p>
        </div>
        <div className="card text-center !shadow-brutal-sm">
          <p className="text-4xl font-display font-extrabold">{summary.passed || 0}</p>
          <p className="text-xs font-bold uppercase tracking-wider mt-1">Passed</p>
        </div>
        <div className="card text-center !shadow-brutal-sm">
          <p className="text-4xl font-display font-extrabold text-[#6bcb77]">{avg}%</p>
          <p className="text-xs font-bold uppercase tracking-wider mt-1">Avg score</p>
        </div>
        <div className="card text-center !shadow-brutal-sm">
          <p className="text-4xl font-display font-extrabold text-[#ffd93d]">{best}%</p>
          <p className="text-xs font-bold uppercase tracking-wider mt-1">Best score</p>
        </div>
      </div>

      {/* Attempt history */}
      <div className="card mb-6 !shadow-brutal-lg">
        <h2 className="text-xl mb-4">Attempt history</h2>
        {data.recent?.length === 0 ? (
          <p className="text-sm">This student hasn't taken any quizzes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b-2 border-[#1e1e1e]">
                  <th className="th">Quiz</th>
                  <th className="th">Score</th>
                  <th className="th">Result</th>
                  <th className="th">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent?.map((a) => (
                  <tr key={a.id} className="border-b border-[#1e1e1e]/10 hover:bg-[#f0ecdf]/50">
                    <td className="td font-bold">{a.quiz_title}</td>
                    <td className="td">{a.score}/{a.max_score} ({a.percent}%)</td>
                    <td className="td">
                      <span className={`badge ${a.passed ? 'bg-[#6bcb77]' : 'bg-[#ff6b6b] text-white'}`}>
                        {a.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="td">{formatDate(a.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* By category */}
      <div className="card">
        <h2 className="text-lg mb-4">Performance by category 🏷️</h2>
        {data.byCategory?.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Bar dataKey="avg_percentage" name="Avg score %" radius={[6, 6, 0, 0]}>
                {data.byCategory.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} stroke="#1e1e1e" strokeWidth={2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm">Not enough data yet.</p>
        )}
      </div>
    </div>
  );
}
