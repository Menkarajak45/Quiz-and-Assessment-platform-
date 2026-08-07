import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Users, BookOpen, CheckCircle, Activity, Tag } from 'lucide-react';
import api from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatMinutes } from '../../utils/format';

const COLORS = ['var(--success)', 'var(--danger)'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/analytics/platform')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-xl">Could not load platform analytics.</h2>
      </div>
    );
  }

  const counts = data.counts || {};
  const overall = data.overall || {};
  const passRateData = [
    { name: 'Passed', value: overall.passRate?.passed || 0 },
    { name: 'Failed', value: overall.passRate?.failed || 0 },
  ];

  const passPercent = Math.round(((overall.passRate?.passed || 0) / Math.max(1, (overall.passRate?.passed || 0) + (overall.passRate?.failed || 0))) * 100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl mb-1">Admin dashboard 📈</h1>
        <p className="text-sm">Platform-wide overview at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Link to="/admin/users" className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-icon" style={{background: 'linear-gradient(90deg,var(--primary), rgba(79,70,229,0.18))', color: 'white'}}><Users size={18} /></div>
              <div className="stat-number">{counts.students || 0}</div>
              <div className="stat-label">Students</div>
            </div>
          </div>
        </Link>
        <Link to="/admin/quizzes" className="stat-card">
          <div>
            <div className="stat-icon" style={{background: 'linear-gradient(90deg,var(--secondary), rgba(245,158,11,0.12))', color: 'white'}}><BookOpen size={18} /></div>
            <div className="stat-number">{counts.quizzes || 0}</div>
            <div className="stat-label">Quizzes</div>
          </div>
        </Link>
        <div className="stat-card">
          <div>
            <div className="stat-icon" style={{background: 'linear-gradient(90deg,var(--success), rgba(16,185,129,0.08))', color: 'white'}}><CheckCircle size={18} /></div>
            <div className="stat-number">{counts.published_quizzes || 0}</div>
            <div className="stat-label">Published</div>
          </div>
        </div>
        <Link to="/admin/attempts" className="stat-card">
          <div>
            <div className="stat-icon" style={{background: 'linear-gradient(90deg, rgba(79,70,229,0.12), rgba(79,70,229,0.02))', color: 'white'}}><Activity size={18} /></div>
            <div className="stat-number">{counts.attempts || 0}</div>
            <div className="stat-label">Attempts</div>
          </div>
        </Link>
        <div className="stat-card">
          <div>
            <div className="stat-icon" style={{background: 'linear-gradient(90deg, rgba(107,91,147,0.12), rgba(107,91,147,0.02))', color: 'white'}}><Tag size={18} /></div>
            <div className="stat-number">{counts.categories || 0}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
      </div>

      {/* Overall metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wider">Avg score</p>
          <p className="text-3xl font-display font-extrabold">{overall.avgPercentage || 0}%</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wider">Avg time per quiz</p>
          <p className="text-3xl font-display font-extrabold">{formatMinutes(Math.round((overall.avgTimeSeconds || 0) / 60))}</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wider">Pass rate</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-display font-extrabold">{passPercent}%</p>
            {passPercent < 25 ? (
              <span className="badge-alert">Low</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="card chart-card">
          <h2 className="text-lg mb-4">Attempts per day 📅</h2>
          {data.attemptsByDay?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.attemptsByDay}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(2,6,23,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="attempts" name="Attempts" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--secondary)', stroke: 'rgba(2,6,23,0.08)', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm">No data yet.</p>
          )}
        </div>

        <div className="card chart-card">
          <h2 className="text-lg mb-4">Pass / fail distribution ✅❌</h2>
          {passRateData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={passRateData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                  {passRateData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} stroke="rgba(2,6,23,0.08)" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm">No data yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="text-lg mb-4">Performance by quiz 📊</h2>
          {data.attemptsByQuiz?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.attemptsByQuiz} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="title" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avg_percentage" name="Avg score %" radius={[0, 6, 6, 0]}>
                  {data.attemptsByQuiz.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? '#ffd93d' : '#6bcb77'} stroke="#1e1e1e" strokeWidth={1.5} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm">No data yet.</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg mb-4">Top students 🎓</h2>
          {data.topStudents?.length > 0 ? (
            <div className="space-y-3">
              {data.topStudents.map((s, idx) => (
                <Link key={s.id} to={`/admin/users/${s.id}`} className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#1e1e1e]/20 hover:bg-[#f0ecdf] transition-colors">
                  <div className="w-8 h-8 shrink-0 rounded-lg border-2 border-[#1e1e1e] bg-white flex items-center justify-center font-display font-extrabold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{s.name}</p>
                    <p className="text-xs truncate">{s.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-extrabold">{s.avg_percentage}%</p>
                    <p className="text-xs">{s.attempts} attempts</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm">No students yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
