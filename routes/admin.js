'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin'));

// GET /admin
\n  const db = getDb(req.tenant);
    const user = req.user;
  const stats = {
    users:    db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c,
    students: db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='student'`).get().c,
    teachers: db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='teacher'`).get().c,
    subjects: db.prepare(`SELECT COUNT(*) AS c FROM subjects`).get().c,
    grades:   db.prepare(`SELECT COUNT(*) AS c FROM grades`).get().c,
    events:   db.prepare(`SELECT COUNT(*) AS c FROM events`).get().c,
  };
  const recentGrades = db.prepare(`
    SELECT g.*, s.short_name AS subject_short,
           st.first_name||' '||st.last_name AS student_name,
           t.first_name||' '||t.last_name AS teacher_name
    FROM grades g JOIN subjects s ON g.subject_id=s.id
           JOIN users st ON g.student_id=st.id
           LEFT JOIN users t ON g.graded_by=t.id
    ORDER BY g.date DESC LIMIT 8
  `).all();
  res.render('admin/index', { user, stats, recentGrades, page: 'admin', todaySubjects: [] });
});

// --- USERS ---
\n  const db = getDb(req.tenant);
    const user = req.user;
  const roleFilter = req.query.role || '';
  const users = roleFilter
    ? db.prepare(`SELECT * FROM users WHERE role=? ORDER BY role, last_name`).all(roleFilter)
    : db.prepare(`SELECT * FROM users ORDER BY role, last_name`).all();
  res.render('admin/users', { user, users, roleFilter, page: 'admin', todaySubjects: [],
    success: req.query.success || null, error: req.query.error || null });
});

\n  const db = getDb(req.tenant);
    const { username, password, role, first_name, last_name, email, class_name, avatar_color } = req.body;
  if (!username || !password || !role || !first_name || !last_name) {
    return res.redirect('/admin/users?error=Vyplnte+vsechna+povinna+pole');
  }
  if (!['admin','teacher','student'].includes(role)) {
    return res.redirect('/admin/users?error=Neplatna+role');
  }
  const existing = db.prepare('SELECT id FROM users WHERE username=?').get(username.trim().toLowerCase());
  if (existing) return res.redirect('/admin/users?error=Uzivatelske+jmeno+jiz+existuje');

  const hash = await bcrypt.hash(password, 12);
  db.prepare(`INSERT INTO users (username, password_hash, role, first_name, last_name, email, class_name, avatar_color) VALUES (?,?,?,?,?,?,?,?)`).run(
    username.trim().toLowerCase(), hash, role,
    first_name.trim(), last_name.trim(),
    email || null, class_name || null, avatar_color || '#7c3aed'
  );
  res.redirect('/admin/users?success=Uzivatel+vytvoren');
});

\n  const db = getDb(req.tenant);
    const { first_name, last_name, email, role, class_name, avatar_color, password } = req.body;
  if (parseInt(req.params.id) === req.user.id && role !== 'admin') {
    return res.redirect('/admin/users?error=Nemuzete+zmenit+svou+vlastni+roli');
  }
  let query = `UPDATE users SET first_name=?, last_name=?, email=?, role=?, class_name=?, avatar_color=?`;
  const params = [first_name, last_name, email || null, role, class_name || null, avatar_color || '#7c3aed'];
  if (password && password.length >= 6) {
    const hash = await bcrypt.hash(password, 12);
    query += `, password_hash=?`;
    params.push(hash);
  }
  query += ` WHERE id=?`;
  params.push(parseInt(req.params.id));
  db.prepare(query).run(...params);
  res.redirect('/admin/users?success=Uzivatel+upraven');
});

\n  const db = getDb(req.tenant);
    if (parseInt(req.params.id) === req.user.id) {
    return res.redirect('/admin/users?error=Nemuzete+smazat+svuj+vlastni+ucet');
  }
  db.prepare('DELETE FROM users WHERE id=?').run(parseInt(req.params.id));
  res.redirect('/admin/users?success=Uzivatel+smazan');
});

// --- SUBJECTS ---
\n  const db = getDb(req.tenant);
    const user = req.user;
  const subjects = db.prepare(`
    SELECT s.*, u.first_name||' '||u.last_name AS teacher_name
    FROM subjects s LEFT JOIN users u ON s.teacher_id=u.id ORDER BY s.name
  `).all();
  const teachers = db.prepare(`SELECT id, first_name||' '||last_name AS full_name FROM users WHERE role='teacher' ORDER BY last_name`).all();
  res.render('admin/subjects', { user, subjects, teachers, page: 'admin', todaySubjects: [],
    success: req.query.success || null, error: req.query.error || null });
});

\n  const db = getDb(req.tenant);
    const { name, short_name, teacher_id, room } = req.body;
  if (!name || !short_name) return res.redirect('/admin/subjects?error=Nazev+je+povinny');
  db.prepare('INSERT INTO subjects (name, short_name, teacher_id, room) VALUES (?,?,?,?)').run(
    name.trim(), short_name.trim().substring(0,5), teacher_id || null, room || null
  );
  res.redirect('/admin/subjects?success=Predmet+vytvoren');
});

\n  const db = getDb(req.tenant);
    const { name, short_name, teacher_id, room } = req.body;
  db.prepare('UPDATE subjects SET name=?, short_name=?, teacher_id=?, room=? WHERE id=?').run(
    name.trim(), short_name.trim().substring(0,5), teacher_id || null, room || null, parseInt(req.params.id)
  );
  res.redirect('/admin/subjects?success=Predmet+upraven');
});

\n  const db = getDb(req.tenant);
    db.prepare('DELETE FROM subjects WHERE id=?').run(parseInt(req.params.id));
  res.redirect('/admin/subjects?success=Predmet+smazan');
});

// --- SCHEDULE ---
\n  const db = getDb(req.tenant);
    const user = req.user;
  const selectedClass = req.query.class || '3A';
  const classes = db.prepare(`SELECT DISTINCT class_name FROM schedule ORDER BY class_name`).all().map(r => r.class_name);
  const allClasses = db.prepare(`SELECT DISTINCT class_name FROM users WHERE class_name IS NOT NULL ORDER BY class_name`).all().map(r => r.class_name);
  const mergedClasses = [...new Set([...classes, ...allClasses])].sort();

  const entries = db.prepare(`
    SELECT sc.*, s.name AS subject_name, s.short_name, s.room,
           u.first_name||' '||u.last_name AS teacher_name
    FROM schedule sc JOIN subjects s ON sc.subject_id=s.id
           LEFT JOIN users u ON s.teacher_id=u.id
    WHERE sc.class_name=?
    ORDER BY sc.day_of_week, sc.period
  `).all(selectedClass);

  const subjects = db.prepare(`SELECT s.*, u.first_name||' '||u.last_name AS teacher_name FROM subjects s LEFT JOIN users u ON s.teacher_id=u.id ORDER BY s.name`).all();

  const DAYS = ['Pondeli', 'Utery', 'Streda', 'Ctvrtek', 'Patek'];
  const PERIOD_TIMES = {1:'7:55-8:40',2:'8:50-9:35',3:'9:45-10:30',4:'10:50-11:35',5:'11:45-12:30',6:'12:50-13:35',7:'13:45-14:30',8:'14:40-15:25'};

  const grid = {};
  for (let d=0; d<5; d++) { grid[d]={}; for (let p=1; p<=8; p++) grid[d][p]=null; }
  entries.forEach(e => { grid[e.day_of_week][e.period] = e; });

  res.render('admin/schedule', { user, grid, entries, subjects, classes: mergedClasses, selectedClass, days: DAYS, periodTimes: PERIOD_TIMES, todaySubjects: [], page: 'admin',
    success: req.query.success || null, error: req.query.error || null });
});

\n  const db = getDb(req.tenant);
    const { subject_id, day_of_week, period, class_name } = req.body;
  if (!subject_id || day_of_week === undefined || !period || !class_name) {
    return res.redirect(`/admin/rozvrh?class=${class_name}&error=Vyplnte+vsechna+pole`);
  }
  // Remove any existing entry at that slot
  db.prepare('DELETE FROM schedule WHERE class_name=? AND day_of_week=? AND period=?').run(class_name, parseInt(day_of_week), parseInt(period));
  db.prepare('INSERT INTO schedule (subject_id, day_of_week, period, class_name) VALUES (?,?,?,?)').run(
    parseInt(subject_id), parseInt(day_of_week), parseInt(period), class_name
  );
  res.redirect(`/admin/rozvrh?class=${class_name}&success=Hodina+pridana`);
});

\n  const db = getDb(req.tenant);
    const entry = db.prepare('SELECT class_name FROM schedule WHERE id=?').get(parseInt(req.params.id));
  db.prepare('DELETE FROM schedule WHERE id=?').run(parseInt(req.params.id));
  res.redirect(`/admin/rozvrh?class=${entry ? entry.class_name : '3A'}&success=Hodina+smazana`);
});

module.exports = router;
