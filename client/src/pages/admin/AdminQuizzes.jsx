import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Edit3, Trash2, Repeat } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import { difficultyColor, difficultyLabel } from '../../utils/format';

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/quizzes')
      .then((res) => setQuizzes(res.data.quizzes))
      .catch(() => setError('Failed to load quizzes'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handlePublish = async (quiz) => {
    setPublishing(quiz.id);
    setError('');
    try {
      await api.patch(`/quizzes/${quiz.id}/publish`, { isPublished: !quiz.is_published });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (quiz) => {
    if (!window.confirm(`Delete "${quiz.title}"? This permanently removes all its questions.`)) return;
    setDeleting(quiz.id);
    setError('');
    try {
      await api.delete(`/quizzes/${quiz.id}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header mb-6">
        <div className="page-title-group">
          <div className="page-title-icon">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Manage quizzes</h1>
            <p className="text-sm text-slate-500">Create, publish, and maintain your quiz catalog.</p>
          </div>
        </div>
        <div className="admin-toolbar">
          <div className="admin-meta">{quizzes.length} quizzes found</div>
          <Link to="/admin/quizzes/new" className="btn-primary shadow-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New quiz
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.2)] text-sm font-semibold text-[#991b1b] mb-6">
          {error}
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No quizzes yet</h2>
          <p className="text-slate-500 mb-5">The quiz library is empty. Add your first quiz to get started.</p>
          <Link to="/admin/quizzes/new" className="btn-primary">
            Create your first quiz
          </Link>
        </div>
      ) : (
        <div className="admin-table-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="td font-semibold max-w-[280px] truncate">
                    <Link to={`/admin/quizzes/${quiz.id}/edit`} className="table-link">
                      {quiz.title}
                    </Link>
                    <div className="text-xs text-slate-400 mt-1">Updated {new Date(quiz.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </td>
                  <td className="td text-slate-600">{quiz.category_name || '—'}</td>
                  <td className="td">
                    <span className={`pill-badge ${difficultyColor(quiz.difficulty)}`}>{difficultyLabel(quiz.difficulty)}</span>
                  </td>
                  <td className="td text-slate-600">{quiz.question_count}</td>
                  <td className="td">
                    <span className={`pill-badge ${quiz.is_published ? 'pill-published' : 'pill-draft'}`}>
                      {quiz.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="td text-slate-600">
                    <div>{new Date(quiz.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="text-xs text-slate-400">{new Date(quiz.updated_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="td">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        onClick={() => handlePublish(quiz)}
                        disabled={publishing === quiz.id}
                        className="action-button"
                        title={quiz.is_published ? 'Unpublish quiz' : 'Publish quiz'}
                      >
                        <Repeat className="w-4 h-4" />
                      </button>
                      <Link to={`/admin/quizzes/${quiz.id}/edit`} className="action-button" title="Edit quiz">
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(quiz)}
                        disabled={deleting === quiz.id}
                        className="action-button danger"
                        title="Delete quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row-count">Showing {quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'}.</div>
        </div>
      )}
    </div>
  );
}
