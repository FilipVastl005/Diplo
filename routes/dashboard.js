'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

const PERIOD_TIMES = {
  1: '7:55-8:40', 2: '8:50-9:35', 3: '9:45-10:30',
  4: '10:50-11:35', 5: '11:45-12:30', 6: '12:50-13:35',
  7: '13:45-14:30', 8: '14:40-15:25'
};

function getTodaySubjects(user, db) {
    const dow = new Date().getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const dayOfWeek = dow === 0 || dow === 6 ? -1 : dow - 1; // Mon=0 ... Fri=4, weekend=-1

  if (dayOfWeek < 0) return [];

  if (user.role === 'student' && user.class_name) {
    const rows = db.prepare(`
      SELECT DISTINCT s.id, s.short_name, s.room,
             u.first_name || ' ' || u.last_name AS teacher_name
      FROM schedule sc
      JOIN subjects s ON sc.subject_id = s.id
      LEFT JOIN users u ON s.teacher_id = u.id
      WHERE sc.class_name = ? AND sc.day_of_week = ?
      ORDER BY sc.period
    `).all(user.class_name, dayOfWeek);
    const seen = new Set();
    return rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  }

  if (user.role === 'teacher') {
    const rows = db.prepare(`
      SELECT DISTINCT s.id, s.short_name, s.room, sc.class_name
      FROM schedule sc
      JOIN subjects s ON sc.subject_id = s.id
      WHERE s.teacher_id = ? AND sc.day_of_week = ?
      ORDER BY sc.period
    `).all(user.id, dayOfWeek);
    const seen = new Set();
    return rows.filter(r => {
      const k = r.id + '-' + r.class_name;
      if (seen.has(k)) return false; seen.add(k); return true;
    });
  }

  if (user.role === 'admin') {
    const rows = db.prepare(`
      SELECT DISTINCT s.id, s.short_name, s.room,
             u.first_name || ' ' || u.last_name AS teacher_name
      FROM schedule sc
      JOIN subjects s ON sc.subject_id = s.id
      LEFT JOIN users u ON s.teacher_id = u.id
      WHERE sc.day_of_week = ?
      ORDER BY sc.period LIMIT 8
    `).all(dayOfWeek);
    const seen = new Set();
    return rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  }

  return [];
}

  const db = getDb(req.tenant);
    const user = req.user;
  const todaySubjects = getTodaySubjects(user);

  // Notifications
  let notifications;
  if (user.role === 'student') {
    notifications = db.prepare(`
      SELECT n.*, u.first_name || ' ' || u.last_name AS teacher_name
      FROM notifications n LEFT JOIN users u ON n.teacher_id = u.id
      WHERE n.target_class IS NULL OR n.target_class = ?
      ORDER BY n.created_at DESC LIMIT 4
    `).all(user.class_name);
  } else {
    notifications = db.prepare(`
      SELECT n.*, u.first_name || ' ' || u.last_name AS teacher_name
      FROM notifications n LEFT JOIN users u ON n.teacher_id = u.id
      ORDER BY n.created_at DESC LIMIT 4
    `).all();
  }

  // Grades
  let grades = [];
  if (user.role === 'student') {
    grades = db.prepare(`
      SELECT g.*, s.short_name AS subject_short
      FROM grades g JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = ?
      ORDER BY g.date DESC LIMIT 5
    `).all(user.id);
  } else if (user.role === 'teacher') {
    grades = db.prepare(`
      SELECT g.*, s.short_name AS subject_short,
             u.first_name || ' ' || u.last_name AS student_name
      FROM grades g JOIN subjects s ON g.subject_id = s.id
             JOIN users u ON g.student_id = u.id
      WHERE g.graded_by = ?
      ORDER BY g.date DESC LIMIT 5
    `).all(user.id);
  } else {
    grades = db.prepare(`
      SELECT g.*, s.short_name AS subject_short,
             u.first_name || ' ' || u.last_name AS student_name
      FROM grades g JOIN subjects s ON g.subject_id = s.id
             JOIN users u ON g.student_id = u.id
      ORDER BY g.date DESC LIMIT 5
    `).all();
  }

  // Events
  const events = db.prepare(`
    SELECT * FROM events WHERE event_date >= date('now')
    ORDER BY event_date ASC LIMIT 3
  `).all();

  res.render('dashboard', { user, todaySubjects, notifications, grades, events, page: 'dashboard' });
});

module.exports = router;
