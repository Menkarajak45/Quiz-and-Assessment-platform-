import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Tag } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import { useForm } from 'react-hook-form';

const CATEGORY_COLORS = {
  Programming: 'bg-blue-200 text-blue-800',
  Math: 'bg-violet-200 text-violet-800',
  History: 'bg-amber-200 text-amber-800',
  Science: 'bg-emerald-200 text-emerald-800',
  Default: 'bg-slate-200 text-slate-700',
};

function categoryStyle(name) {
  return CATEGORY_COLORS[name] || CATEGORY_COLORS.Default;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [mutating, setMutating] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const load = () => {
    setLoading(true);
    api
      .get('/categories')
      .then((res) => setCategories(res.data.categories))
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onSubmit = async (data) => {
    setMutating(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, data);
      } else {
        await api.post('/categories', data);
      }
      reset();
      setEditing(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMutating(false);
    }
  };

  const startEdit = (category) => {
    setEditing(category);
    setValue('name', category.name);
    setValue('description', category.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditing(null);
    reset({ name: '', description: '' });
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"? Quizzes in it will become uncategorized.`)) return;
    setMutating(true);
    setError('');
    try {
      await api.delete(`/categories/${category.id}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMutating(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header mb-6">
        <div className="page-title-group">
          <div className="page-title-icon">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Manage categories</h1>
            <p className="text-sm text-slate-500">Organize quizzes into subjects and topics.</p>
          </div>
        </div>
        <div className="admin-toolbar">
          <div className="admin-meta">{categories.length} categories</div>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="btn-primary shadow-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New category
          </button>
        </div>
      </div>

      <div className="card mb-6 !shadow-brutal-lg">
        <h2 className="text-xl mb-4">{editing ? `Edit: ${editing.name}` : 'Create category'}</h2>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#ff6b6b]/15 border-2 border-[#ff6b6b] text-sm font-bold">{error}</div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" placeholder="e.g. Science" {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Minimum 2 characters' } })} />
            {errors.name && <p className="mt-1 text-xs font-bold text-[#ff6b6b]">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="Short description" {...register('description')} />
          </div>
          <div className="flex gap-3">
            {editing && (
              <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel edit</button>
            )}
            <button type="submit" className="btn-success !shadow-brutal" disabled={mutating}>
              {mutating ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      {categories.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Tag className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No categories yet</h2>
          <p className="text-sm text-slate-500 mb-5">Create your first category to group your quizzes beautifully.</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="btn-primary">
            + New category
          </button>
        </div>
      ) : (
        <div className="category-grid">
          {categories.map((category) => {
            const colorClass = categoryStyle(category.name);
            return (
              <div key={category.id} className="category-card">
                <div className="category-card-header">
                  <div className={`category-accent ${colorClass}`}>
                    {category.name.charAt(0)}
                  </div>
                  <div className="category-details">
                    <p className="category-title">{category.name}</p>
                    <p className="category-caption">{category.description || 'No description added'}</p>
                  </div>
                </div>
                <span className="category-pill">{category.quiz_count || 0} quizzes</span>
                <div className="category-actions">
                  <button onClick={() => startEdit(category)} className="category-action-button" title="Edit category">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(category)} disabled={mutating} className="category-action-button" title="Delete category">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
