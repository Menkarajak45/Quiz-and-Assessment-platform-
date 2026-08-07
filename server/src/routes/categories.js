import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, COUNT(q.id) AS quiz_count
       FROM categories c
       LEFT JOIN quizzes q ON q.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json({ categories: rows });
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/categories (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description = '' } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description]
    );
    res.status(201).json({ category: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A category with this name already exists' });
    }
    console.error('Create category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/categories/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    const { rows } = await pool.query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name.trim(), description ?? '', id]
    );
    if (!rows[0]) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ category: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A category with this name already exists' });
    }
    console.error('Update category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/categories/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
