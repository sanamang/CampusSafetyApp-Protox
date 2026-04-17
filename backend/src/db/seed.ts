import bcrypt from 'bcryptjs';
import { pool } from './index';

async function seed() {
  const client = await pool.connect();
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  try {
    const [studentHash, officerHash, adminHash] = await Promise.all([
      hash('password123'),
      hash('password123'),
      hash('password123'),
    ]);

    await client.query(`
      INSERT INTO users (name, email, password_hash, role, student_id)
      VALUES
        ('Test Student',  'student@campus.edu', $1, 'student',  'STU001'),
        ('Test Officer',  'officer@campus.edu', $2, 'officer',  NULL),
        ('Test Admin',    'admin@campus.edu',   $3, 'admin',    NULL)
      ON CONFLICT (email) DO NOTHING;
    `, [studentHash, officerHash, adminHash]);

    console.log('Seed complete');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
