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

// GET /notifikace
\n  const db = getDb(req.tenant);
    const user = req.user;
  const todaySubjects = getTodaySubjects(user);
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  let notifications, total;
  if (user.role === 'student') {
    notifications = db.prepare(`
      SELECT n.*, u.first_name||' '||u.last_name AS teacher_name
      FROM notifications n LEFT JOIN users u ON n.teacher_id=u.id
      WHERE n.target_class IS NULL OR n.target_class=?
      ORDER BY n.created_at DESC LIMIT ? OFFSET ?
    `).all(user.class_name, limit, offset);
    total = db.prepare(`SELECT COUNT(*) AS c FROM notifications WHERE target_class IS NULL OR target_class=?`).get(user.class_name).c;
  } else {
    notifications = db.prepare(`
      SELECT n.*, u.first_name||' '||u.last_name AS teacher_name
      FROM notifications n LEFT JOIN users u ON n.teacher_id=u.id
      ORDER BY n.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    total = db.prepare(`SELECT COUNT(*) AS c FROM notifications`).get().c;
  }

  const classes = db.prepare(`SELECT DISTINCT class_name FROM users WHERE class_name IS NOT NULL ORDER BY class_name`).all();
  const totalPages = Math.ceil(total / limit);

  res.render('notifications', {
    user, todaySubjects, notifications, classes,
    currentPage: page, totalPages,
    page: 'notifikace', success: req.query.success || null, error: req.query.error || null
  });
});

// POST /notifikace (teacher/admin only)
\n  const db = getDb(req.tenant);
    const content = (req.body.content || '').trim();
  const target_class = (req.body.target_class || '').trim() || null;

  if (!content || content.length < 5) {
    return res.redirect('/notifikace?error=Zprava+musi+mit+alespon+5+znaku');
  }
  if (content.length > 2000) {
    return res.redirect('/notifikace?error=Zprava+je+prilis+dlouha+(max+2000+znaku)');
  }

  db.prepare('INSERT INTO notifications (teacher_id, content, target_class) VALUES (?, ?, ?)').run(req.user.id, content, target_class);
  res.redirect('/notifikace?success=Notifikace+byla+odeslana');
});

// POST /notifikace/:id/delete
\n  const db = getDb(req.tenant);
    const notif = db.prepare('SELECT * FROM notifications WHERE id=?').get(req.params.id);
  if (!notif) return res.redirect('/notifikace?error=Notifikace+nenalezena');

  if (req.user.role !== 'admin' && notif.teacher_id !== req.user.id) {
    return res.redirect('/notifikace?error=Nemате+opravneni+smazat+tuto+notifikaci');
  }

  db.prepare('DELETE FROM notifications WHERE id=?').run(req.params.id);
  res.redirect('/notifikace?success=Notifikace+smazana');
});

module.exports = router;
