import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const QUESTION_TYPES = ['single', 'multiple'];

function isValidQuizPayload(body) {
  const { title, description, categoryId, difficulty, durationMinutes, passPercentage, isPublished, questions } = body || {};
  if (!title || !title.trim()) return 'Title is required';
  if (difficulty && !DIFFICULTIES.includes(difficulty)) return 'Invalid difficulty';
  if (durationMinutes !== undefined && (!Number.isInteger(durationMinutes) || durationMinutes < 1)) {
    return 'Duration must be a positive integer';
  }
  if (passPercentage !== undefined && (passPercentage < 0 || passPercentage > 100)) {
    return 'Pass percentage must be between 0 and 100';
  }
  return null;
}

function isValidQuestionPayload(q) {
  if (!q.questionText || !q.questionText.trim()) return 'Question text is required';
  if (!QUESTION_TYPES.includes(q.questionType)) return 'Invalid question type';
  if (!Number.isInteger(q.points) || q.points < 1) return 'Points must be a positive integer';
  if (!Array.isArray(q.options) || q.options.length < 2) return 'Each question needs at least 2 options';
  const correctCount = q.options.filter((o) => o.isCorrect).length;
  if (correctCount < 1) return 'Each question needs at least one correct option';
  if (q.questionType === 'single' && correctCount > 1) return 'Single-choice questions can have only one correct option';
  if (q.questionType === 'multiple' && correctCount < 2) return 'Multiple-choice questions need at least two correct options';
  for (const o of q.options) {
    if (!o.optionText || !o.optionText.trim()) return 'Option text is required';
  }
  return null;
}

async function fetchQuizWithQuestions(quizId) {
  const quizRes = await pool.query(
    `SELECT q.*, c.name AS category_name, u.name AS creator_name,
            (SELECT COUNT(*) FROM questions qq WHERE qq.quiz_id = q.id) AS question_count
     FROM quizzes q
     LEFT JOIN categories c ON c.id = q.category_id
     LEFT JOIN users u ON u.id = q.created_by
     WHERE q.id = $1`,
    [quizId]
  );
  const quiz = quizRes.rows[0];
  if (!quiz) return null;

  const qRes = await pool.query(
    'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY position',
    [quizId]
  );
  const questions = [];
  for (const q of qRes.rows) {
    const optRes = await pool.query(
      'SELECT * FROM options WHERE question_id = $1 ORDER BY position',
      [q.id]
    );
    questions.push({
      id: q.id,
      questionText: q.question_text,
      questionType: q.question_type,
      points: q.points,
      explanation: q.explanation,
      position: q.position,
      options: optRes.rows.map((o) => ({
        id: o.id,
        optionText: o.option_text,
        isCorrect: o.is_correct,
        position: o.position,
      })),
    });
  }
  quiz.question_count = questions.length;
  return { ...quiz, questions };
}

// GET /api/quizzes?search=&categoryId=&difficulty=&published=
router.get('/', async (req, res) => {
  try {
    const { search = '', categoryId, difficulty, published } = req.query;
    const conditions = [];
    const params = [];

    if (req.user.role === 'student') {
      conditions.push('q.is_published = TRUE');
    }
    if (search) {
      conditions.push(`q.title ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }
    if (categoryId) {
      conditions.push(`q.category_id = $${params.length + 1}`);
      params.push(Number(categoryId));
    }
    if (difficulty) {
      conditions.push(`q.difficulty = $${params.length + 1}`);
      params.push(difficulty);
    }
    if (published !== undefined && req.user.role === 'admin') {
      const isPublished = published === 'true' || published === '1';
      conditions.push(`q.is_published = $${params.length + 1}`);
      params.push(isPublished);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT q.id, q.title, q.description, q.category_id, c.name AS category_name,
              q.difficulty, q.duration_minutes, q.pass_percentage, q.is_published,
              q.created_at, q.updated_at,
              (SELECT COUNT(*) FROM questions qq WHERE qq.quiz_id = q.id) AS question_count
       FROM quizzes q
       LEFT JOIN categories c ON c.id = q.category_id
       ${where}
       ORDER BY q.created_at DESC`,
      params
    );
    res.json({ quizzes: rows });
  } catch (err) {
    console.error('List quizzes error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/quizzes/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quiz = await fetchQuizWithQuestions(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    if (req.user.role === 'student' && !quiz.is_published) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json({ quiz });
  } catch (err) {
    console.error('Get quiz error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/quizzes (admin)
router.post('/', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const validationError = isValidQuizPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    const { title, description = '', categoryId = null, difficulty = 'medium', durationMinutes = 10, passPercentage = 50, isPublished = false, questions = [] } = req.body;
    for (const q of questions) {
      const qErr = isValidQuestionPayload(q);
      if (qErr) {
        return res.status(400).json({ message: qErr });
      }
    }

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO quizzes (title, description, category_id, difficulty, duration_minutes, pass_percentage, is_published, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [title.trim(), description, categoryId || null, difficulty, durationMinutes, passPercentage, isPublished, req.user.id]
    );
    const quizId = rows[0].id;

    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const q = questions[qIndex];
      const qRes = await client.query(
        `INSERT INTO questions (quiz_id, question_text, question_type, points, explanation, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [quizId, q.questionText.trim(), q.questionType, q.points, q.explanation || '', qIndex]
      );
      const questionId = qRes.rows[0].id;
      for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
        const o = q.options[oIndex];
        await client.query(
          `INSERT INTO options (question_id, option_text, is_correct, position)
           VALUES ($1, $2, $3, $4)`,
          [questionId, o.optionText.trim(), !!o.isCorrect, oIndex]
        );
      }
    }
    await client.query('COMMIT');

    const created = await fetchQuizWithQuestions(quizId);
    res.status(201).json({ quiz: created });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create quiz error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/quizzes/:id (admin) — full replace of quiz + questions
router.put('/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const validationError = isValidQuizPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    const { title, description = '', categoryId = null, difficulty = 'medium', durationMinutes = 10, passPercentage = 50, isPublished = false, questions = [] } = req.body;
    for (const q of questions) {
      const qErr = isValidQuestionPayload(q);
      if (qErr) {
        return res.status(400).json({ message: qErr });
      }
    }

    await client.query('BEGIN');
    const quizRes = await client.query('SELECT id FROM quizzes WHERE id = $1', [id]);
    if (!quizRes.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Quiz not found' });
    }

    await client.query(
      `UPDATE quizzes SET title = $1, description = $2, category_id = $3, difficulty = $4,
              duration_minutes = $5, pass_percentage = $6, is_published = $7, updated_at = NOW()
       WHERE id = $8`,
      [title.trim(), description, categoryId || null, difficulty, durationMinutes, passPercentage, isPublished, id]
    );

    await client.query('DELETE FROM questions WHERE quiz_id = $1', [id]);
    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const q = questions[qIndex];
      const qRes = await client.query(
        `INSERT INTO questions (quiz_id, question_text, question_type, points, explanation, position)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [id, q.questionText.trim(), q.questionType, q.points, q.explanation || '', qIndex]
      );
      const questionId = qRes.rows[0].id;
      for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
        const o = q.options[oIndex];
        await client.query(
          `INSERT INTO options (question_id, option_text, is_correct, position)
           VALUES ($1, $2, $3, $4)`,
          [questionId, o.optionText.trim(), !!o.isCorrect, oIndex]
        );
      }
    }
    await client.query('COMMIT');

    const updated = await fetchQuizWithQuestions(id);
    res.json({ quiz: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update quiz error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/quizzes/:id/publish (admin)
router.patch('/:id/publish', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isPublished } = req.body || {};
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({ message: 'isPublished must be a boolean' });
    }
    const { rows } = await pool.query(
      'UPDATE quizzes SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isPublished, id]
    );
    if (!rows[0]) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json({ quiz: rows[0] });
  } catch (err) {
    console.error('Publish quiz error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/quizzes/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query('DELETE FROM quizzes WHERE id = $1 RETURNING id', [id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    console.error('Delete quiz error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
