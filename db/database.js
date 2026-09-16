'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const { seedDatabase } = require('./seed');

const dbInstances = {};

function getDb(tenant) {
  if (!tenant) {
    throw new Error('Tenant ID is required to get database connection.');
  }

  if (!dbInstances[tenant]) {
    const dbPath = path.join(__dirname, '..', `data_${tenant}.sqlite`);
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initializeDatabase(db);

    // Seed if empty
    const userCount = db.prepare('SELECT count(*) as c FROM users').get().c;
    if (userCount === 0) {
      seedDatabase(db);
    }

    dbInstances[tenant] = db;
    console.log(`Database initialized for tenant: ${tenant}`);
  }

  return dbInstances[tenant];
}

function initializeDatabase(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      class_name TEXT,
      avatar_color TEXT DEFAULT '#7c3aed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      room TEXT
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
      PRIMARY KEY (student_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
      grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 5),
      weight INTEGER DEFAULT 1 CHECK(weight BETWEEN 1 AND 5),
      description TEXT,
      date DATE DEFAULT CURRENT_DATE,
      graded_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      target_class TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      event_time TEXT,
      location TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 4),
      period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 8),
      class_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      room TEXT NOT NULL DEFAULT 'general',
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { getDb };
