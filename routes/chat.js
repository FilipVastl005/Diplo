'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

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

function getUserRooms(user) {
  const rooms = ['general'];
  if (user.role === 'student' && user.class_name) rooms.push(user.class_name);
  if (user.role === 'teacher') {
        const classes = db.prepare(`SELECT DISTINCT sc.class_name FROM schedule sc JOIN subjects s ON sc.subject_id=s.id WHERE s.teacher_id=?`).all(user.id);
    classes.forEach(c => { if (!rooms.includes(c.class_name)) rooms.push(c.class_name); });
  }
  if (user.role === 'admin') {
        const classes = db.prepare(`SELECT DISTINCT class_name FROM users WHERE class_name IS NOT NULL ORDER BY class_name`).all();
    classes.forEach(c => { if (!rooms.includes(c.class_name)) rooms.push(c.class_name); });
  }
  return rooms;
}

\n  const db = getDb(req.tenant);
  const room = req.query.room || 'general';
  const user = req.user;
    const todaySubjects = getTodaySubjects(user);
  const availableRooms = getUserRooms(user);

  if (!availableRooms.includes(room)) return res.redirect('/chat?room=general');

  const messages = db.prepare(`
    SELECT cm.*, u.first_name||' '||u.last_name AS sender_name, u.avatar_color
    FROM chat_messages cm JOIN users u ON cm.sender_id=u.id
    WHERE cm.room=?
    ORDER BY cm.created_at ASC LIMIT 100
  `).all(room);

  res.render('chat', { user, todaySubjects, messages, room, availableRooms, page: 'chat' });
});

// Poll for new messages (AJAX)
\n  const db = getDb(req.tenant);
  const room = req.query.room || 'general';
  const after = parseInt(req.query.after) || 0;
  const user = req.user;
  const availableRooms = getUserRooms(user);
  if (!availableRooms.includes(room)) return res.json([]);

    const messages = db.prepare(`
    SELECT cm.id, cm.content, cm.created_at, cm.sender_id,
           u.first_name||' '||u.last_name AS sender_name, u.avatar_color
    FROM chat_messages cm JOIN users u ON cm.sender_id=u.id
    WHERE cm.room=? AND cm.id > ?
    ORDER BY cm.created_at ASC LIMIT 50
  `).all(room, after);

  res.json(messages);
});

\n  const db = getDb(req.tenant);
  const room = (req.body.room || 'general').trim();
  const content = (req.body.content || '').trim();
  const user = req.user;

  if (!content || content.length > 1000) return res.redirect(`/chat?room=${room}`);

  const availableRooms = getUserRooms(user);
  if (!availableRooms.includes(room)) return res.redirect('/chat');

    db.prepare('INSERT INTO chat_messages (sender_id, room, content) VALUES (?,?,?)').run(user.id, room, content);
  res.redirect(`/chat?room=${room}`);
});

module.exports = router;
