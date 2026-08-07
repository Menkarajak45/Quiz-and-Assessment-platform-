import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/client';
import { getErrorMessage } from '../api/client';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const query = useQuery();
  const token = query.get('token') || '';
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [serverMessage, setServerMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerMessage('');
    setServerError('');
    try {
      const res = await api.post('/auth/reset-password', { token, password: data.password });
      setServerMessage(res.data.message || 'Your password has been updated.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-10 px-4 max-w-xl">
      <div className="card login-card">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Reset password</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Choose a new password</h1>
          <p className="mt-3 text-slate-600 leading-7">Create a strong password and get back into your account.</p>
        </div>

        {serverMessage && (
          <div className="mb-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {serverMessage}
          </div>
        )}

        {serverError && (
          <div className="mb-4 rounded-[1rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {serverError}
          </div>
        )}

        {token ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">New password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                })}
              />
              {errors.password && <p className="text-xs font-semibold text-[#DC2626]">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Updating password…' : 'Update password'}
            </button>
          </form>
        ) : (
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
            <p>We couldn’t find a valid reset token. Please request a new link from the forgot password page.</p>
            <Link to="/forgot-password" className="mt-4 inline-flex text-[var(--primary)] font-semibold hover:text-[var(--primary-600)]">
              Request a new reset link
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-600)]">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
