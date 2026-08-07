import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireStudent } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

async function getAttemptDetail(attemptId) {
  const attemptRes = await pool.query(
    `SELECT a.*, q.title AS quiz_title, q.difficulty, q.pass_percentage, q.duration_minutes
     FROM attempts a
     JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.id = $1`,
    [attemptId]
  );
  const attempt = attemptRes.rows[0];
  if (!attempt) return null;

  const answersRes = await pool.query(
    `SELECT aa.question_id, aa.selected_option_ids, aa.is_correct, aa.awarded_points,
            qq.question_text, qq.question_type, qq.points AS question_points, qq.explanation
     FROM attempt_answers aa
     JOIN questions qq ON qq.id = aa.question_id
     WHERE aa.attempt_id = $1
     ORDER BY qq.position`,
    [attemptId]
  );

  const answers = [];
  for (const ans of answersRes.rows) {
    const optsRes = await pool.query(
      `SELECT o.id, o.option_text, o.is_correct FROM options o WHERE o.question_id = $1 ORDER BY o.position`,
      [ans.question_id]
    );
    answers.push({
      questionId: ans.question_id,
      questionText: ans.question_text,
      questionType: ans.question_type,
      explanation: ans.explanation,
      points: ans.question_points,
      selectedOptionIds: ans.selected_option_ids || [],
      isCorrect: ans.is_correct,
      awardedPoints: ans.awarded_points,
      options: optsRes.rows.map((o) => ({
        id: o.id,
        optionText: o.option_text,
        isCorrect: o.is_correct,
      })),
    });
  }

  return { ...attempt, answers };
}

// POST /api/attempts — start a quiz attempt
router.post('/', requireStudent, async (req, res) => {
  try {
    const { quizId } = req.body || {};
    if (!Number.isInteger(quizId)) {
      return res.status(400).json({ message: 'quizId is required' });
    }

    const quizRes = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
    const quiz = quizRes.rows[0];
    if (!quiz || !quiz.is_published) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const qRes = await pool.query(
      `SELECT q.id, q.question_type
       FROM questions q
       WHERE q.quiz_id = $1
       ORDER BY q.position`,
      [quizId]
    );
    if (qRes.rows.length === 0) {
      return res.status(400).json({ message: 'This quiz has no questions yet' });
    }

    // Prevent concurrent live attempts for the same user+quiz
    const live = await pool.query(
      `SELECT id FROM attempts
       WHERE user_id = $1 AND quiz_id = $2 AND submitted_at IS NULL`,
      [req.user.id, quizId]
    );
    if (live.rows.length > 0) {
      return res.status(409).json({
        message: 'You already have an ongoing attempt for this quiz',
        attemptId: live.rows[0].id,
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO attempts (user_id, quiz_id, started_at)
       VALUES ($1, $2, NOW()) RETURNING *`,
      [req.user.id, quizId]
    );
    const attempt = rows[0];

    const questions = qRes.rows.map((q) => ({
      questionId: q.id,
      questionType: q.question_type,
    }));

    res.status(201).json({
      attempt: {
        id: attempt.id,
        quizId: attempt.quiz_id,
        startedAt: attempt.started_at,
        durationMinutes: quiz.duration_minutes,
        questions,
      },
    });
  } catch (err) {
    console.error('Start attempt error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attempts/:id/submit — submit answers and score
router.post('/:id/submit', requireStudent, async (req, res) => {
  try {
    const attemptId = Number(req.params.id);
    const { answers = [] } = req.body || {};

    const attemptRes = await pool.query(
      `SELECT a.*, q.duration_minutes, q.pass_percentage
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.id = $1 AND a.user_id = $2`,
      [attemptId, req.user.id]
    );
    const attempt = attemptRes.rows[0];
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    if (attempt.submitted_at) {
      return res.status(409).json({ message: 'This attempt has already been submitted' });
    }

    // Timer enforcement: fail if the deadline passed and this is a manual submit
    const deadline = new Date(attempt.started_at.getTime() + attempt.duration_minutes * 60000);
    const now = new Date();
    const timeUp = now > deadline;
    const { auto = timeUp } = req.body || {};

    const qRes = await pool.query(
      'SELECT id, points, question_type FROM questions WHERE quiz_id = $1',
      [attempt.quiz_id]
    );
    const questions = qRes.rows;
    if (questions.length === 0) {
      return res.status(400).json({ message: 'This quiz has no questions' });
    }
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    // Map submitted answers by question id
    const answerMap = new Map();
    for (const ans of answers) {
      if (ans && Number.isInteger(ans.questionId) && Array.isArray(ans.selectedOptionIds)) {
        answerMap.set(ans.questionId, ans.selectedOptionIds.map(Number));
      }
    }

    let score = 0;
    let correctCount = 0;
    const scoredRows = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete any partial answers (e.g. if a retry raced the submit)
      await client.query('DELETE FROM attempt_answers WHERE attempt_id = $1', [attemptId]);

      for (const q of questions) {
        const optsRes = await client.query(
          'SELECT id, is_correct FROM options WHERE question_id = $1',
          [q.id]
        );
        const correctIds = optsRes.rows.filter((o) => o.is_correct).map((o) => o.id);
        const selectedIds = answerMap.get(q.id) || [];

        const uniqueSelected = [...new Set(selectedIds)];
        const allValid = uniqueSelected.every((id) => optsRes.rows.some((o) => o.id === id));
        const safeSelected = allValid ? uniqueSelected : [];

        const isCorrect =
          safeSelected.length === correctIds.length &&
          safeSelected.every((id) => correctIds.includes(id));
        const awarded = isCorrect ? q.points : 0;
        if (isCorrect) correctCount++;
        score += awarded;

        await client.query(
          `INSERT INTO attempt_answers (attempt_id, question_id, selected_option_ids, is_correct, awarded_points)
           VALUES ($1, $2, $3, $4, $5)`,
          [attemptId, q.id, JSON.stringify(safeSelected), isCorrect, awarded]
        );
        scoredRows.push({ questionId: q.id, selectedOptionIds: safeSelected, isCorrect, awardedPoints: awarded });
      }

      const passPercent = maxScore > 0 ? (score / maxScore) * 100 : 0;
      const passed = passPercent >= attempt.pass_percentage;
      const timeTakenSeconds = timeUp
        ? attempt.duration_minutes * 60
        : Math.round((now.getTime() - attempt.started_at.getTime()) / 1000);

      // Lock the attempt row so duplicate submits cannot double-upsert
      const updatedRes = await client.query(
        `UPDATE attempts
         SET submitted_at = NOW(), score = $1, max_score = $2, correct_answers = $3,
             total_questions = $4, passed = $5, time_taken_seconds = $6, auto_submitted = $7
         WHERE id = $8 AND submitted_at IS NULL
         RETURNING *`,
        [score, maxScore, correctCount, questions.length, passed, timeTakenSeconds, timeUp, attemptId]
      );

      if (!updatedRes.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'This attempt has already been submitted' });
      }

      await client.query('COMMIT');
      const saved = updatedRes.rows[0];

      res.json({
        attempt: {
          id: saved.id,
          score: saved.score,
          maxScore: saved.max_score,
          correctAnswers: saved.correct_answers,
          totalQuestions: saved.total_questions,
          passed: saved.passed,
          percent: Math.round(passPercent),
          timeTakenSeconds: saved.time_taken_seconds,
          autoSubmitted: saved.auto_submitted,
          answers: scoredRows,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Submit attempt error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attempts/my — student's own attempts, optionally per quiz
router.get('/my', requireStudent, async (req, res) => {
  try {
    const { quizId } = req.query;
    const params = [req.user.id];
    let where = 'a.user_id = $1 AND a.submitted_at IS NOT NULL';
    if (quizId) {
      params.push(Number(quizId));
      where += ` AND a.quiz_id = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT a.id, a.quiz_id, q.title AS quiz_title, q.difficulty, q.category_id, c.name AS category_name,
              a.score, a.max_score, a.correct_answers, a.total_questions, a.passed,
              a.time_taken_seconds, a.auto_submitted, a.submitted_at,
              ROUND(a.score::numeric / NULLIF(a.max_score, 0) * 100, 1) AS percent
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       LEFT JOIN categories c ON c.id = q.category_id
       WHERE ${where}
       ORDER BY a.submitted_at DESC`,
      params
    );
    res.json({ attempts: rows });
  } catch (err) {
    console.error('My attempts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attempts/:id — full detail (owner or admin)
router.get('/:id', async (req, res) => {
  try {
    const attemptId = Number(req.params.id);
    const attempt = await getAttemptDetail(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }
    if (req.user.role === 'student' && attempt.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ attempt });
  } catch (err) {
    console.error('Get attempt error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attempts — admin: list all attempts
router.get('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const { search = '', quizId } = req.query;
    const params = [];
    let where = 'a.submitted_at IS NOT NULL';
    if (quizId) {
      params.push(Number(quizId));
      where += ` AND a.quiz_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR q.title ILIKE $${params.length})`;
    }
    const { rows } = await pool.query(
      `SELECT a.id, a.user_id, u.name AS user_name, u.email AS user_email,
              a.quiz_id, q.title AS quiz_title, q.difficulty,
              a.score, a.max_score, a.correct_answers, a.total_questions, a.passed,
              a.time_taken_seconds, a.auto_submitted, a.started_at, a.submitted_at,
              ROUND(a.score::numeric / NULLIF(a.max_score, 0) * 100, 1) AS percent
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE ${where}
       ORDER BY a.submitted_at DESC
       LIMIT 500`,
      params
    );
    res.json({ attempts: rows });
  } catch (err) {
    console.error('List all attempts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
