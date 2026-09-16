'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/auth');

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

function computeAverages(grades) {
  const map = {};
  grades.forEach(g => {
    if (!map[g.subject_id]) map[g.subject_id] = { name: g.subject_name, short: g.subject_short, sumWG: 0, sumW: 0, grades: [] };
    map[g.subject_id].sumWG += g.grade * g.weight;
    map[g.subject_id].sumW  += g.weight;
    map[g.subject_id].grades.push(g);
  });
  return Object.values(map).map(s => ({ ...s, avg: s.sumW > 0 ? (s.sumWG / s.sumW).toFixed(2) : null }));
}

// GET /znamky
\n  const db = getDb(req.tenant);
    const user = req.user;
  const todaySubjects = getTodaySubjects(user);

  let studentId = user.role === 'student' ? user.id : (parseInt(req.query.student_id) || null);
  let selectedStudent = null;

  const students = (user.role === 'teacher' || user.role === 'admin')
    ? db.prepare(`SELECT id, first_name||' '||last_name AS full_name, class_name FROM users WHERE role='student' ORDER BY last_name`).all()
    : [];

  if ((user.role === 'teacher' || user.role === 'admin') && studentId) {
    selectedStudent = db.prepare(`SELECT id, first_name||' '||last_name AS full_name, class_name FROM users WHERE id=? AND role='student'`).get(studentId);
  }

  let gradesBySubject = [];
  let allGrades = [];
  if (user.role === 'student') {
    allGrades = db.prepare(`
      SELECT g.*, s.name AS subject_name, s.short_name AS subject_short,
             u.first_name||' '||u.last_name AS teacher_name
      FROM grades g JOIN subjects s ON g.subject_id=s.id
             LEFT JOIN users u ON g.graded_by=u.id
      WHERE g.student_id=? ORDER BY s.name, g.date DESC
    `).all(user.id);
    gradesBySubject = computeAverages(allGrades);
  } else if (studentId && selectedStudent) {
    allGrades = db.prepare(`
      SELECT g.*, s.name AS subject_name, s.short_name AS subject_short,
             u.first_name||' '||u.last_name AS teacher_name
      FROM grades g JOIN subjects s ON g.subject_id=s.id
             LEFT JOIN users u ON g.graded_by=u.id
      WHERE g.student_id=? ORDER BY s.name, g.date DESC
    `).all(studentId);
    gradesBySubject = computeAverages(allGrades);
  }

  const subjects = (user.role !== 'student')
    ? db.prepare(`SELECT s.*, u.first_name||' '||u.last_name AS teacher_name FROM subjects s LEFT JOIN users u ON s.teacher_id=u.id ORDER BY s.name`).all()
    : db.prepare(`SELECT s.* FROM enrollments e JOIN subjects s ON e.subject_id=s.id WHERE e.student_id=? ORDER BY s.name`).all(user.id);

  res.render('grades', {
    user, todaySubjects, gradesBySubject, allGrades, students, subjects,
    selectedStudent, studentId,
    page: 'znamky', success: req.query.success || null, error: req.query.error || null
  });
});

// POST /znamky/add
\n  const db = getDb(req.tenant);
    const student_id  = parseInt(req.body.student_id);
  const subject_id  = parseInt(req.body.subject_id);
  const grade       = parseInt(req.body.grade);
  const weight      = parseInt(req.body.weight) || 1;
  const description = (req.body.description || '').trim();
  const date        = req.body.date || new Date().toISOString().split('T')[0];

  if (!student_id || !subject_id || !grade || grade < 1 || grade > 5) {
    return res.redirect('/znamky?error=Neplatna+data+pro+znamku');
  }

  if (req.user.role === 'teacher') {
    const subj = db.prepare('SELECT * FROM subjects WHERE id=? AND teacher_id=?').get(subject_id, req.user.id);
    if (!subj) return res.redirect('/znamky?error=Nemате+opravneni+k+tomuto+predmetu');
  }

  db.prepare(`
    INSERT INTO grades (student_id, subject_id, grade, weight, description, date, graded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(student_id, subject_id, grade, weight, description, date, req.user.id);

  res.redirect(`/znamky?student_id=${student_id}&success=Znamka+pridana`);
});

// POST /znamky/:id/delete
\n  const db = getDb(req.tenant);
    const g = db.prepare('SELECT * FROM grades WHERE id=?').get(req.params.id);
  if (!g) return res.redirect('/znamky?error=Znamka+nenalezena');

  if (req.user.role === 'teacher' && g.graded_by !== req.user.id) {
    return res.redirect('/znamky?error=Nemате+opravneni+smazat+tuto+znamku');
  }

  db.prepare('DELETE FROM grades WHERE id=?').run(req.params.id);
  res.redirect(`/znamky?student_id=${g.student_id}&success=Znamka+smazana`);
});

module.exports = router;
