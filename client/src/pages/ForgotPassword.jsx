import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/client';
import { getErrorMessage } from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [serverMessage, setServerMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerMessage('');
    setServerError('');
    try {
      const res = await api.post('/auth/forgot-password', { email: data.email });
      setServerMessage(res.data.message || 'If that email is registered, you will receive instructions soon.');
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
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Password help</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Forgot your password?</h1>
          <p className="mt-3 text-slate-600 leading-7">Enter your email address and we’ll send you a secure link to reset your password.</p>
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

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Sending link…' : 'Send reset link'}
          </button>
        </form>

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
