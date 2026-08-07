import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/users (admin) — list users with attempt stats
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = [];
    let where = 'WHERE u.role = \'student\'';
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
              COUNT(a.id) FILTER (WHERE a.submitted_at IS NOT NULL) AS attempts_count,
              ROUND(COALESCE(AVG(a.score::numeric / NULLIF(a.max_score, 0)) * 100, 0), 1) AS avg_percentage
       FROM users u
       LEFT JOIN attempts a ON a.user_id = u.id AND a.submitted_at IS NOT NULL
       ${where}
       GROUP BY u.id
       ORDER BY u.name`,
      params
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users (admin) — create student account
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !name.trim() || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student') RETURNING id, name, email, role, is_active, created_at`,
      [name.trim(), normalizedEmail, hash]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/:id/status (admin) — activate/deactivate
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body || {};
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }
    const { rows } = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 AND role = \'student\' RETURNING id, name, email, role, is_active',
      [isActive, id]
    );
    if (!rows[0]) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const { rows } = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
