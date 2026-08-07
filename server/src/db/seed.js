import bcrypt from 'bcryptjs';
import pool from './pool.js';

async function insertUser(client, { name, email, password, role = 'student', isActive = true }) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING RETURNING id`,
    [name, email, hash, role, isActive]
  );
  return rows[0] ? rows[0].id : null;
}

async function insertCategory(client, { name, description }) {
  const { rows } = await client.query(
    `INSERT INTO categories (name, description) VALUES ($1, $2)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    [name, description]
  );
  return rows[0] ? rows[0].id : null;
}

async function insertQuiz(client, quiz, questions) {
  const { rows } = await client.query(
    `INSERT INTO quizzes (title, description, category_id, difficulty, duration_minutes, pass_percentage, is_published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [quiz.title, quiz.description, quiz.categoryId, quiz.difficulty, quiz.durationMinutes, quiz.passPercentage, quiz.isPublished, quiz.createdBy]
  );
  const quizId = rows[0].id;

  for (let qIndex = 0; qIndex < questions.length; qIndex++) {
    const q = questions[qIndex];
    const { rows: qRows } = await client.query(
      `INSERT INTO questions (quiz_id, question_text, question_type, points, explanation, position)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [quizId, q.text, q.type || 'single', q.points || 1, q.explanation || '', qIndex]
    );
    const questionId = qRows[0].id;

    for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
      const opt = q.options[oIndex];
      await client.query(
        `INSERT INTO options (question_id, option_text, is_correct, position)
         VALUES ($1, $2, $3, $4)`,
        [questionId, opt.text, opt.isCorrect, oIndex]
      );
    }
  }
  return quizId;
}

const QUIZ_DEFS = [
  {
    title: 'JavaScript Fundamentals',
    description: 'Test your knowledge of core JavaScript concepts including variables, functions, and scope.',
    difficulty: 'easy',
    durationMinutes: 10,
    passPercentage: 50,
    isPublished: true,
    questions: [
      {
        text: 'Which keyword is used to declare a block-scoped variable in JavaScript?',
        type: 'single',
        points: 1,
        explanation: 'let declares block-scoped variables, unlike var which is function-scoped.',
        options: [
          { text: 'var', isCorrect: false },
          { text: 'let', isCorrect: true },
          { text: 'def', isCorrect: false },
          { text: 'constall', isCorrect: false },
        ],
      },
      {
        text: 'Which of the following are primitive data types in JavaScript?',
        type: 'multiple',
        points: 2,
        explanation: 'string, number, boolean, null, undefined, symbol, and bigint are primitives.',
        options: [
          { text: 'string', isCorrect: true },
          { text: 'number', isCorrect: true },
          { text: 'array', isCorrect: false },
          { text: 'object', isCorrect: false },
        ],
      },
      {
        text: 'What does the === operator check?',
        type: 'single',
        points: 1,
        explanation: '=== checks both value and type (strict equality).',
        options: [
          { text: 'Value only', isCorrect: false },
          { text: 'Type only', isCorrect: false },
          { text: 'Value and type', isCorrect: true },
          { text: 'Reference only', isCorrect: false },
        ],
      },
      {
        text: 'Which method converts a JSON string into a JavaScript object?',
        type: 'single',
        points: 1,
        explanation: 'JSON.parse() parses a JSON string into a JavaScript object.',
        options: [
          { text: 'JSON.stringify()', isCorrect: false },
          { text: 'JSON.parse()', isCorrect: true },
          { text: 'Object.fromJSON()', isCorrect: false },
          { text: 'JSON.toObject()', isCorrect: false },
        ],
      },
      {
        text: 'Which of these are valid ways to define a function?',
        type: 'multiple',
        points: 2,
        explanation: 'Function declarations, function expressions, and arrow functions are all valid.',
        options: [
          { text: 'function foo() {}', isCorrect: true },
          { text: 'const foo = () => {}', isCorrect: true },
          { text: 'def foo():', isCorrect: false },
          { text: 'func foo()', isCorrect: false },
        ],
      },
    ],
  },
  {
    title: 'Algebra Basics',
    description: 'A quick refresher on linear equations, exponents, and word problems.',
    difficulty: 'medium',
    durationMinutes: 15,
    passPercentage: 60,
    isPublished: true,
    questions: [
      {
        text: 'Solve for x: 3x + 5 = 20',
        type: 'single',
        points: 2,
        explanation: '3x = 15, so x = 5.',
        options: [
          { text: '3', isCorrect: false },
          { text: '5', isCorrect: true },
          { text: '7', isCorrect: false },
          { text: '15', isCorrect: false },
        ],
      },
      {
        text: 'What is 2^5?',
        type: 'single',
        points: 1,
        explanation: '2^5 = 2 × 2 × 2 × 2 × 2 = 32.',
        options: [
          { text: '16', isCorrect: false },
          { text: '25', isCorrect: false },
          { text: '32', isCorrect: true },
          { text: '64', isCorrect: false },
        ],
      },
      {
        text: 'Which of the following are linear equations?',
        type: 'multiple',
        points: 2,
        explanation: 'Linear equations have variables raised only to the first power.',
        options: [
          { text: 'y = 2x + 1', isCorrect: true },
          { text: 'y = x²', isCorrect: false },
          { text: '3x - 4 = 8', isCorrect: true },
          { text: 'y = 1/x', isCorrect: false },
        ],
      },
      {
        text: 'Factor: x² - 9',
        type: 'single',
        points: 2,
        explanation: 'This is a difference of squares: (x+3)(x-3).',
        options: [
          { text: '(x+3)(x-3)', isCorrect: true },
          { text: '(x+9)(x-1)', isCorrect: false },
          { text: '(x-3)²', isCorrect: false },
          { text: '(x+9)²', isCorrect: false },
        ],
      },
      {
        text: 'If a train travels 120 km in 2 hours, what is its speed in km/h?',
        type: 'single',
        points: 1,
        explanation: 'Speed = distance / time = 120 / 2 = 60 km/h.',
        options: [
          { text: '40', isCorrect: false },
          { text: '50', isCorrect: false },
          { text: '60', isCorrect: true },
          { text: '240', isCorrect: false },
        ],
      },
    ],
  },
  {
    title: 'World History: Modern Era',
    description: 'Questions covering key events of the 19th and 20th centuries.',
    difficulty: 'hard',
    durationMinutes: 20,
    passPercentage: 50,
    isPublished: true,
    questions: [
      {
        text: 'In which year did World War II end?',
        type: 'single',
        points: 1,
        explanation: 'World War II ended in 1945.',
        options: [
          { text: '1943', isCorrect: false },
          { text: '1944', isCorrect: false },
          { text: '1945', isCorrect: true },
          { text: '1946', isCorrect: false },
        ],
      },
      {
        text: 'Who was the first President of the United States?',
        type: 'single',
        points: 1,
        explanation: 'George Washington was inaugurated in 1789.',
        options: [
          { text: 'Thomas Jefferson', isCorrect: false },
          { text: 'George Washington', isCorrect: true },
          { text: 'Abraham Lincoln', isCorrect: false },
          { text: 'John Adams', isCorrect: false },
        ],
      },
      {
        text: 'Which of the following events happened during the 20th century?',
        type: 'multiple',
        points: 2,
        explanation: 'The Moon landing (1969) and the fall of the Berlin Wall (1989) both occurred in the 20th century.',
        options: [
          { text: 'First Moon landing', isCorrect: true },
          { text: 'Fall of the Berlin Wall', isCorrect: true },
          { text: 'French Revolution', isCorrect: false },
          { text: 'Signing of the Magna Carta', isCorrect: false },
        ],
      },
      {
        text: 'The Cold War was primarily between which two superpowers?',
        type: 'single',
        points: 1,
        explanation: 'The Cold War was between the USA and the Soviet Union.',
        options: [
          { text: 'USA and China', isCorrect: false },
          { text: 'USA and USSR', isCorrect: true },
          { text: 'UK and Germany', isCorrect: false },
          { text: 'France and Japan', isCorrect: false },
        ],
      },
      {
        text: 'In which year did the Soviet Union dissolve?',
        type: 'single',
        points: 2,
        explanation: 'The Soviet Union formally dissolved on 26 December 1991.',
        options: [
          { text: '1989', isCorrect: false },
          { text: '1990', isCorrect: false },
          { text: '1991', isCorrect: true },
          { text: '1993', isCorrect: false },
        ],
      },
    ],
  },
  {
    title: 'General Science',
    description: 'A mix of biology, chemistry, and physics fundamentals.',
    difficulty: 'easy',
    durationMinutes: 10,
    passPercentage: 50,
    isPublished: true,
    questions: [
      {
        text: 'What is the chemical symbol for water?',
        type: 'single',
        points: 1,
        explanation: 'Water is H₂O — two hydrogen atoms and one oxygen atom.',
        options: [
          { text: 'H2O', isCorrect: true },
          { text: 'CO2', isCorrect: false },
          { text: 'O2', isCorrect: false },
          { text: 'NaCl', isCorrect: false },
        ],
      },
      {
        text: 'Which organ pumps blood through the human body?',
        type: 'single',
        points: 1,
        explanation: 'The heart pumps blood throughout the body.',
        options: [
          { text: 'Lungs', isCorrect: false },
          { text: 'Liver', isCorrect: false },
          { text: 'Heart', isCorrect: true },
          { text: 'Kidneys', isCorrect: false },
        ],
      },
      {
        text: 'Which of the following are planets in our solar system?',
        type: 'multiple',
        points: 2,
        explanation: 'Earth and Mars are planets; Pluto is a dwarf planet and the Moon is a natural satellite.',
        options: [
          { text: 'Earth', isCorrect: true },
          { text: 'Mars', isCorrect: true },
          { text: 'Pluto', isCorrect: false },
          { text: 'The Moon', isCorrect: false },
        ],
      },
      {
        text: 'What force keeps objects on the ground?',
        type: 'single',
        points: 1,
        explanation: 'Gravity pulls objects toward the Earth.',
        options: [
          { text: 'Friction', isCorrect: false },
          { text: 'Magnetism', isCorrect: false },
          { text: 'Gravity', isCorrect: true },
          { text: 'Inertia', isCorrect: false },
        ],
      },
      {
        text: 'What is the powerhouse of the cell?',
        type: 'single',
        points: 1,
        explanation: 'Mitochondria generate most of the cell\'s energy (ATP).',
        options: [
          { text: 'Nucleus', isCorrect: false },
          { text: 'Mitochondria', isCorrect: true },
          { text: 'Ribosome', isCorrect: false },
          { text: 'Cell membrane', isCorrect: false },
        ],
      },
    ],
  },
  {
    title: 'Geography Challenge',
    description: 'Test your knowledge of world geography, capitals, and landmarks.',
    difficulty: 'medium',
    durationMinutes: 12,
    passPercentage: 55,
    isPublished: true,
    questions: [
      {
        text: 'What is the capital of Australia?',
        type: 'single',
        points: 1,
        explanation: 'Canberra is the capital city of Australia.',
        options: [
          { text: 'Sydney', isCorrect: false },
          { text: 'Melbourne', isCorrect: false },
          { text: 'Canberra', isCorrect: true },
          { text: 'Perth', isCorrect: false },
        ],
      },
      {
        text: 'Which is the longest river in the world?',
        type: 'single',
        points: 1,
        explanation: 'The Nile is commonly regarded as the world\'s longest river.',
        options: [
          { text: 'Amazon', isCorrect: false },
          { text: 'Nile', isCorrect: true },
          { text: 'Yangtze', isCorrect: false },
          { text: 'Mississippi', isCorrect: false },
        ],
      },
      {
        text: 'Mount Everest is located in which mountain range?',
        type: 'single',
        points: 1,
        explanation: 'Mount Everest is part of the Himalayas.',
        options: [
          { text: 'Andes', isCorrect: false },
          { text: 'Rockies', isCorrect: false },
          { text: 'Himalayas', isCorrect: true },
          { text: 'Alps', isCorrect: false },
        ],
      },
      {
        text: 'Which of the following are continents?',
        type: 'multiple',
        points: 2,
        explanation: 'Asia and Africa are continents; Greenland is an island and the Sahara is a desert.',
        options: [
          { text: 'Asia', isCorrect: true },
          { text: 'Africa', isCorrect: true },
          { text: 'Greenland', isCorrect: false },
          { text: 'Sahara', isCorrect: false },
        ],
      },
      {
        text: 'Which country is shaped like a boot?',
        type: 'single',
        points: 1,
        explanation: 'Italy is famously shaped like a boot.',
        options: [
          { text: 'Spain', isCorrect: false },
          { text: 'Greece', isCorrect: false },
          { text: 'Italy', isCorrect: true },
          { text: 'Portugal', isCorrect: false },
        ],
      },
    ],
  },
  {
    title: 'Advanced Python',
    description: 'Advanced concepts in Python: decorators, generators, and OOP.',
    difficulty: 'hard',
    durationMinutes: 25,
    passPercentage: 60,
    isPublished: false,
    questions: [
      {
        text: 'Which keyword is used to define a generator function?',
        type: 'single',
        points: 1,
        explanation: 'The yield keyword makes a function a generator.',
        options: [
          { text: 'return', isCorrect: false },
          { text: 'yield', isCorrect: true },
          { text: 'async', isCorrect: false },
          { text: 'generate', isCorrect: false },
        ],
      },
      {
        text: 'What does a decorator do in Python?',
        type: 'single',
        points: 2,
        explanation: 'A decorator wraps a function to extend or modify its behavior.',
        options: [
          { text: 'Deletes a function', isCorrect: false },
          { text: 'Wraps a function to modify behavior', isCorrect: true },
          { text: 'Converts a function to a class', isCorrect: false },
          { text: 'Measures memory usage only', isCorrect: false },
        ],
      },
    ],
  },
];

async function addAttempt(client, { userId, quizId, startedMinutesAgo, answerPlan, autoSubmitted = false }) {
  const quizRes = await client.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
  const quiz = quizRes.rows[0];
  const qRes = await client.query('SELECT * FROM questions WHERE quiz_id = $1 ORDER BY position', [quizId]);
  const questions = qRes.rows;

  const now = Date.now();
  const startedAt = new Date(now - startedMinutesAgo * 60000);
  const submittedAt = new Date(now);
  const timeTaken = Math.max(30, Math.round((submittedAt - startedAt) / 1000));

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  for (const q of questions) maxScore += q.points;

  // Precompute per-question selections & correctness
  const answerRows = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const optsRes = await client.query('SELECT * FROM options WHERE question_id = $1 ORDER BY position', [q.id]);
    const opts = optsRes.rows;
    const plan = answerPlan[i];
    let selectedIds = [];
    if (plan === 'correct') {
      selectedIds = opts.filter((o) => o.is_correct).map((o) => o.id);
    } else if (plan === 'blank') {
      selectedIds = [];
    } else if (plan === 'wrong') {
      const wrong = opts.find((o) => !o.is_correct);
      if (wrong) selectedIds = [wrong.id];
    }

    const correctOpts = opts.filter((o) => o.is_correct).map((o) => o.id);
    const isCorrect =
      selectedIds.length === correctOpts.length &&
      selectedIds.every((id) => correctOpts.includes(id));
    const awarded = isCorrect ? q.points : 0;
    if (isCorrect) correctCount++;
    score += awarded;

    answerRows.push({ questionId: q.id, selectedIds, isCorrect, awarded });
  }

  const passPercent = (score / maxScore) * 100;
  const passed = passPercent >= quiz.pass_percentage;

  const attemptRes = await client.query(
    `INSERT INTO attempts (user_id, quiz_id, started_at, submitted_at, score, max_score, correct_answers, total_questions, passed, time_taken_seconds, auto_submitted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [userId, quizId, startedAt, submittedAt, score, maxScore, correctCount, questions.length, passed, timeTaken, autoSubmitted]
  );
  const attemptId = attemptRes.rows[0].id;

  for (const ans of answerRows) {
    await client.query(
      `INSERT INTO attempt_answers (attempt_id, question_id, selected_option_ids, is_correct, awarded_points)
       VALUES ($1, $2, $3, $4, $5)`,
      [attemptId, ans.questionId, JSON.stringify(ans.selectedIds), ans.isCorrect, ans.awarded]
    );
  }
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminId = await insertUser(client, {
      name: 'Admin',
      email: 'admin@quiz.com',
      password: 'admin123',
      role: 'admin',
    });
    const aliceId = await insertUser(client, { name: 'Alice Johnson', email: 'alice@quiz.com', password: 'student123' });
    const bobId = await insertUser(client, { name: 'Bob Smith', email: 'bob@quiz.com', password: 'student123' });
    const chrisId = await insertUser(client, { name: 'Chris Patel', email: 'chris@quiz.com', password: 'student123' });
    await insertUser(client, { name: 'Dana Lee', email: 'dana@quiz.com', password: 'student123' });
    await insertUser(client, { name: 'Evan Brown', email: 'evan@quiz.com', password: 'student123', isActive: false });

    const scienceId = await insertCategory(client, { name: 'Science', description: 'Physics, chemistry, and biology' });
    const mathId = await insertCategory(client, { name: 'Mathematics', description: 'Algebra, geometry, and more' });
    const programmingId = await insertCategory(client, { name: 'Programming', description: 'Coding and software development' });
    const historyId = await insertCategory(client, { name: 'History', description: 'World and regional history' });
    const geographyId = await insertCategory(client, { name: 'Geography', description: 'Countries, capitals, and landmarks' });

    const quizMeta = {
      'JavaScript Fundamentals': { categoryId: programmingId },
      'Algebra Basics': { categoryId: mathId },
      'World History: Modern Era': { categoryId: historyId },
      'General Science': { categoryId: scienceId },
      'Geography Challenge': { categoryId: geographyId },
      'Advanced Python': { categoryId: programmingId },
    };

    const quizIds = {};
    for (const quiz of QUIZ_DEFS) {
      const meta = quizMeta[quiz.title];
      quizIds[quiz.title] = await insertQuiz(client, { ...quiz, ...meta, createdBy: adminId }, quiz.questions);
    }

    if (aliceId && bobId && chrisId) {
      const ATTEMPTS = [
        { userId: aliceId, quiz: 'JavaScript Fundamentals', mins: 12, plan: ['correct', 'correct', 'correct', 'correct', 'correct'] },
        { userId: aliceId, quiz: 'Algebra Basics', mins: 30, plan: ['correct', 'correct', 'correct', 'correct', 'wrong'] },
        { userId: aliceId, quiz: 'General Science', mins: 60, plan: ['correct', 'correct', 'correct', 'wrong', 'wrong'] },
        { userId: aliceId, quiz: 'Geography Challenge', mins: 90, plan: ['blank', 'correct', 'correct', 'correct', 'wrong'] },
        { userId: bobId, quiz: 'JavaScript Fundamentals', mins: 8, plan: ['correct', 'wrong', 'correct', 'correct', 'correct'] },
        { userId: bobId, quiz: 'Algebra Basics', mins: 45, plan: ['correct', 'correct', 'wrong', 'correct', 'correct'] },
        { userId: bobId, quiz: 'World History: Modern Era', mins: 110, plan: ['correct', 'correct', 'correct', 'correct', 'correct'] },
        { userId: bobId, quiz: 'General Science', mins: 140, plan: ['wrong', 'correct', 'wrong', 'correct', 'correct'] },
        { userId: chrisId, quiz: 'JavaScript Fundamentals', mins: 15, plan: ['wrong', 'wrong', 'correct', 'blank', 'correct'] },
        { userId: chrisId, quiz: 'General Science', mins: 20, plan: ['correct', 'correct', 'correct', 'correct', 'correct'] },
        { userId: chrisId, quiz: 'Geography Challenge', mins: 75, plan: ['correct', 'correct', 'wrong', 'correct', 'correct'] },
        { userId: chrisId, quiz: 'Algebra Basics', mins: 130, plan: ['correct', 'wrong', 'correct', 'correct', 'wrong'], autoSubmitted: true },
      ];

      for (const a of ATTEMPTS) {
        await addAttempt(client, {
          userId: a.userId,
          quizId: quizIds[a.quiz],
          startedMinutesAgo: a.mins,
          answerPlan: a.plan,
          autoSubmitted: a.autoSubmitted,
        });
      }
    }

    await client.query('COMMIT');
    console.log('Seed data inserted successfully.');
    console.log('--- Demo accounts ---');
    console.log('Admin:  admin@quiz.com / admin123');
    console.log('Student: alice@quiz.com / student123');
    console.log('Student: bob@quiz.com / student123');
    console.log('Student: chris@quiz.com / student123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
