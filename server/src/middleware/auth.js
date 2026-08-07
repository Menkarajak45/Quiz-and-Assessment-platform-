import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const { rows } = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [payload.id]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Account is inactive or not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
}

export function requireStudent(req, res, next) {
  if (req.user && req.user.role === 'student') {
    return next();
  }
  res.status(403).json({ message: 'Student access required' });
}
