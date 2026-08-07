import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !name.trim() || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'student') RETURNING *`,
      [name.trim(), normalizedEmail, hash]
    );
    const user = rows[0];
    const token = signToken(user);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: 'This account has been deactivated. Contact an administrator.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (!rows[0]) {
      return res.json({ message: 'If that email is registered, you will receive password reset instructions.' });
    }

    const token = crypto.randomBytes(28).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [rows[0].id, token, expiresAt.toISOString()]
    );

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    return res.json({
      message: 'Password reset requested. Use the reset link to update your password.',
      resetUrl,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const { rows } = await pool.query(
      `SELECT pr.user_id, pr.expires_at
       FROM password_resets pr
       WHERE pr.token = $1`,
      [token]
    );

    if (!rows[0]) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    const reset = rows[0];
    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Reset token has expired.' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, reset.user_id]);
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [reset.user_id]);

    res.json({ message: 'Your password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
