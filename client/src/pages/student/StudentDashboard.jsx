import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { CheckCircle2, ShieldCheck, Target, Star } from 'lucide-react';
import api from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatDate } from '../../utils/format';

const PIE_COLORS = ['#ffd93d', '#6bcb77', '#ff6b6b', '#e0f0ff', '#c084fc', '#fb923c'];

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/analytics/student')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-xl">Could not load your dashboard.</h2>
      </div>
    );
  }

  const summary = data.summary || {};
  const avg = Number(summary.avg_percentage || 0).toFixed(1);
  const best = Number(summary.best_percentage || 0).toFixed(1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl mb-1">My dashboard 📊</h1>
        <p className="text-sm">Track your progress and performance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="stat-card-icon bg-slate-100 text-[var(--primary)]">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Attempts</span>
          </div>
          <p className="stat-number">{summary.attempts || 0}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="stat-card-icon bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Passed</span>
          </div>
          <p className="stat-number">{summary.passed || 0}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="stat-card-icon bg-amber-100 text-amber-700">
              <Target className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Avg score</span>
          </div>
          <p className="stat-number text-emerald-800">{avg}%</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="stat-card-icon bg-amber-100 text-amber-700">
              <Star className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Best score</span>
          </div>
          <p className="stat-number text-amber-700">{best}%</p>
        </div>
      </div>

      {/* Recent attempts */}
      <div className="card dashboard-table-card mb-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="text-xl">Recent attempts</h2>
          <Link to="/history" className="dashboard-link">View all →</Link>
        </div>
        {data.recent?.length === 0 ? (
          <p className="text-sm">No attempts yet. <Link to="/quizzes" className="font-semibold text-[var(--primary)] hover:underline">Take your first quiz!</Link></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dashboard-table w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className="th border-b border-slate-200">Quiz</th>
                  <th className="th border-b border-slate-200">Score</th>
                  <th className="th border-b border-slate-200">Result</th>
                  <th className="th border-b border-slate-200">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent?.map((a) => (
                  <tr key={a.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/70 transition-colors">
                    <td className="td font-semibold text-slate-900">{a.quiz_title}</td>
                    <td className="td">{a.score}/{a.max_score} ({a.percent}%)</td>
                    <td className="td">
                      <span className={`status-pill ${a.passed ? 'status-pass' : 'status-fail'}`}>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="chart-card">
          <h2 className="text-lg mb-4">Performance over time</h2>
          {data.timeline?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(15,23,42,0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip wrapperStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 14px 40px rgba(15,23,42,0.08)' }} />
                <Line type="monotone" dataKey="avg_percentage" name="Score %" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'white', stroke: 'var(--primary)', strokeWidth: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm">Not enough data yet.</p>
          )}
        </div>

        <div className="chart-card">
          <h2 className="text-lg mb-4">Performance by category</h2>
          {data.byCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byCategory}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(15,23,42,0.08)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip wrapperStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 14px 40px rgba(15,23,42,0.08)' }} />
                <Bar dataKey="avg_percentage" name="Avg score %" radius={[10, 10, 0, 0]} fill="var(--primary)">
                  {data.byCategory.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm">Not enough data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
