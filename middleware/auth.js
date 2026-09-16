'use strict';

const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'diplo-default-secret-please-change-in-production-env';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function authenticateToken(req, res, next) {
  const cookieName = `authToken_${req.tenant}`;
  const token = req.cookies && req.cookies[cookieName];
  if (!token) return res.redirect('/login');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb(req.tenant);
    const user = db.prepare(
      'SELECT id, username, role, first_name, last_name, email, class_name, avatar_color FROM users WHERE id = ?'
    ).get(decoded.id);

    if (!user) {
      res.clearCookie(cookieName);
      return res.redirect('/login');
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie(cookieName);
    return res.redirect('/login');
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login');
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        user: req.user,
        error: { status: 403, message: 'Nemате opravneni k pristupu na tuto stranku.' }
      });
    }
    next();
  };
}

module.exports = { generateToken, authenticateToken, requireRole, JWT_SECRET };
