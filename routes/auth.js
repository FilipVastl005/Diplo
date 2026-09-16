'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { generateToken } = require('../middleware/auth');

router.get('/login', (req, res) => {
  const db = getDb(req.tenant);
  const cookieName = `authToken_${req.tenant}`;
  if (req.cookies && req.cookies[cookieName]) return res.redirect('/');
  res.render('login', { error: null, username: '' });
});

router.post('/login', async (req, res) => {
  const db = getDb(req.tenant);
  const cookieName = `authToken_${req.tenant}`;
  const username = (req.body.username || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!username || !password) {
    return res.render('login', { error: 'Zadejte uzivatelske jmeno a heslo.', username });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.render('login', { error: 'Nespravne uzivatelske jmeno nebo heslo.', username });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.render('login', { error: 'Nespravne uzivatelske jmeno nebo heslo.', username });
  }

  const token = generateToken(user);
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  });

  res.redirect('/');
});

router.post('/logout', (req, res) => {
  const cookieName = `authToken_${req.tenant}`;
  res.clearCookie(cookieName);
  res.redirect('/login');
});

module.exports = router;
