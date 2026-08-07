import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerError('');
    try {
      const user = await login(data.email, data.password);
      navigate(user.role === 'admin' ? '/admin' : '/quizzes', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-10 px-4">
      <div className="card login-card">
        <div className="login-grid gap-10">
          <div className="hidden md:flex flex-col justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50/90 p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="brand-badge">Q</div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500 font-semibold">QuizMaster</p>
                  <h1 className="mt-2 text-4xl font-semibold text-slate-900">Welcome back</h1>
                </div>
              </div>
              <p className="text-slate-600 leading-7">Jump back into learning—take quizzes, track progress, and climb the leaderboard with a clean admin experience.</p>
            </div>

            <div className="callout-card">
              <div className="flex items-start gap-3">
                <span className="callout-icon">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Tip</p>
                  <p className="mt-1 text-sm text-slate-600">Use the demo accounts for fast access and quick exploration.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            {serverError && (
              <div className="mb-4 rounded-[1rem] border border-[#FECACA] bg-[#FEF2F2] p-4">
                <p className="text-sm font-semibold text-[#B91C1C]">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                  })}
                />
                {errors.email && <p className="text-xs font-semibold text-[#DC2626]">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && <p className="text-xs font-semibold text-[#DC2626]">{errors.password.message}</p>}
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Logging in…' : 'Login'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-600)]">
                Register
              </Link>
            </p>

            <p className="mt-4 text-center text-sm text-slate-600">
              <Link to="/forgot-password" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-600)]">
                Forgot your password?
              </Link>
            </p>

            <div className="demo-card">
              <p className="text-sm font-semibold text-slate-900 mb-2">Demo accounts</p>
              <p className="text-sm font-mono text-slate-700">Admin: admin@quiz.com / admin123</p>
              <p className="text-sm font-mono text-slate-700">Student: alice@quiz.com / student123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
