import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerError('');
    try {
      const user = await registerUser(data.name, data.email, data.password);
      navigate(user.role === 'admin' ? '/admin' : '/quizzes', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="card !shadow-brutal-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#6bcb77] border-[3px] border-[#1e1e1e] shadow-brutal-sm text-2xl font-display font-extrabold mb-3">
            Q
          </div>
          <h1 className="text-3xl">Create account 🎓</h1>
          <p className="text-sm mt-1">Join and start taking quizzes</p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 rounded-xl bg-[#ff6b6b]/15 border-2 border-[#ff6b6b] text-sm font-bold">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              placeholder="Jane Doe"
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
            />
            {errors.name && <p className="mt-1 text-xs font-bold text-[#ff6b6b]">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
            />
            {errors.email && <p className="mt-1 text-xs font-bold text-[#ff6b6b]">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="At least 6 characters"
              {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
            />
            {errors.password && <p className="mt-1 text-xs font-bold text-[#ff6b6b]">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Confirm password</label>
            <input
              type="password"
              className="input"
              placeholder="Repeat your password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === watch('password') || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs font-bold text-[#ff6b6b]">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button type="submit" className="btn-success w-full !shadow-brutal" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="font-bold underline decoration-[#ffd93d] decoration-2 underline-offset-2">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
