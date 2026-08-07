import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Trash2, Repeat, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api, { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [createError, setCreateError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = (query = '') => {
    setLoading(true);
    api
      .get(`/users${query ? `?search=${encodeURIComponent(query)}` : ''}`)
      .then((res) => setUsers(res.data.users))
      .catch(() => setError('Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(debouncedSearch);
  }, [debouncedSearch]);

  const handleToggle = async (user) => {
    setToggling(user.id);
    setError('');
    try {
      await api.patch(`/users/${user.id}/status`, { isActive: !user.is_active });
      load(debouncedSearch);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This removes their account and all attempt history.`)) return;
    setDeleting(user.id);
    setError('');
    try {
      await api.delete(`/users/${user.id}`);
      load(debouncedSearch);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  const onCreate = async (data) => {
    setCreateError('');
    try {
      await api.post('/users', data);
      setShowCreate(false);
      reset();
      load(debouncedSearch);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    }
  };

  if (loading && users.length === 0) return <Spinner />;

  return (
    <div>
      <div className="page-header mb-6">
        <div className="page-title-group">
          <div className="page-title-icon">
            <span className="w-5 h-5 flex items-center justify-center">🎓</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Manage students</h1>
            <p className="text-sm text-slate-500">View and manage student accounts, activity, and performance.</p>
          </div>
        </div>
        <div className="admin-toolbar">
          <div className="admin-meta">{users.length} students</div>
          <button onClick={() => setShowCreate(true)} className="btn-primary shadow-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add student
          </button>
        </div>
      </div>

      <div className="search-box">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          className="search-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#ff6b6b]/15 border-2 border-[#ff6b6b] text-sm font-bold mb-4">{error}</div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card max-w-md w-full !shadow-brutal-lg">
            <h2 className="text-2xl mb-4">Add student</h2>
            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-[#ff6b6b]/15 border-2 border-[#ff6b6b] text-sm font-bold">{createError}</div>
            )}
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input className="input" placeholder="Jane Doe" {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Minimum 2 characters' } })} />
                {errors.name && <p className="mt-1 text-xs font-bold text-[#ff6b6b]">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="jane@example.com" {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })} />
                {errors.email && <p className="mt-1 text-xs font-bold text-[#ff6b6b]">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Temporary password</label>
                <input type="password" className="input" placeholder="At least 6 characters" {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })} />
                {errors.password && <p className="mt-1 text-xs font-bold text-[#ff6b6b]">{errors.password.message}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-success flex-1 !shadow-brutal">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-table-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Attempts</th>
              <th>Avg score</th>
              <th>Status</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="td text-center py-10">No students found.</td>
              </tr>
            ) : (
              users.map((user) => {
                const initials = user.name?.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
                const score = Number(user.avg_percentage || 0);
                const scoreColor = score >= 80 ? 'bg-[var(--success)]' : score >= 50 ? 'bg-[var(--secondary)]' : 'bg-[var(--danger)]';
                return (
                  <tr key={user.id}>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="avatar-circle" style={{ background: `linear-gradient(135deg, rgba(79,70,229,0.16), rgba(79,70,229,0.28))` }}>
                          {initials}
                        </div>
                        <div>
                          <Link to={`/admin/users/${user.id}`} className="table-link">
                            {user.name}
                          </Link>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-slate-600">{user.attempts_count || 0}</td>
                    <td className="td">
                      <div className="text-sm font-semibold text-slate-900 mb-1">{score.toFixed(1)}%</div>
                      <div className="progress-track">
                        <div className={`progress-fill ${scoreColor}`} style={{ width: `${Math.min(score, 100)}%` }} />
                      </div>
                    </td>
                    <td className="td">
                      <span className={`status-pill ${user.is_active ? 'status-pass' : 'status-inactive'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="td text-slate-600">{formatDate(user.created_at)}</td>
                    <td className="td">
                      <div className="admin-row-actions">
                        <Link to={`/admin/users/${user.id}`} className="action-button" title="View student">
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleToggle(user)}
                          disabled={toggling === user.id}
                          className={`action-button ${user.is_active ? '' : 'bg-[rgba(16,185,129,0.08)] text-[#047857] hover:bg-[rgba(16,185,129,0.14)]'}`}
                          title={user.is_active ? 'Deactivate student' : 'Activate student'}
                        >
                          <Repeat className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deleting === user.id}
                          className="action-button danger"
                          title="Delete student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
