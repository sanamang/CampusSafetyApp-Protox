import { pool } from './index';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK (role IN ('student','officer','admin')) DEFAULT 'student',
        student_id TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        profile_photo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES users(id),
        alert_type TEXT CHECK (alert_type IN ('SOS','Medical','Fire','Suspicious')) DEFAULT 'SOS',
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        status TEXT CHECK (status IN ('pending','acknowledged','resolved')) DEFAULT 'pending',
        assigned_officer_id UUID REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS officer_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        officer_id UUID REFERENCES users(id) UNIQUE,
        latitude FLOAT,
        longitude FLOAT,
        last_updated TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Migration complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
