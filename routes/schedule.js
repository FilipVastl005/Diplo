'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/auth');

const PERIOD_TIMES = {
  1:'7:55-8:40', 2:'8:50-9:35', 3:'9:45-10:30', 4:'10:50-11:35',
  5:'11:45-12:30', 6:'12:50-13:35', 7:'13:45-14:30', 8:'14:40-15:25'
};
const DAYS = ['Pondeli', 'Utery', 'Streda', 'Ctvrtek', 'Patek'];

function getTodaySubjects(user, db) {
    const dow = new Date().getDay();
  const dayOfWeek = (dow === 0 || dow === 6) ? -1 : dow - 1;
  if (dayOfWeek < 0) return [];
  if (user.role === 'student' && user.class_name) {
    const rows = db.prepare(`SELECT DISTINCT s.id, s.short_name, s.room, u.first_name||' '||u.last_name AS teacher_name FROM schedule sc JOIN subjects s ON sc.subject_id=s.id LEFT JOIN users u ON s.teacher_id=u.id WHERE sc.class_name=? AND sc.day_of_week=? ORDER BY sc.period`).all(user.class_name, dayOfWeek);
    const seen = new Set(); return rows.filter(r => { if(seen.has(r.id)) return false; seen.add(r.id); return true; });
  }
  if (user.role === 'teacher') {
    const rows = db.prepare(`SELECT DISTINCT s.id, s.short_name, s.room, sc.class_name FROM schedule sc JOIN subjects s ON sc.subject_id=s.id WHERE s.teacher_id=? AND sc.day_of_week=? ORDER BY sc.period`).all(user.id, dayOfWeek);
    const seen = new Set(); return rows.filter(r => { const k=r.id+r.class_name; if(seen.has(k)) return false; seen.add(k); return true; });
  }
  return [];
}

function buildGrid(entries) {
  // grid[day][period] = entry
  const grid = {};
  for (let d = 0; d < 5; d++) {
    grid[d] = {};
    for (let p = 1; p <= 8; p++) grid[d][p] = null;
  }
  entries.forEach(e => {
    if (!grid[e.day_of_week][e.period]) grid[e.day_of_week][e.period] = [];
    grid[e.day_of_week][e.period].push(e);
  });
  return grid;
}

\n  const db = getDb(req.tenant);
    const user = req.user;
  const todaySubjects = getTodaySubjects(user);

  let selectedClass = req.query.class || (user.role === 'student' ? user.class_name : null);
  const classes = db.prepare(`SELECT DISTINCT class_name FROM schedule ORDER BY class_name`).all().map(r => r.class_name);

  let entries = [];
  if (user.role === 'student') {
    selectedClass = user.class_name;
    entries = db.prepare(`
      SELECT sc.*, s.name AS subject_name, s.short_name, s.room,
             u.first_name||' '||u.last_name AS teacher_name
      FROM schedule sc JOIN subjects s ON sc.subject_id=s.id
             LEFT JOIN users u ON s.teacher_id=u.id
      WHERE sc.class_name=?
      ORDER BY sc.day_of_week, sc.period
    `).all(user.class_name);
  } else if (user.role === 'teacher') {
    entries = db.prepare(`
      SELECT sc.*, s.name AS subject_name, s.short_name, s.room, sc.class_name
      FROM schedule sc JOIN subjects s ON sc.subject_id=s.id
      WHERE s.teacher_id=?
      ORDER BY sc.day_of_week, sc.period
    `).all(user.id);
    selectedClass = 'Moje hodiny';
  } else {
    if (selectedClass) {
      entries = db.prepare(`
        SELECT sc.*, s.name AS subject_name, s.short_name, s.room,
               u.first_name||' '||u.last_name AS teacher_name
        FROM schedule sc JOIN subjects s ON sc.subject_id=s.id
               LEFT JOIN users u ON s.teacher_id=u.id
        WHERE sc.class_name=?
        ORDER BY sc.day_of_week, sc.period
      `).all(selectedClass);
    }
  }

  const grid = buildGrid(entries);

  res.render('schedule', {
    user, todaySubjects, grid, classes, selectedClass,
    days: DAYS, periodTimes: PERIOD_TIMES,
    page: 'rozvrh'
  });
});

module.exports = router;
