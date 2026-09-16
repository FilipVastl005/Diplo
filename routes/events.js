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
  return [];
}

\n  const db = getDb(req.tenant);
    const user = req.user;
  const todaySubjects = getTodaySubjects(user);

  const events = db.prepare(`
    SELECT e.*, u.first_name||' '||u.last_name AS creator_name
    FROM events e LEFT JOIN users u ON e.created_by=u.id
    WHERE e.event_date >= date('now')
    ORDER BY e.event_date ASC
  `).all();

  const pastEvents = db.prepare(`
    SELECT e.*, u.first_name||' '||u.last_name AS creator_name
    FROM events e LEFT JOIN users u ON e.created_by=u.id
    WHERE e.event_date < date('now')
    ORDER BY e.event_date DESC LIMIT 5
  `).all();

  res.render('events', {
    user, todaySubjects, events, pastEvents,
    page: 'udalosti', success: req.query.success || null, error: req.query.error || null
  });
});

\n  const db = getDb(req.tenant);
    const title       = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();
  const event_date  = req.body.event_date || '';
  const event_time  = req.body.event_time || '';
  const location    = (req.body.location || '').trim();

  if (!title || !event_date) {
    return res.redirect('/udalosti?error=Nazev+a+datum+jsou+povinne');
  }

  db.prepare(`INSERT INTO events (title, description, event_date, event_time, location, created_by) VALUES (?,?,?,?,?,?)`).run(title, description, event_date, event_time, location, req.user.id);
  res.redirect('/udalosti?success=Udalost+pridana');
});

\n  const db = getDb(req.tenant);
    const ev = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!ev) return res.redirect('/udalosti?error=Udalost+nenalezena');
  if (req.user.role !== 'admin' && ev.created_by !== req.user.id) {
    return res.redirect('/udalosti?error=Nemате+opravneni+smazat+tuto+udalost');
  }
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.redirect('/udalosti?success=Udalost+smazana');
});

module.exports = router;
