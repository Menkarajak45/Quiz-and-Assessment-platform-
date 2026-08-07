import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function setup() {
  const client = await pool.connect();
  try {
    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Database schema created successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Schema setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
