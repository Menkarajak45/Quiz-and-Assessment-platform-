import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET /api/analytics/student — current student's performance
router.get('/student', async (req, res) => {
  if (req.user.role === 'student') {
    try {
      const params = [req.user.id];
      const summaryRes = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) AS attempts,
           COUNT(*) FILTER (WHERE passed = TRUE) AS passed,
           COALESCE(AVG(score::numeric / NULLIF(max_score, 0)) * 100, 0) AS avg_percentage,
           COALESCE(MAX(score::numeric / NULLIF(max_score, 0)) * 100, 0) AS best_percentage,
           COALESCE(SUM(score), 0) AS total_score
         FROM attempts
         WHERE user_id = $1 AND submitted_at IS NOT NULL`,
        params
      );
      const recentRes = await pool.query(
        `SELECT a.id, a.quiz_id, q.title AS quiz_title, a.score, a.max_score, a.passed, a.submitted_at,
                ROUND(a.score::numeric / NULLIF(a.max_score, 0) * 100, 1) AS percent
         FROM attempts a
         JOIN quizzes q ON q.id = a.quiz_id
         WHERE a.user_id = $1 AND a.submitted_at IS NOT NULL
         ORDER BY a.submitted_at DESC
         LIMIT 5`,
        params
      );
      const byCategoryRes = await pool.query(
        `SELECT c.name AS category, COALESCE(AVG(a.score::numeric / NULLIF(a.max_score, 0)) * 100, 0) AS avg_percentage
         FROM attempts a
         JOIN quizzes q ON q.id = a.quiz_id
         JOIN categories c ON c.id = q.category_id
         WHERE a.user_id = $1 AND a.submitted_at IS NOT NULL
         GROUP BY c.id, c.name
         ORDER BY avg_percentage DESC`,
        params
      );
      const timelineRes = await pool.query(
        `SELECT TO_CHAR(a.submitted_at, 'YYYY-MM-DD') AS date,
                ROUND(AVG(a.score::numeric / NULLIF(a.max_score, 0)) * 100, 1) AS avg_percentage
         FROM attempts a
         WHERE a.user_id = $1 AND a.submitted_at IS NOT NULL
         GROUP BY date
         ORDER BY date
         LIMIT 30`,
        params
      );

      return res.json({
        summary: summaryRes.rows[0],
        recent: recentRes.rows,
        byCategory: byCategoryRes.rows,
        timeline: timelineRes.rows,
      });
    } catch (err) {
      console.error('Student analytics error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // Admin uses the same student payload for a chosen user
  const userId = Number(req.query.userId);
  if (!userId) {
    return res.status(400).json({ message: 'userId is required for admin' });
  }
  try {
    const params = [userId];
    const summaryRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) AS attempts,
         COUNT(*) FILTER (WHERE passed = TRUE) AS passed,
         COALESCE(AVG(score::numeric / NULLIF(max_score, 0)) * 100, 0) AS avg_percentage,
         COALESCE(MAX(score::numeric / NULLIF(max_score, 0)) * 100, 0) AS best_percentage,
         COALESCE(SUM(score), 0) AS total_score
       FROM attempts
       WHERE user_id = $1 AND submitted_at IS NOT NULL`,
      params
    );
    const recentRes = await pool.query(
      `SELECT a.id, a.quiz_id, q.title AS quiz_title, a.score, a.max_score, a.passed, a.submitted_at,
              ROUND(a.score::numeric / NULLIF(a.max_score, 0) * 100, 1) AS percent
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.user_id = $1 AND a.submitted_at IS NOT NULL
       ORDER BY a.submitted_at DESC
       LIMIT 10`,
      params
    );
    const byCategoryRes = await pool.query(
      `SELECT c.name AS category, COALESCE(AVG(a.score::numeric / NULLIF(a.max_score, 0)) * 100, 0) AS avg_percentage
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN categories c ON c.id = q.category_id
       WHERE a.user_id = $1 AND a.submitted_at IS NOT NULL
       GROUP BY c.id, c.name
       ORDER BY avg_percentage DESC`,
      params
    );
    return res.json({
      summary: summaryRes.rows[0],
      recent: recentRes.rows,
      byCategory: byCategoryRes.rows,
    });
  } catch (err) {
    console.error('Admin student analytics error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/platform — admin platform overview
router.get('/platform', requireAdmin, async (req, res) => {
  try {
    const counts = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
         (SELECT COUNT(*) FROM quizzes) AS quizzes,
         (SELECT COUNT(*) FROM quizzes WHERE is_published = TRUE) AS published_quizzes,
         (SELECT COUNT(*) FROM attempts WHERE submitted_at IS NOT NULL) AS attempts,
         (SELECT COUNT(*) FROM categories) AS categories`
    );

    const percentRes = await pool.query(
      `SELECT COALESCE(AVG(score::numeric / NULLIF(max_score, 0)) * 100, 0) AS avg_percentage,
              COALESCE(AVG(time_taken_seconds), 0) AS avg_time_seconds
       FROM attempts WHERE submitted_at IS NOT NULL`
    );

    const passRateRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE passed = TRUE) AS passed,
         COUNT(*) FILTER (WHERE passed = FALSE) AS failed
       FROM attempts WHERE submitted_at IS NOT NULL`
    );

    const attemptsByDay = await pool.query(
      `SELECT TO_CHAR(submitted_at, 'YYYY-MM-DD') AS date, COUNT(*) AS attempts
       FROM attempts WHERE submitted_at IS NOT NULL
       GROUP BY date ORDER BY date DESC LIMIT 14`
    );

    const attemptsByQuiz = await pool.query(
      `SELECT q.id, q.title, COUNT(a.id) AS attempts,
              ROUND(COALESCE(AVG(a.score::numeric / NULLIF(a.max_score, 0)) * 100, 0), 1) AS avg_percentage,
              COUNT(*) FILTER (WHERE a.passed = TRUE) AS passed
       FROM quizzes q
       LEFT JOIN attempts a ON a.quiz_id = q.id AND a.submitted_at IS NOT NULL
       GROUP BY q.id
       ORDER BY attempts DESC
       LIMIT 10`
    );

    const topStudents = await pool.query(
      `SELECT u.id, u.name, u.email,
              COUNT(a.id) AS attempts,
              ROUND(COALESCE(AVG(a.score::numeric / NULLIF(a.max_score, 0)) * 100, 0), 1) AS avg_percentage
       FROM users u
       LEFT JOIN attempts a ON a.user_id = u.id AND a.submitted_at IS NOT NULL
       WHERE u.role = 'student'
       GROUP BY u.id
       ORDER BY avg_percentage DESC, attempts DESC
       LIMIT 5`
    );

    res.json({
      counts: counts.rows[0],
      overall: {
        avgPercentage: Number(percentRes.rows[0].avg_percentage).toFixed(1),
        avgTimeSeconds: Math.round(Number(percentRes.rows[0].avg_time_seconds) || 0),
        passRate: passRateRes.rows[0],
      },
      attemptsByDay: attemptsByDay.rows.reverse(),
      attemptsByQuiz: attemptsByQuiz.rows,
      topStudents: topStudents.rows,
    });
  } catch (err) {
    console.error('Platform analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/leaderboard?categoryId=
router.get('/leaderboard', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const params = [];
    let filter = '';
    if (categoryId) {
      params.push(Number(categoryId));
      filter = `AND q.category_id = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.name,
              COUNT(a.id) AS attempts,
              ROUND(COALESCE(AVG(a.score::numeric / NULLIF(a.max_score, 0)) * 100, 0), 1) AS avg_percentage,
              MAX(a.score::numeric / NULLIF(a.max_score, 0)) * 100 AS best_percentage,
              COUNT(*) FILTER (WHERE a.passed = TRUE) AS passed
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.submitted_at IS NOT NULL
         AND u.role = 'student' AND u.is_active = TRUE
         ${filter}
       GROUP BY u.id, u.name
       HAVING COUNT(a.id) > 0
       ORDER BY avg_percentage DESC, passed DESC, attempts DESC
       LIMIT 20`,
      params
    );
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
